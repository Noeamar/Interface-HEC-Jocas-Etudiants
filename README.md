# HEC JOCAS - Étude Étudiants

Application pour collecter les préférences des étudiants HEC concernant les offres d'emploi et calculer la "willingness to pay" pour chaque label JOCAS.

## 🚀 Démarrage rapide

1. Installer les dépendances :
```bash
npm install
```

2. Configurer les variables d'environnement :
Créer un fichier `.env.local` avec :
```
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
OPENAI_API_KEY=votre_cle_openai
ADMIN_PASSWORD=votre_mot_de_passe_admin
```

3. Lancer le serveur de développement :
```bash
npm run dev
```

## 📊 Base de données

Le schéma Supabase est défini dans `supabase/schema.sql`. Exécutez-le dans votre projet Supabase.

## 🎯 Fonctionnalités

- Génération de paires d'offres avec labels garantis
- Interface de vote pour les étudiants
- Dashboard admin avec statistiques et WTP
- Export des données en CSV
# Interface-HEC-Jocas-Etudiants
