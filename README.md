# NTEMO ONE • Plateforme Intégrée de Pointage & Gestion RH

Solution moderne de pointage biométrique par scan inversé anti-fraude, gestion des badges virtuels et physiques, moteur documentaire et RH, propulsée par **Firebase** et **React / Flutter**.

---

## 📁 Architecture du Projet

```
NTEmo ONE/
├── 🌐 ntemo-web/             # Application Web (Borne Kiosk Tablette + Portail RH Admin)
├── ⚡ ntemo-functions/       # Backend Firebase Cloud Functions & API REST
├── 📱 ntemo-one-mobile/      # Application Mobile Flutter (Non modifiée pour l'instant)
├── firebase.json             # Configuration Firebase Hosting, Functions & Firestore
├── firestore.rules           # Règles de sécurité RBAC (SuperAdmin, Direction, RH, Collaborateur)
└── storage.rules             # Règles de sécurité GED (Pièces jointes administratives)
```

---

## 🚀 1. Lancement de l'Application Web

Dans un terminal :
```bash
cd ntemo-web
npm run dev
```
L'application démarre sur `http://localhost:3000`.

### Deux modes intégrés :
1. **Borne Kiosk d'accueil (`/kiosk`)** : Mode plein écran pour la tablette fixée au mur. Scanner caméra temps réel, bips sonores harmonieux, sélection Entrée / Sortie, anti-fraude infalsifiable.
2. **Portail RH & Admin (`/admin`)** :
   - **Tableau de Bord / KPIs** : Taux de présence en direct, retards (+min), collaborateurs présents.
   - **Badges & Impression** : Visualisation haute résolution et impression des cartes d'accès professionnelles Recto / Verso (format CR80 avec QR code de sécurité).
   - **Collaborateurs & GED** : Gestion des fiches, pièces jointes (CNI, CV, contrats) et alertes d'échéances CDD.
   - **Moteur Documentaire** : Génération automatique d'attestations de travail Word, ordres de mission et bilans de présence mensuels Excel.
   - **Assistant IA NTEMO** : Rédaction assistée de courriers administratifs et synthèses.

---

## 🔑 2. Connexion à votre Projet Firebase

Dès que vous aurez créé votre projet sur la [Console Firebase](https://console.firebase.google.com), ouvrez le fichier :
`ntemo-web/.env`

Et collez simplement vos clés :
```env
VITE_FIREBASE_API_KEY=votre_cle_api
VITE_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre-projet
VITE_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
VITE_USE_MOCK_DATA=false
```

*Note : L'application fonctionne immédiatement même sans les clés grâce au mode interactif de démonstration intégré.*

