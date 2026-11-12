"""Logique métier des prises : génération des événements et mise à jour des statuts."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone

from .models import IntakeEvent, Medication, Schedule

# Une prise non confirmée 2 h après l'heure prévue est considérée comme manquée.
MISSED_AFTER = timedelta(hours=2)


def user_tz(user):
    try:
        return ZoneInfo(user.timezone)
    except Exception:
        return ZoneInfo("UTC")


def local_today(user):
    return timezone.now().astimezone(user_tz(user)).date()


def ensure_events(user, day):
    """Crée (si besoin) les prises prévues pour `day` (date locale du patient)."""
    tz = user_tz(user)
    schedules = Schedule.objects.filter(medication__patient=user, medication__is_archived=False).select_related("medication")
    for schedule in schedules:
        if not (schedule.medication.is_active_on(day) and schedule.applies_on(day)):
            continue
        scheduled_at = datetime.combine(day, schedule.time, tzinfo=tz)
        IntakeEvent.objects.get_or_create(schedule=schedule, scheduled_at=scheduled_at)


def mark_overdue_as_missed(user):
    """Passe en MISSED les prises en attente dont le délai est dépassé."""
    limit = timezone.now() - MISSED_AFTER
    IntakeEvent.objects.filter(
        schedule__medication__patient=user,
        status__in=[IntakeEvent.Status.PENDING, IntakeEvent.Status.SNOOZED],
        scheduled_at__lt=limit,
    ).exclude(snoozed_until__gt=timezone.now()).update(status=IntakeEvent.Status.MISSED)


def day_bounds(user, day):
    tz = user_tz(user)
    start = datetime.combine(day, datetime.min.time(), tzinfo=tz)
    return start, start + timedelta(days=1)


def respond(event, status, snooze_minutes=None):
    now = timezone.now()
    event.status = status
    event.responded_at = now
    event.response_delay_min = max(0, int((now - event.scheduled_at).total_seconds() // 60))
    event.snoozed_until = now + timedelta(minutes=snooze_minutes) if status == IntakeEvent.Status.SNOOZED else None
    if status == IntakeEvent.Status.SNOOZED:
        # Un nouveau rappel (puis une relance) sera envoyé à la fin du report.
        event.reminded_at = None
        event.followed_up_at = None
    event.save()
    return event


def adherence(user, days=30):
    """Statistiques d'observance sur les `days` derniers jours (prises passées uniquement)."""
    mark_overdue_as_missed(user)
    since = timezone.now() - timedelta(days=days)
    qs = IntakeEvent.objects.filter(
        schedule__medication__patient=user, scheduled_at__gte=since, scheduled_at__lte=timezone.now()
    )
    taken = qs.filter(status=IntakeEvent.Status.TAKEN).count()
    missed = qs.filter(status=IntakeEvent.Status.MISSED).count()
    done = taken + missed
    return {
        "days": days,
        "taken": taken,
        "missed": missed,
        "rate": round(100 * taken / done) if done else None,
        "active_reminders": Schedule.objects.filter(
            medication__patient=user, medication__is_archived=False
        ).count(),
        "active_medications": Medication.objects.filter(patient=user, is_archived=False).count(),
    }
