# ⚠️ Actions Requises de Votre Part

## 🔴 Actions Immédiates

### 1. Créer un compte Supabase
- [ ] Aller sur https://supabase.com
- [ ] Créer un compte (gratuit)
- [ ] Créer un nouveau projet
- [ ] Exécuter le script SQL (`supabase/schema.sql`) dans le SQL Editor
- [ ] Récupérer les clés API (URL, anon key, service_role key)
  - Aller dans votre projet Supabase → **Settings** (⚙️) → **API**
  - **Project URL** : Copier l'URL complète (ex: `https://xxxxx.supabase.co`)
  - **anon key** : Dans "Project API keys", copier la clé `anon` `public` (commence par `eyJ...`)
  - **service_role key** : Dans "Project API keys", copier la clé `service_role` `secret` (⚠️ gardez-la secrète!)

### 2. Configurer les variables d'environnement
- [ ] Créer le fichier `.env.local` à partir de `.env.local.example`
- [ ] Remplir avec vos clés Supabase
- [ ] Ajouter votre clé OpenAI API
- [ ] Définir un mot de passe admin

### 3. Créer le repository GitHub
- [ ] Aller sur https://github.com/new
- [ ] Créer un nouveau repository : `Interface-HEC-Jocas-Etudiants` (ou autre nom)
- [ ] **NE PAS** initialiser avec README, .gitignore, ou licence (on a déjà tout)
- [ ] Copier les commandes Git qui apparaissent et les exécuter dans le terminal

### 4. Installer et tester
- [ ] Exécuter `npm install`
- [ ] Exécuter `npm run dev`
- [ ] Tester l'application : http://localhost:3000
- [ ] Vérifier que tout fonctionne

---

## 🟡 Actions à Faire Plus Tard

### 5. Déployer sur Vercel
- [ ] Connecter le repository GitHub à Vercel
- [ ] Configurer les variables d'environnement sur Vercel
- [ ] Déployer

### 6. Configurer le dashboard admin
- [ ] Créer la page `/admin` (à faire)
- [ ] Configurer l'authentification admin
- [ ] Ajouter les statistiques et graphiques

---

## 📋 Checklist de Vérification

Avant de commencer à utiliser l'application :

- [ ] Supabase configuré et tables créées
- [ ] Variables d'environnement configurées
- [ ] `npm install` exécuté avec succès
- [ ] `npm run dev` fonctionne sans erreur
- [ ] La page d'accueil s'affiche correctement
- [ ] La génération d'offres fonctionne
- [ ] Les votes s'enregistrent dans Supabase

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :
1. Vérifiez le fichier `SETUP.md` pour les instructions détaillées
2. Vérifiez les logs dans la console du navigateur
3. Vérifiez les logs du serveur Next.js
4. Vérifiez les logs dans Supabase (Logs > API)
