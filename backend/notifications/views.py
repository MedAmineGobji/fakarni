from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """
    GET  /api/notifications/                 30 dernières notifications + nombre de non lues
    POST /api/notifications/{id}/read/       marquer comme lue
    POST /api/notifications/read-all/        tout marquer comme lu
    POST /api/notifications/register-device/ {"token": "..."} jeton Firebase du téléphone
    """
    serializer_class = NotificationSerializer
    pagination_class = None

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        return Response({
            "unread": qs.filter(read_at__isnull=True).count(),
            "results": self.get_serializer(qs[:30], many=True).data,
        })

    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        notification = self.get_object()
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        updated = self.get_queryset().filter(read_at__isnull=True).update(read_at=timezone.now())
        return Response({"updated": updated})

    @action(detail=False, methods=["post"], url_path="register-device")
    def register_device(self, request):
        token = str(request.data.get("token", "")).strip()
        request.user.fcm_token = token[:255]
        request.user.save(update_fields=["fcm_token"])
        return Response({"registered": bool(token)})
