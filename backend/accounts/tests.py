from rest_framework.test import APITestCase

from .models import User


class AuthFlowTests(APITestCase):
    def test_register_login_me(self):
        r = self.client.post("/api/auth/register/", {
            "email": "amine@example.com", "password": "Fakarni#2026", "first_name": "Amine",
        })
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["role"], User.Role.PATIENT)

        r = self.client.post("/api/auth/token/", {"email": "amine@example.com", "password": "Fakarni#2026"})
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

        r = self.client.get("/api/auth/me/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["email"], "amine@example.com")

    def test_cannot_register_as_admin(self):
        r = self.client.post("/api/auth/register/", {
            "email": "x@example.com", "password": "Fakarni#2026", "role": "ADMIN",
        })
        self.assertEqual(r.status_code, 400)

    def test_patient_cannot_list_users(self):
        User.objects.create_user("p@example.com", "Fakarni#2026")
        r = self.client.post("/api/auth/token/", {"email": "p@example.com", "password": "Fakarni#2026"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        self.assertEqual(self.client.get("/api/admin/users/").status_code, 403)
