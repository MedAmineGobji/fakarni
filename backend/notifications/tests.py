from datetime import datetime, timedelta
from unittest.mock import patch

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from treatments.models import IntakeEvent, Medication, Schedule

from .models import Notification
from .tasks import mark_missed_intakes, send_due_reminders


class ReminderTasksTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("p@ex.com", "Fakarni#2026", timezone="UTC", first_name="Amine")
        self.med = Medication.objects.create(patient=self.user, name="Aspirine", dosage="100 mg",
                                             start_date=timezone.now().date() - timedelta(days=5))
        now = timezone.now()
        # Horaire 10 minutes avant « maintenant » : la prise du jour est due.
        self.schedule = Schedule.objects.create(medication=self.med, time=(now - timedelta(minutes=10)).time())

    def event(self):
        return IntakeEvent.objects.get(schedule=self.schedule, scheduled_at__date=timezone.now().date())

    def test_reminder_sent_once(self):
        send_due_reminders()
        send_due_reminders()
        self.assertEqual(Notification.objects.filter(kind="REMINDER").count(), 1)
        self.assertIsNotNone(self.event().reminded_at)

    def test_follow_up_after_15_minutes(self):
        send_due_reminders()
        e = self.event()
        e.reminded_at = timezone.now() - timedelta(minutes=16)
        e.save()
        send_due_reminders()
        self.assertEqual(Notification.objects.filter(kind="FOLLOW_UP").count(), 1)
        send_due_reminders()
        self.assertEqual(Notification.objects.filter(kind="FOLLOW_UP").count(), 1)

    def test_no_follow_up_when_taken(self):
        send_due_reminders()
        e = self.event()
        e.status = IntakeEvent.Status.TAKEN
        e.reminded_at = timezone.now() - timedelta(minutes=30)
        e.save()
        send_due_reminders()
        self.assertFalse(Notification.objects.filter(kind="FOLLOW_UP").exists())

    def test_snooze_triggers_new_reminder(self):
        send_due_reminders()
        self.client.force_authenticate(self.user)
        self.client.post(f"/api/intakes/{self.event().id}/snooze/", {"minutes": 15})
        send_due_reminders()  # report pas encore écoulé
        self.assertEqual(Notification.objects.filter(kind="REMINDER").count(), 1)
        e = self.event()
        e.snoozed_until = timezone.now() - timedelta(seconds=1)
        e.save()
        send_due_reminders()
        self.assertEqual(Notification.objects.filter(kind="REMINDER").count(), 2)

    def test_notifications_disabled(self):
        self.user.notifications_enabled = False
        self.user.save()
        send_due_reminders()
        self.assertFalse(Notification.objects.exists())

    def test_future_intake_not_reminded(self):
        self.schedule.time = (timezone.now() + timedelta(hours=1)).time()
        self.schedule.save()
        if self.schedule.time < (timezone.now()).time():  # passage de minuit : test non pertinent
            return
        send_due_reminders()
        self.assertFalse(Notification.objects.exists())

    def test_mark_missed(self):
        e = IntakeEvent.objects.create(schedule=self.schedule,
                                       scheduled_at=timezone.now() - timedelta(hours=3))
        self.assertEqual(mark_missed_intakes(), 1)
        e.refresh_from_db()
        self.assertEqual(e.status, "MISSED")
        self.assertTrue(Notification.objects.filter(kind="MISSED").exists())

    @patch("notifications.push._get_firebase", return_value=object())
    @patch("firebase_admin.messaging.send", return_value="ok")
    def test_push_when_firebase_configured(self, send, _fb):
        self.user.fcm_token = "token-telephone"
        self.user.save()
        send_due_reminders()
        self.assertTrue(send.called)
        self.assertTrue(Notification.objects.get(kind="REMINDER").pushed)


class NotificationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("p@ex.com", "Fakarni#2026")
        self.client.force_authenticate(self.user)
        for i in range(3):
            Notification.objects.create(user=self.user, title=f"N{i}", body="…")
        Notification.objects.create(user=User.objects.create_user("o@ex.com", "Fakarni#2026"), title="Autre", body="…")

    def test_list_and_read(self):
        r = self.client.get("/api/notifications/")
        self.assertEqual(r.data["unread"], 3)
        self.assertEqual(len(r.data["results"]), 3)
        self.client.post(f"/api/notifications/{r.data['results'][0]['id']}/read/")
        self.assertEqual(self.client.get("/api/notifications/").data["unread"], 2)
        self.client.post("/api/notifications/read-all/")
        self.assertEqual(self.client.get("/api/notifications/").data["unread"], 0)

    def test_register_device(self):
        r = self.client.post("/api/notifications/register-device/", {"token": "abc"})
        self.assertTrue(r.data["registered"])
        self.user.refresh_from_db()
        self.assertEqual(self.user.fcm_token, "abc")
