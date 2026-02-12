# 🚀 Guide de Configuration - Application Étudiants HEC

## 📋 Prérequis

- Node.js 18+ installé
- Compte Supabase (gratuit) : https://supabase.com
- Clé API OpenAI

---

## 🔧 Étape 1 : Configuration Supabase

### 1.1 Créer un projet Supabase

1. Allez sur https://supabase.com
2. Créez un compte (gratuit)
3. Cliquez sur "New Project"
4. Remplissez :
   - **Name** : `hec-jocas-etudiants` (ou autre nom)
   - **Database Password** : Choisissez un mot de passe fort (notez-le !)
   - **Region** : Choisissez la région la plus proche
5. Cliquez sur "Create new project"
6. Attendez 2-3 minutes que le projet soit créé

### 1.2 Créer les tables

1. Dans votre projet Supabase, allez dans **SQL Editor**
2. Cliquez sur **New Query**
3. Copiez-collez le contenu du fichier `supabase/schema.sql`
4. Cliquez sur **Run** (ou F5)
5. Vérifiez que les tables sont créées dans **Table Editor**

### 1.3 Récupérer les clés API

1. Allez dans **Settings** > **API**
2. Vous verrez :
   - **Project URL** : Copiez cette URL
   - **anon public** key : Copiez cette clé
   - **service_role** key : Copiez cette clé (⚠️ gardez-la secrète !)

---

## 🔑 Étape 2 : Configuration des variables d'environnement

1. Dans le dossier du projet, créez un fichier `.env.local` :
```bash
cp .env.local.example .env.local
```

2. Éditez `.env.local` et remplissez avec vos valeurs :

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...

# Admin Password (pour le dashboard admin)
ADMIN_PASSWORD=votre_mot_de_passe_securise
```

---

## 📦 Étape 3 : Installation des dépendances

```bash
npm install
```

---

## 🚀 Étape 4 : Lancer l'application

```bash
npm run dev
```

L'application sera accessible sur http://localhost:3000

---

## ✅ Vérification

1. Ouvrez http://localhost:3000
2. Vous devriez voir la page d'accueil avec le consentement
3. Cliquez sur "Commencer l'étude"
4. Vous devriez voir deux offres d'emploi à comparer

---

## 🐛 Dépannage

### Erreur : "Failed to create session"
- Vérifiez que les variables d'environnement Supabase sont correctes
- Vérifiez que les tables sont bien créées dans Supabase

### Erreur : "Failed to generate job offers"
- Vérifiez que `OPENAI_API_KEY` est correcte
- Vérifiez votre quota OpenAI

### Erreur de build Tailwind
- Vérifiez que `postcss.config.mjs` existe
- Vérifiez que `tailwind.config.ts` existe

---

## 📝 Prochaines étapes

1. ✅ Configuration Supabase
2. ✅ Variables d'environnement
3. ✅ Test de l'application
4. ⏭️ Créer le repository GitHub
5. ⏭️ Déployer sur Vercel
6. ⏭️ Configurer le dashboard admin

---

## 🔐 Sécurité

- ⚠️ **NE COMMITEZ JAMAIS** le fichier `.env.local` sur GitHub
- ⚠️ La `SUPABASE_SERVICE_ROLE_KEY` ne doit être utilisée que côté serveur
- ⚠️ Le `ADMIN_PASSWORD` doit être fort et unique
