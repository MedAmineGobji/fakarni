# Fakarni — Assistant intelligent de suivi des médicaments

Monorepo du projet de développement (SCRUM + CRISP-DM).

```
fakarni/
├── backend/      API Django REST (auth JWT, rôles, métier)      ← Sprint 1
├── ai-service/   Service IA FastAPI (OCR, prédiction, RAG)      ← Sprint 3
├── web/          Application Web React (tableau de bord)        ← Sprint 1-2
├── mobile/       Application Flutter (patient)                  ← Sprint 2
└── docs/         Dossier, diagrammes, comptes rendus de sprint
```

## Démarrage (Étape 1)

Prérequis : Git, Docker Desktop, Python 3.12, VS Code.

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py test
```

- API : http://localhost:8000/api/
- Administration Django : http://localhost:8000/admin/

## Endpoints disponibles (Sprint 1)

| Méthode | URL | Rôle |
|---|---|---|
| POST | /api/auth/register/ | Inscription (US01) |
| POST | /api/auth/token/ | Connexion → jetons access + refresh (US02) |
| POST | /api/auth/refresh/ | Renouveler le jeton d'accès |
| GET / PATCH | /api/auth/me/ | Consulter / modifier son profil (US03) |
| GET / POST / PATCH / DELETE | /api/admin/users/ | Gestion des comptes, admin seulement (US17) |

Exemple (Postman ou curl) :

```bash
curl -X POST http://localhost:8000/api/auth/register/ -H "Content-Type: application/json" \
  -d '{"email":"amine@example.com","password":"Fakarni#2026","first_name":"Amine"}'
curl -X POST http://localhost:8000/api/auth/token/ -H "Content-Type: application/json" \
  -d '{"email":"amine@example.com","password":"Fakarni#2026"}'
```

## Conventions d'équipe

- Une branche par User Story : `feature/US04-medications`
- Pull request obligatoire vers `main`, relue par un autre membre
- Messages de commit : `feat(US04): ajout du CRUD médicaments`
