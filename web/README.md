# Fakarni — Application Web (React)

Tableau de bord multi-rôles (patient, aidant, professionnel, administrateur).

## Lancer en développement

Prérequis : Node.js 20+ et le backend lancé (`docker compose up -d` à la racine).

```bash
cd web
npm install
copy .env.example .env      # PowerShell : Copy-Item .env.example .env
npm run dev
```

Ouvrir http://localhost:5173

## Structure

```
src/
├── api.js                  client Axios + JWT + renouvellement automatique du jeton
├── auth/AuthContext.jsx    état de connexion (login, register, logout)
├── components/             Layout (menu latéral), ProtectedRoute (accès par rôle)
└── pages/                  Login, Register, Dashboard, Profile, AdminUsers
```
