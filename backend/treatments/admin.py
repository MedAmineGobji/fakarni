from django.contrib import admin

from .models import IntakeEvent, Medication, Schedule


class ScheduleInline(admin.TabularInline):
    model = Schedule
    extra = 0


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ("name", "dosage", "patient", "start_date", "end_date", "is_archived", "source")
    list_filter = ("is_archived", "source", "form")
    search_fields = ("name", "patient__email")
    inlines = [ScheduleInline]


@admin.register(IntakeEvent)
class IntakeEventAdmin(admin.ModelAdmin):
    list_display = ("schedule", "scheduled_at", "status", "responded_at")
    list_filter = ("status",)
    date_hierarchy = "scheduled_at"
