from django.db import transaction
from rest_framework import serializers

from .models import IntakeEvent, Medication, Schedule


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = ("id", "time", "days", "quantity")
        read_only_fields = ("id",)

    def validate_days(self, value):
        if not value or any(c not in Schedule.ALL_DAYS for c in value) or len(set(value)) != len(value):
            raise serializers.ValidationError("Jours invalides : utilisez des chiffres de 0 (lundi) à 6 (dimanche).")
        return "".join(sorted(value))


class MedicationSerializer(serializers.ModelSerializer):
    schedules = ScheduleSerializer(many=True)
    form_label = serializers.CharField(source="get_form_display", read_only=True)
    meal_label = serializers.CharField(source="get_meal_relation_display", read_only=True)

    class Meta:
        model = Medication
        fields = ("id", "name", "dosage", "form", "form_label", "meal_relation", "meal_label",
                  "instructions", "start_date", "end_date", "is_archived", "source",
                  "schedules", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_schedules(self, value):
        if not value:
            raise serializers.ValidationError("Ajoutez au moins un horaire de prise.")
        return value

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "La date de fin doit être après la date de début."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        schedules = validated_data.pop("schedules")
        medication = Medication.objects.create(**validated_data)
        for s in schedules:
            Schedule.objects.create(medication=medication, **s)
        return medication

    @transaction.atomic
    def update(self, instance, validated_data):
        schedules = validated_data.pop("schedules", None)
        instance = super().update(instance, validated_data)
        if schedules is not None:
            # On remplace les horaires ; les prises futures non traitées des anciens horaires sont supprimées.
            from django.utils import timezone
            old = instance.schedules.all()
            IntakeEvent.objects.filter(schedule__in=old, scheduled_at__gt=timezone.now(),
                                       status=IntakeEvent.Status.PENDING).delete()
            kept = {(s.time, s.days, s.quantity): s for s in old}
            new_keys = set()
            for s in schedules:
                key = (s["time"], s["days"], s["quantity"])
                new_keys.add(key)
                if key not in kept:
                    Schedule.objects.create(medication=instance, **s)
            for key, sched in kept.items():
                if key not in new_keys:
                    if sched.events.exists():
                        sched.days = ""  # conservé pour l'historique, mais plus jamais planifié
                        sched.save(update_fields=["days"])
                    else:
                        sched.delete()
        return instance


class IntakeEventSerializer(serializers.ModelSerializer):
    medication = serializers.SerializerMethodField()
    quantity = serializers.CharField(source="schedule.quantity", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = IntakeEvent
        fields = ("id", "scheduled_at", "status", "status_label", "responded_at", "snoozed_until",
                  "quantity", "medication")

    def get_medication(self, obj):
        m = obj.schedule.medication
        return {"id": m.id, "name": m.name, "dosage": m.dosage, "form": m.form,
                "meal_relation": m.meal_relation, "meal_label": m.get_meal_relation_display()}
