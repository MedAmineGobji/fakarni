from datetime import date, timedelta

from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import IsPatient

from . import services
from .models import IntakeEvent, Medication
from .serializers import IntakeEventSerializer, MedicationSerializer


def parse_date(value, name):
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValidationError({name: "Format attendu : AAAA-MM-JJ."})


class MedicationViewSet(viewsets.ModelViewSet):
    """
    /api/medications/            GET (liste), POST (ajout) — US04, US05
    /api/medications/{id}/       GET, PATCH, PUT, DELETE (= archivage)
    ?archived=true               liste des médicaments archivés
    """
    serializer_class = MedicationSerializer
    permission_classes = [IsPatient]

    def get_queryset(self):
        qs = Medication.objects.filter(patient=self.request.user).prefetch_related("schedules")
        if self.action == "list":
            # Les médicaments archivés restent accessibles par leur id, mais pas dans la liste par défaut.
            qs = qs.filter(is_archived=self.request.query_params.get("archived") == "true")
        return qs

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

    def perform_destroy(self, instance):
        # On n'efface jamais l'historique : suppression = archivage.
        instance.is_archived = True
        instance.save(update_fields=["is_archived"])
        IntakeEvent.objects.filter(schedule__medication=instance, scheduled_at__gt=timezone.now(),
                                   status=IntakeEvent.Status.PENDING).delete()


class IntakeViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    /api/intakes/?date=AAAA-MM-JJ          prises d'un jour (US06/US07)
    /api/intakes/?from=…&to=…              historique sur une période (US08)
    /api/intakes/{id}/take|snooze|skip/    confirmer / reporter / signaler une prise non effectuée
    /api/intakes/stats/?days=30            observance
    """
    serializer_class = IntakeEventSerializer
    permission_classes = [IsPatient]
    pagination_class = None

    def get_queryset(self):
        return IntakeEvent.objects.filter(schedule__medication__patient=self.request.user) \
            .select_related("schedule__medication")

    def list(self, request, *args, **kwargs):
        user = request.user
        params = request.query_params
        if "from" in params or "to" in params:
            today = services.local_today(user)
            start_day = parse_date(params.get("from", (today - timedelta(days=6)).isoformat()), "from")
            end_day = parse_date(params.get("to", today.isoformat()), "to")
            if end_day < start_day:
                raise ValidationError({"to": "La date de fin doit être après la date de début."})
            if (end_day - start_day).days > 92:
                raise ValidationError({"from": "Période maximale : 3 mois."})
            day = start_day
            while day <= min(end_day, today):
                services.ensure_events(user, day)
                day += timedelta(days=1)
            start, _ = services.day_bounds(user, start_day)
            _, end = services.day_bounds(user, end_day)
        else:
            day = parse_date(params.get("date", services.local_today(user).isoformat()), "date")
            services.ensure_events(user, day)
            start, end = services.day_bounds(user, day)

        services.mark_overdue_as_missed(user)
        qs = self.get_queryset().filter(scheduled_at__gte=start, scheduled_at__lt=end)
        return Response(self.get_serializer(qs, many=True).data)

    def _respond(self, new_status, **kwargs):
        event = self.get_object()
        if event.scheduled_at > timezone.now() + timedelta(hours=12):
            raise ValidationError("Cette prise est prévue plus tard : impossible de la traiter maintenant.")
        services.respond(event, new_status, **kwargs)
        return Response(self.get_serializer(event).data)

    @action(detail=True, methods=["post"])
    def take(self, request, pk=None):
        return self._respond(IntakeEvent.Status.TAKEN)

    @action(detail=True, methods=["post"])
    def snooze(self, request, pk=None):
        try:
            minutes = int(request.data.get("minutes", 15))
        except (TypeError, ValueError):
            minutes = 15
        return self._respond(IntakeEvent.Status.SNOOZED, snooze_minutes=max(5, min(minutes, 120)))

    @action(detail=True, methods=["post"])
    def skip(self, request, pk=None):
        return self._respond(IntakeEvent.Status.MISSED)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        try:
            days = max(1, min(int(request.query_params.get("days", 30)), 365))
        except ValueError:
            days = 30
        return Response(services.adherence(request.user, days), status=status.HTTP_200_OK)
