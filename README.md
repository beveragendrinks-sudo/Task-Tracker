# Task Engine — Application de gestion des tâches multi-entités

Application web complète de gestion des tâches, engagements et workload pour groupe industriel multi-entités. Construite avec **Next.js 14**, **Supabase** et **Tailwind CSS**.

---

## ✨ Fonctionnalités

- 🔐 **Authentification Supabase** (email/mot de passe)
- 👥 **Rôles** : DG, Admin, Head of Department, Manager, Task Owner, Contributor
- 🏢 **Multi-entités** et **multi-départements**
- ✅ **Workflow d'acceptation** strict : pas de tâche sans accord, pas de deadline sans validation
- 📋 **Kanban Board** avec colonnes statuts
- 📊 **Dashboard DG** avec KPIs temps réel
- ⚖️ **Gestion du workload** (calcul automatique, alertes seuils)
- 🚫 **Gestion des blocages** avec escalade automatique
- 🎯 **Milestones et Definition of Done**
- 📈 **Scoring bonus** pondéré par complexité
- 🔔 **Notifications** (in-app, email Resend en option)
- 🤖 **Architecture IA** prête pour Claude API
- 🔒 **Row Level Security** activée sur toutes les tables sensibles

---

## 🚀 Démarrage rapide (5 min)

### 1. Cloner et installer

```bash
cd task-engine
npm install
```

### 2. Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → New Project
2. Récupérer **URL**, **anon key** et **service_role key**

### 3. Exécuter les scripts SQL

Dans Supabase → SQL Editor, exécuter dans l'ordre :

```
supabase/01_schema.sql    → Crée les tables, types, triggers, vues
supabase/02_rls.sql       → Active la sécurité RLS
supabase/03_seed.sql      → (Optionnel) Données de démonstration
```

### 4. Configurer l'environnement

```bash
cp .env.example .env.local
```

Éditer `.env.local` avec vos clés Supabase :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx
```

### 5. Créer un utilisateur

**Option A : S'inscrire via l'application**

1. Lancer l'app : `npm run dev`
2. Ouvrir [http://localhost:3000/signup](http://localhost:3000/signup)
3. Remplir le formulaire d'inscription
4. Le compte sera créé automatiquement avec le rôle **Task Owner**

**Option B : Créer manuellement un utilisateur DG**

Dans Supabase → Authentication → Users → Add User, créer un compte. Puis dans SQL Editor :

```sql
update profiles
set role = 'general_manager', full_name = 'Votre Nom'
where email = 'votre@email.tn';
```

**Pour changer le rôle d'un utilisateur existant :**

```sql
-- Modifier le rôle (général_manager, admin, head_of_department, manager, task_owner, contributor)
update profiles
set role = 'admin'
where email = 'utilisateur@groupe.tn';
```

### 6. Lancer l'app

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## � Gestion des rôles et accès

### Rôles disponibles

L'application utilise 6 niveaux de rôles avec des permissions hiérarchiques :

| Rôle | Description | Permissions |
|---|---|---|
| **general_manager** (DG) | Directeur Général | Accès complet, voit toutes les tâches, dashboard KPI |
| **admin** | Administrateur système | Gestion des utilisateurs, entités, départements |
| **head_of_department** | Chef de département | Voit toutes les tâches de son département |
| **manager** | Manager d'équipe | Gère les tâches de son équipe |
| **task_owner** | Propriétaire de tâche | Crée et gère ses propres tâches (rôle par défaut) |
| **contributor** | Contributeur | Participe aux tâches assignées |

### Attribution automatique des rôles

Lors de l'inscription via `/signup` :
- **Rôle par défaut** : `task_owner`
- Le profil est créé automatiquement via un trigger PostgreSQL
- L'utilisateur peut immédiatement se connecter et créer des tâches

### Modifier un rôle utilisateur

Seuls les **admin** et **general_manager** peuvent modifier les rôles via SQL :

```sql
-- Promouvoir un utilisateur en Admin
update profiles set role = 'admin' where email = 'utilisateur@groupe.tn';

-- Assigner un département et une entité
update profiles 
set entity_id = (select id from entities where name = 'Entité A'),
    department_id = (select id from departments where name = 'Finance')
where email = 'utilisateur@groupe.tn';
```

### Sécurité (Row Level Security)

- Toutes les tables sensibles utilisent **RLS**
- Chaque utilisateur ne voit que ce qu'il est autorisé à voir
- Les requêtes sont filtrées automatiquement par PostgreSQL
- Consultez [supabase/02_rls.sql](./supabase/02_rls.sql) pour les détails

---

## �📚 Documentation

| Document | Contenu |
|---|---|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Manuel de déploiement complet (Vercel + Supabase) |
| [API_REFERENCE.md](./API_REFERENCE.md) | Liste de toutes les APIs et routes |
| [supabase/01_schema.sql](./supabase/01_schema.sql) | Schéma DB documenté |

---

## 🗂️ Structure du projet

```
task-engine/
├── app/                      # Pages Next.js (App Router)
│   ├── login/                # Page de connexion
│   ├── (app)/                # Pages authentifiées (sidebar)
│   │   ├── dashboard/        # Tableau de bord DG
│   │   ├── kanban/           # Vue Kanban
│   │   ├── tasks/            # CRUD tâches
│   │   └── workload/         # Charge de travail
│   └── api/                  # Routes API (workflow, tâches)
├── components/               # Composants UI réutilisables
├── lib/
│   ├── supabase/             # Clients Supabase
│   └── workflow.ts           # Machine à états
├── supabase/                 # Migrations SQL
└── types/                    # Types TypeScript
```

---

## 🛠️ Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript |
| UI | Tailwind CSS |
| Icons | Lucide React |
| Charts | Recharts |
| BDD | Supabase (PostgreSQL 15) |
| Auth | Supabase Auth |
| Sécurité | Row Level Security (RLS) |
| Hosting recommandé | Vercel + Supabase Cloud |

---

## 📝 Licence

Projet propriétaire — Usage interne au groupe.
