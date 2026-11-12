from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Gestionnaire d'utilisateurs : l'email remplace le nom d'utilisateur."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("L'email est obligatoire.")
        user = self.model(email=self.normalize_email(email), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.update(is_staff=True, is_superuser=True, role=User.Role.ADMIN)
        return self._create_user(email, password, **extra)


class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = "PATIENT", "Patient"
        CAREGIVER = "CAREGIVER", "Aidant familial"
        PRO = "PRO", "Professionnel de santé"
        ADMIN = "ADMIN", "Administrateur"

    username = None
    email = models.EmailField("email", unique=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.PATIENT)
    timezone = models.CharField(max_length=64, default="Africa/Tunis")
    phone = models.CharField(max_length=20, blank=True)
    notifications_enabled = models.BooleanField(default=True)
    fcm_token = models.CharField(max_length=255, blank=True)  # jeton Firebase (Sprint 2)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
