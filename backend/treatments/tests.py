from datetime import timedelta
from unittest.mock import patch

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User

from .models import IntakeEvent, Medication

PASSWORD = "Fakarni#2026"


class TreatmentsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("p@ex.com", PASSWORD, timezone="Africa/Tunis")
        self.client.force_authenticate(self.user)
        self.today = timezone.now().astimezone(timezone.get_default_timezone()).date()

    def create_med(self, **extra):
        payload = {
            "name": "Paracétamol", "dosage": "500 mg", "form": "TABLET", "meal_relation": "AFTER",
            "start_date": (self.today - timedelta(days=10)).isoformat(),
            "schedules": [{"time": "08:00", "days": "0123456", "quantity": "1 comprimé"},
                          {"time": "20:00", "days": "0123456", "quantity": "1 comprimé"}],
        }
        payload.update(extra)
        return self.client.post("/api/medications/", payload, format="json")

    # --- US04 / US05 -------------------------------------------------------
    def test_create_and_list_medication(self):
        r = self.create_med()
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(len(r.data["schedules"]), 2)
        self.assertEqual(len(self.client.get("/api/medications/").data), 1)

    def test_schedule_required_and_dates_validated(self):
        self.assertEqual(self.create_med(schedules=[]).status_code, 400)
        r = self.create_med(end_date=(self.today - timedelta(days=20)).isoformat())
        self.assertEqual(r.status_code, 400)
        self.assertIn("end_date", r.data)

    def test_invalid_days(self):
        r = self.create_med(schedules=[{"time": "08:00", "days": "79", "quantity": "1"}])
        self.assertEqual(r.status_code, 400)

    def test_delete_archives(self):
        med_id = self.create_med().data["id"]
        self.assertEqual(self.client.delete(f"/api/medications/{med_id}/").status_code, 204)
        self.assertTrue(Medication.objects.get(pk=med_id).is_archived)
        self.assertEqual(len(self.client.get("/api/medications/").data), 0)
        self.assertEqual(len(self.client.get("/api/medications/?archived=true").data), 1)

    def test_update_schedules(self):
        med_id = self.create_med().data["id"]
        r = self.client.patch(f"/api/medications/{med_id}/",
                              {"schedules": [{"time": "09:00", "days": "024", "quantity": "2"}]}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual([s["time"] for s in r.data["schedules"]], ["09:00:00"])

    def test_isolation_between_patients(self):
        med_id = self.create_med().data["id"]
        other = User.objects.create_user("o@ex.com", PASSWORD)
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get(f"/api/medications/{med_id}/").status_code, 404)
        self.assertEqual(len(self.client.get("/api/medications/").data), 0)

    def test_caregiver_cannot_use_patient_endpoints(self):
        aidant = User.objects.create_user("a@ex.com", PASSWORD, role=User.Role.CAREGIVER)
        self.client.force_authenticate(aidant)
        self.assertEqual(self.client.get("/api/medications/").status_code, 403)

    # --- US06 / US07 / US08 ------------------------------------------------
    def test_daily_intakes_are_generated(self):
        self.create_med()
        r = self.client.get(f"/api/intakes/?date={self.today.isoformat()}")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data), 2)
        # Appel répété : pas de doublon
        self.assertEqual(len(self.client.get(f"/api/intakes/?date={self.today.isoformat()}").data), 2)

    def test_take_snooze_skip(self):
        self.create_med()
        day = (self.today - timedelta(days=1)).isoformat()
        events = self.client.get(f"/api/intakes/?date={day}").data
        e1, e2 = events[0]["id"], events[1]["id"]
        r = self.client.post(f"/api/intakes/{e1}/take/")
        self.assertEqual(r.data["status"], "TAKEN")
        self.assertIsNotNone(IntakeEvent.objects.get(pk=e1).response_delay_min)
        r = self.client.post(f"/api/intakes/{e2}/skip/")
        self.assertEqual(r.data["status"], "MISSED")

    def test_cannot_confirm_far_future_intake(self):
        self.create_med()
        day = (self.today + timedelta(days=3)).isoformat()
        event_id = self.client.get(f"/api/intakes/?date={day}").data[0]["id"]
        self.assertEqual(self.client.post(f"/api/intakes/{event_id}/take/").status_code, 400)

    def test_overdue_becomes_missed_and_history_and_stats(self):
        self.create_med()
        frm = (self.today - timedelta(days=3)).isoformat()
        to = (self.today - timedelta(days=1)).isoformat()
        history = self.client.get(f"/api/intakes/?from={frm}&to={to}").data
        self.assertEqual(len(history), 6)
        self.assertTrue(all(e["status"] == "MISSED" for e in history))
        self.client.post(f"/api/intakes/{history[0]['id']}/take/")
        stats = self.client.get("/api/intakes/stats/?days=30").data
        self.assertEqual(stats["taken"], 1)
        self.assertEqual(stats["active_reminders"], 2)
        self.assertIsNotNone(stats["rate"])

    def test_bad_date_param(self):
        self.assertEqual(self.client.get("/api/intakes/?date=hier").status_code, 400)

    def test_snoozed_event_not_marked_missed_while_snoozed(self):
        self.create_med()
        events = self.client.get(f"/api/intakes/?date={self.today.isoformat()}").data
        event = IntakeEvent.objects.get(pk=events[0]["id"])
        event.scheduled_at = timezone.now() - timedelta(hours=3)
        event.save()
        self.client.post(f"/api/intakes/{event.id}/snooze/", {"minutes": 30})
        with patch("django.utils.timezone.now", return_value=timezone.now()):
            self.client.get(f"/api/intakes/?date={self.today.isoformat()}")
        event.refresh_from_db()
        self.assertEqual(event.status, "SNOOZED")
