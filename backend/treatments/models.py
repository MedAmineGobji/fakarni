from django.conf import settings
from django.db import models


class Medication(models.Model):
    """Un médicament suivi par un patient (US04)."""

    class Form(models.TextChoices):
        TABLET = "TABLET", "Comprimé"
        CAPSULE = "CAPSULE", "Gélule"
        SYRUP = "SYRUP", "Sirop"
        INJECTION = "INJECTION", "Injection"
        DROPS = "DROPS", "Gouttes"
        OTHER = "OTHER", "Autre"

    class Meal(models.TextChoices):
        ANY = "ANY", "Indifférent"
        BEFORE = "BEFORE", "Avant le repas"
        WITH = "WITH", "Pendant le repas"
        AFTER = "AFTER", "Après le repas"

    class Source(models.TextChoices):
        MANUAL = "MANUAL", "Saisie manuelle"
        OCR = "OCR", "Scan d'ordonnance"

    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="medications")
    name = models.CharField(max_length=120)
    dosage = models.CharField(max_length=60, blank=True, help_text="Ex. : 500 mg")
    form = models.CharField(max_length=10, choices=Form.choices, default=Form.TABLET)
    meal_relation = models.CharField(max_length=6, choices=Meal.choices, default=Meal.ANY)
    instructions = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    source = models.CharField(max_length=6, choices=Source.choices, default=Source.MANUAL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} {self.dosage}".strip()

    def is_active_on(self, day):
        return (not self.is_archived and self.start_date <= day
                and (self.end_date is None or day <= self.end_date))


class Schedule(models.Model):
    """Un horaire de prise : heure locale + jours de la semaine (US05)."""

    ALL_DAYS = "0123456"  # 0 = lundi … 6 = dimanche

    medication = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name="schedules")
    time = models.TimeField(help_text="Heure locale du patient")
    days = models.CharField(max_length=7, default=ALL_DAYS)
    quantity = models.CharField(max_length=40, default="1", help_text="Ex. : 1 comprimé, 5 ml")

    class Meta:
        ordering = ["time"]

    def __str__(self):
        return f"{self.medication} à {self.time:%H:%M}"

    def applies_on(self, day):
        return str(day.weekday()) in self.days


class IntakeEvent(models.Model):
    """Une prise planifiée et son statut (US06, US07, US08)."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "À venir"
        TAKEN = "TAKEN", "Prise"
        SNOOZED = "SNOOZED", "Reportée"
        MISSED = "MISSED", "Manquée"

    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name="events")
    scheduled_at = models.DateTimeField(help_text="Date et heure prévues (UTC)")
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.PENDING)
    responded_at = models.DateTimeField(null=True, blank=True)
    snoozed_until = models.DateTimeField(null=True, blank=True)
    response_delay_min = models.PositiveIntegerField(null=True, blank=True)  # variable utile pour le ML (Sprint 3)
    reminded_at = models.DateTimeField(null=True, blank=True, help_text="Rappel envoyé (Celery)")
    followed_up_at = models.DateTimeField(null=True, blank=True, help_text="Relance envoyée (Celery)")

    class Meta:
        ordering = ["scheduled_at"]
        constraints = [models.UniqueConstraint(fields=["schedule", "scheduled_at"], name="unique_event_per_slot")]
        indexes = [models.Index(fields=["status", "scheduled_at"])]

    def __str__(self):
        return f"{self.schedule.medication} — {self.scheduled_at:%Y-%m-%d %H:%M} ({self.status})"
