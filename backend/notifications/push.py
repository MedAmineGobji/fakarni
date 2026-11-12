"""
Envoi des notifications.

- Toujours : enregistrement en base (affiché dans l'application web/mobile).
- En plus, si Firebase est configuré (FCM_CREDENTIALS_FILE) et que l'utilisateur
  a enregistré un appareil : notification push sur son téléphone.
"""
import logging
import os

from django.conf import settings

from .models import Notification

logger = logging.getLogger(__name__)
_firebase_app = None


def _get_firebase():
    """Initialise Firebase une seule fois ; renvoie None s'il n'est pas configuré."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
    path = getattr(settings, "FCM_CREDENTIALS_FILE", "")
    if not path or not os.path.exists(path):
        return None
    import firebase_admin
    from firebase_admin import credentials

    _firebase_app = firebase_admin.initialize_app(credentials.Certificate(path))
    logger.info("Firebase initialisé.")
    return _firebase_app


def _push(user, title, body, data):
    if not user.fcm_token or _get_firebase() is None:
        return False
    from firebase_admin import messaging

    message = messaging.Message(
        token=user.fcm_token,
        notification=messaging.Notification(title=title, body=body),
        data={k: str(v) for k, v in data.items()},
        android=messaging.AndroidConfig(priority="high"),
    )
    try:
        messaging.send(message)
        return True
    except messaging.UnregisteredError:
        # Jeton expiré (application désinstallée…) : on l'oublie.
        user.fcm_token = ""
        user.save(update_fields=["fcm_token"])
    except Exception:  # réseau, quota… : la notification reste visible dans l'app
        logger.exception("Échec de l'envoi push à %s", user.email)
    return False


def notify(user, title, body, kind=Notification.Kind.INFO, intake=None):
    notification = Notification.objects.create(user=user, title=title, body=body, kind=kind, intake=intake)
    data = {"kind": kind, "notification_id": notification.id}
    if intake is not None:
        data["intake_id"] = intake.id
    if _push(user, title, body, data):
        notification.pushed = True
        notification.save(update_fields=["pushed"])
    logger.info("[%s] %s → %s : %s", kind, user.email, title, body)
    return notification
