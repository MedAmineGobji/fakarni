from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "kind", "title", "pushed", "created_at", "read_at")
    list_filter = ("kind", "pushed")
    search_fields = ("user__email", "title")
