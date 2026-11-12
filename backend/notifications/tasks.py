"""
Tâches périodiques lancées par Celery Beat (voir CELERY_BEAT_SCHEDULE dans settings.py).

send_due_reminders  (toutes les minutes)
  1. génère les prises du jour pour chaque patient actif ;
  2. envoie le rappel à l'heure prévue (ou à la fin d'un report) ;
  3. envoie une relance 15 min plus tard si la prise n'est toujours pas confirmée.

mark_missed_intakes (toutes les 5 minutes)
  passe en « Manquée » les prises non confirmées après 2 h et prévient le patient.
"""
from datetime import timedelta

from celery import shared_task
from django.db.models import Q
from django.utils import timezone

from accounts.models import User
from treatments import services
from treatments.models import IntakeEvent

from .models import Notification
from .push import notify

FOLLOW_UP_AFTER = timedelta(minutes=15)


def _label(event):
    m = event.schedule.medication
    name = f"{m.name} {m.dosage}".strip()
    extra = f" — {m.get_meal_relation_display().lower()}" if m.meal_relation != m.Meal.ANY else ""
    return name, f"{event.schedule.quantity}{extra}"


def _active_patients():
    return User.objects.filter(
        role=User.Role.PATIENT, is_active=True, medications__is_archived=False
    ).distinct()


@shared_task
def send_due_reminders():
    now = timezone.now()
    for patient in _active_patients():
        services.ensure_events(patient, services.local_today(patient))

    base = IntakeEvent.objects.select_related("schedule__medication__patient").filter(
        schedule__medication__is_archived=False,
        schedule__medication__patient__notifications_enabled=True,
        scheduled_at__gt=now - services.MISSED_AFTER,
    )

    # 1) Rappel à l'heure prévue, ou à la fin d'un report.
    due = base.filter(reminded_at__isnull=True).filter(
        Q(status=IntakeEvent.Status.PENDING, scheduled_at__lte=now)
        | Q(status=IntakeEvent.Status.SNOOZED, snoozed_until__lte=now)
    )
    sent = 0
    for event in due:
        name, detail = _label(event)
        notify(event.schedule.medication.patient, f"C’est l’heure de prendre {name}", detail,
               kind=Notification.Kind.REMINDER, intake=event)
        event.reminded_at = now
        event.save(update_fields=["reminded_at"])
        sent += 1

    # 2) Relance unique si toujours pas de réponse.
    follow = base.filter(
        status__in=[IntakeEvent.Status.PENDING, IntakeEvent.Status.SNOOZED],
        reminded_at__lte=now - FOLLOW_UP_AFTER,
        followed_up_at__isnull=True,
    )
    for event in follow:
        name, detail = _label(event)
        notify(event.schedule.medication.patient, f"Avez-vous pris {name} ?",
               "Pensez à confirmer votre prise dans Fakarni.", kind=Notification.Kind.FOLLOW_UP, intake=event)
        event.followed_up_at = now
        event.save(update_fields=["followed_up_at"])
        sent += 1
    return sent


@shared_task
def mark_missed_intakes():
    limit = timezone.now() - services.MISSED_AFTER
    overdue = IntakeEvent.objects.select_related("schedule__medication__patient").filter(
        status__in=[IntakeEvent.Status.PENDING, IntakeEvent.Status.SNOOZED],
        scheduled_at__lt=limit,
    ).exclude(snoozed_until__gt=timezone.now())
    count = 0
    for event in overdue:
        event.status = IntakeEvent.Status.MISSED
        event.save(update_fields=["status"])
        patient = event.schedule.medication.patient
        if patient.notifications_enabled:
            name, _ = _label(event)
            notify(patient, f"Prise non confirmée : {name}",
                   "Si vous l’avez prise, vous pouvez la confirmer dans l’historique.",
                   kind=Notification.Kind.MISSED, intake=event)
        count += 1
    return count
