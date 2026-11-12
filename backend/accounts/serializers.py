from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ("id", "email", "password", "first_name", "last_name", "role", "timezone")
        read_only_fields = ("id",)

    def validate_role(self, value):
        # Un administrateur ne peut pas s'inscrire lui-même.
        if value == User.Role.ADMIN:
            raise serializers.ValidationError("Rôle non autorisé à l'inscription.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "phone", "role",
                  "timezone", "notifications_enabled", "date_joined")
        read_only_fields = ("id", "email", "role", "date_joined")
