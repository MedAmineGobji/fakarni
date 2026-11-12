from rest_framework import generics, permissions, viewsets

from .models import User
from .permissions import IsAdminRole
from .serializers import ProfileSerializer, RegisterSerializer


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — US01"""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/me/ — US03"""
    serializer_class = ProfileSerializer

    def get_object(self):
        return self.request.user


class UserAdminViewSet(viewsets.ModelViewSet):
    """/api/admin/users/ — US17 (administrateur uniquement)"""
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = ProfileSerializer
    permission_classes = [IsAdminRole]
