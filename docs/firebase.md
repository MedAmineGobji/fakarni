# Configurer Firebase Cloud Messaging (notifications sur le téléphone)

Sans Firebase, les rappels fonctionnent déjà : ils s'affichent dans l'application web
(cloche + notification du navigateur). Firebase sert uniquement à envoyer les rappels
sur le téléphone (application Flutter, étape 5).

## 1. Créer le projet
1. Aller sur https://console.firebase.google.com → **Ajouter un projet** → nom : `fakarni`.
2. Google Analytics : facultatif (on peut le désactiver).

## 2. Récupérer la clé du compte de service (pour le backend)
1. Roue dentée ⚙ → **Paramètres du projet** → onglet **Comptes de service**.
2. **Générer une nouvelle clé privée** → un fichier `.json` est téléchargé.
3. Le renommer `firebase.json` et le placer dans `backend/secrets/firebase.json`.
   Ce dossier est ignoré par Git : **ne jamais envoyer ce fichier sur GitHub**.

## 3. Activer la clé dans le projet
Dans le fichier `.env` à la racine, ajouter :

```
FCM_CREDENTIALS_FILE=/app/secrets/firebase.json
```

Puis redémarrer :

```
docker compose up -d --force-recreate worker
```

## 4. Côté téléphone (étape 5)
L'application Flutter récupère son jeton d'appareil et l'envoie à
`POST /api/notifications/register-device/` ; le backend s'en sert pour envoyer les push.
