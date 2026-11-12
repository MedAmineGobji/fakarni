from django.conf import settings
from django.db import models


class Notification(models.Model):
    """Notification envoyée à un utilisateur (affichée dans l'app et, si possible, en push)."""

    class Kind(models.TextChoices):
        REMINDER = "REMINDER", "Rappel de prise"
        FOLLOW_UP = "FOLLOW_UP", "Relance"
        MISSED = "MISSED", "Prise manquée"
        INFO = "INFO", "Information"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.INFO)
    title = models.CharField(max_length=120)
    body = models.CharField(max_length=255)
    intake = models.ForeignKey("treatments.IntakeEvent", on_delete=models.SET_NULL, null=True, blank=True,
                               related_name="notifications")
    pushed = models.BooleanField(default=False, help_text="Envoyée sur le téléphone via Firebase")
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "read_at"])]

    def __str__(self):
        return f"{self.user} — {self.title}"
