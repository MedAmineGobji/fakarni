from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.views import MeView, RegisterView, UserAdminViewSet
from notifications.views import NotificationViewSet
from treatments.views import IntakeViewSet, MedicationViewSet

router = DefaultRouter()
router.register("admin/users", UserAdminViewSet, basename="admin-users")
router.register("medications", MedicationViewSet, basename="medications")
router.register("intakes", IntakeViewSet, basename="intakes")
router.register("notifications", NotificationViewSet, basename="notifications")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/auth/me/", MeView.as_view(), name="me"),
    path("api/", include(router.urls)),
]
