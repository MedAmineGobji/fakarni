from rest_framework.permissions import BasePermission

from .models import User


class HasRole(BasePermission):
    """Usage : permission_classes = [HasRole.of(User.Role.PATIENT)]"""

    allowed_roles: tuple = ()

    @classmethod
    def of(cls, *roles):
        return type("HasRoleOf", (cls,), {"allowed_roles": roles})

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in self.allowed_roles)


IsPatient = HasRole.of(User.Role.PATIENT)
IsAdminRole = HasRole.of(User.Role.ADMIN)
