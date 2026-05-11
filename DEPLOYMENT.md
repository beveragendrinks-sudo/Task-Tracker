# 📘 Manuel de déploiement — Task Engine

Guide pas à pas pour déployer Task Engine en production.

**Durée estimée :** 30 à 45 minutes pour un premier déploiement.

---

## Sommaire

1. [Prérequis](#1-prérequis)
2. [Création du projet Supabase](#2-création-du-projet-supabase)
3. [Exécution des scripts SQL](#3-exécution-des-scripts-sql)
4. [Configuration locale](#4-configuration-locale)
5. [Création du premier utilisateur (DG)](#5-création-du-premier-utilisateur-dg)
6. [Test en local](#6-test-en-local)
7. [Déploiement production (Vercel)](#7-déploiement-production-vercel)
8. [Onboarding des utilisateurs](#8-onboarding-des-utilisateurs)
9. [Phase optionnelle : Notifications email (Resend)](#9-phase-optionnelle--notifications-email-resend)
10. [Phase optionnelle : Intelligence artificielle (Claude API)](#10-phase-optionnelle--intelligence-artificielle-claude-api)
11. [Maintenance & monitoring](#11-maintenance--monitoring)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prérequis

| Élément | Version | Lien |
|---|---|---|
| Node.js | ≥ 18.17 | [nodejs.org](https://nodejs.org) |
| Compte Supabase | gratuit | [supabase.com](https://supabase.com) |
| Compte Vercel (recommandé) | gratuit | [vercel.com](https://vercel.com) |
| Compte GitHub | — | [github.com](https://github.com) |
| (optionnel) Compte Resend | gratuit 3000 emails/mois | [resend.com](https://resend.com) |
| (optionnel) Compte Anthropic | — | [console.anthropic.com](https://console.anthropic.com) |

**Connaissances utiles :** notions de base SQL, accès terminal, Git.

---

## 2. Création du projet Supabase

### 2.1 Création du projet

1. Aller sur [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New Project**
3. Choisir :
   - **Name** : `task-engine-prod`
   - **Database Password** : ⚠ générer fort, **noter dans gestionnaire de secrets**
   - **Region** : choisir la plus proche (Europe : `eu-west-1`)
   - **Pricing Plan** : Free pour démarrer (passer en Pro pour usage intensif)
4. Cliquer sur **Create New Project** et attendre 2 minutes

### 2.2 Récupérer les clés API

Aller dans **Project Settings → API** et noter :

| Variable | Description |
|---|---|
| `Project URL` | Format `https://xxxxx.supabase.co` |
| `anon` `public` | Clé publique pour le client |
| `service_role` `secret` | ⚠ Clé admin — **ne jamais exposer côté client** |

---

## 3. Exécution des scripts SQL

Aller dans **SQL Editor** sur le tableau de bord Supabase et **exécuter dans l'ordre** :

### 3.1 Schéma — `supabase/01_schema.sql`

1. Ouvrir le fichier `supabase/01_schema.sql`
2. Copier l'intégralité du contenu
3. Coller dans SQL Editor
4. Cliquer **RUN** (▶)
5. ✅ Vérifier message « Success »

**Vérification** : aller dans **Table Editor** → vous devez voir les tables : `entities`, `departments`, `profiles`, `tasks`, etc.

### 3.2 RLS (sécurité) — `supabase/02_rls.sql`

1. Nouvelle requête → coller `02_rls.sql`
2. Cliquer **RUN**
3. ✅ Vérifier message « Success »

**Vérification** :
```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```
Toutes les lignes doivent avoir `rowsecurity = true`.

### 3.3 (Optionnel) Données démo — `supabase/03_seed.sql`

Pour avoir des entités, départements et tâches de test :
1. Coller `03_seed.sql`
2. Cliquer **RUN**

⚠ **Ne pas exécuter en production** sans avoir d'abord créé vos vrais utilisateurs.

---

## 4. Configuration locale

### 4.1 Cloner et installer

```bash
git clone <votre-repo> task-engine
cd task-engine
npm install
```

### 4.2 Variables d'environnement

```bash
cp .env.example .env.local
```

Éditer `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Task Engine"
```

---

## 5. Création du premier utilisateur (DG)

⚠ **Étape critique.** Sans utilisateur DG, vous ne pourrez pas créer d'autres comptes ni configurer l'app.

### 5.1 Créer le compte auth

Dans Supabase → **Authentication → Users → Add User → Create new user** :
- **Email** : votre email professionnel
- **Password** : mot de passe fort
- ✅ **Auto Confirm User** (cocher pour bypass email confirmation)

### 5.2 Élever le profil au rang de DG

Le trigger `handle_new_auth_user` a automatiquement créé un `profiles` lié. Il faut maintenant l'élever :

```sql
update profiles
set
  role = 'general_manager',
  full_name = 'Votre Nom Prénom',
  job_title = 'Directeur Général',
  entity_id = (select id from entities where is_group_level = true limit 1)
where email = 'votre@email.tn';
```

### 5.3 Créer entités et départements (si seed pas exécuté)

```sql
insert into entities (name, description, is_group_level) values
  ('Holding', 'Société mère', true),
  ('Food & Beverage', 'Industrie agroalimentaire', false);

insert into departments (name) values
  ('Direction Générale'), ('Production'), ('Sales'),
  ('Finance'), ('Qualité'), ('Achats'), ('RH'), ('IT');
```

---

## 6. Test en local

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) → vous serez redirigé vers `/login`.

**Test minimum à effectuer :**

| Action | Résultat attendu |
|---|---|
| Login avec votre compte DG | Redirection vers `/dashboard` |
| Créer une nouvelle tâche | Apparaît dans `/tasks/given` |
| Vue Kanban | Tâche dans la colonne « À accepter » |
| Vue Workload | Vous y êtes listé |

**Si erreur RLS** : voir [Troubleshooting](#12-troubleshooting).

---

## 7. Déploiement production (Vercel)

### 7.1 Push sur GitHub

```bash
git init
git add .
git commit -m "Initial Task Engine"
git remote add origin git@github.com:votre-org/task-engine.git
git push -u origin main
```

### 7.2 Import Vercel

1. [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → sélectionner votre repo
3. **Framework Preset** : Next.js (auto-détecté)
4. **Environment Variables** : ajouter les 4 variables de `.env.local`
5. **Deploy**

⏱ Build dure 2 à 4 minutes.

### 7.3 Configuration domaine (optionnel)

**Settings → Domains → Add** : `tasks.votre-domaine.tn`

Configurer DNS (CNAME) : Vercel donne les enregistrements à ajouter.

### 7.4 Mise à jour `Site URL` Supabase

Dans Supabase → **Authentication → URL Configuration** :
- **Site URL** : `https://tasks.votre-domaine.tn`
- **Redirect URLs** : ajouter `https://tasks.votre-domaine.tn/**`

⚠ Sans cela, login en prod ne marchera pas.

---

## 8. Onboarding des utilisateurs

### 8.1 Création en masse

Dans Supabase → **Authentication → Users → Add User** pour chaque collaborateur.

Puis SQL pour mise à jour des profils :

```sql
update profiles set
  full_name = 'Nom Prénom',
  role = 'head_of_department', -- ou 'manager', 'task_owner'
  job_title = 'Directeur Production',
  department_id = (select id from departments where name = 'Production'),
  entity_id = (select id from entities where name = 'Food & Beverage')
where email = 'utilisateur@groupe.tn';
```

### 8.2 Email de bienvenue

Vous pouvez activer **Magic Link** ou **Email Invite** dans Supabase Auth.

Ou envoyer manuellement un email avec :
- URL : `https://tasks.votre-domaine.tn/login`
- Email + mot de passe temporaire

---

## 9. Phase optionnelle : Notifications email (Resend)

### 9.1 Compte Resend

1. [resend.com](https://resend.com) → créer compte
2. Vérifier votre domaine d'envoi (ajouter SPF/DKIM via DNS)
3. Récupérer la clé API

### 9.2 Variables

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL="Task Engine <noreply@votre-domaine.tn>"
```

### 9.3 Implémentation

À ajouter dans `app/api/notifications/send/route.ts` :

```ts
import { Resend } from 'resend'; // npm install resend

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { to, subject, html } = await req.json();
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to, subject, html,
  });
  return NextResponse.json({ success: true });
}
```

Et créer un trigger Postgres + Edge Function Supabase qui appelle cette route à chaque insertion dans `notifications`.

---

## 10. Phase optionnelle : Intelligence artificielle (Claude API)

### 10.1 Variables

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

### 10.2 Cas d'usage à implémenter (Edge Functions Supabase)

| Edge Function | Déclencheur | Action |
|---|---|---|
| `ai-analyze-task` | Insertion `tasks` (P1/P2) | Calcul `ai_risk_score`, `ai_summary` |
| `ai-suggest-milestones` | Tâche > 10 jours | Propose découpe en milestones |
| `ai-detect-overload` | Cron quotidien | Analyse `task_workload_allocations` → alertes |
| `ai-escalate-blockers` | Cron quotidien | Détecte blocages > 72h sur P1/P2 |
| `ai-daily-digest` | Cron 8h | Email DG : top 5 risques |

### 10.3 Exemple Edge Function — analyse risque

```bash
supabase functions new ai-analyze-task
```

```ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

Deno.serve(async (req) => {
  const { task } = await req.json();

  const msg = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Analyse cette tâche et retourne un JSON strict:
        Titre: ${task.title}
        Description: ${task.description}
        Priorité: ${task.priority}
        Deadline: ${task.proposed_deadline}
        Charge: ${task.proposed_workload_percent}%

        Format: { "risk_score": 0.0 à 1.0, "summary": "résumé 1 phrase", "warnings": [...] }`
    }]
  });

  const result = JSON.parse((msg.content[0] as any).text);
  // ... update task with result
  return new Response(JSON.stringify(result));
});
```

Déploiement :
```bash
supabase functions deploy ai-analyze-task
```

---

## 11. Maintenance & monitoring

### 11.1 Backups

Supabase backup automatique quotidien sur le plan **Pro** (€25/mois recommandé pour la prod).

Backup manuel ponctuel :
```bash
supabase db dump -f backup-$(date +%Y%m%d).sql --project-ref xxxxx
```

### 11.2 Monitoring

| Plateforme | Page |
|---|---|
| Supabase | **Project → Reports** : requêtes lentes, charges |
| Vercel | **Analytics** : trafic, erreurs runtime |
| Sentry (optionnel) | npm install @sentry/nextjs pour tracking d'erreurs |

### 11.3 Mises à jour

```bash
git pull
npm install
npm run build
# Vercel redéploie automatiquement à chaque push sur main
```

### 11.4 Migration de schéma

À chaque changement SQL, créer un nouveau fichier `supabase/04_xxx.sql`, l'exécuter en dev, le tester, puis l'exécuter en prod.

⚠ **Toujours backuper avant migration.**

---

## 12. Troubleshooting

### ❌ Erreur « Auth session missing »

**Cause** : cookies de session non transmis.
**Solution** :
- Vérifier `Site URL` dans Supabase Auth
- Vérifier les `Redirect URLs` autorisés
- Effacer cookies et retenter

### ❌ Erreur « RLS policy violation »

**Cause** : utilisateur tente d'accéder à une donnée que sa policy interdit.
**Solution** :
1. Vérifier le rôle de l'utilisateur : `select role from profiles where email = '...'`
2. Vérifier les policies actives : `select * from pg_policies where tablename = 'tasks'`
3. Pour debug : tester en SQL avec `set local role authenticated; set local "request.jwt.claims" to '{"sub":"<user-uuid>"}';`

### ❌ « Trigger handle_new_auth_user a échoué »

**Cause** : conflit unique sur `email` ou `auth_user_id` déjà existant.
**Solution** :
```sql
-- Vérifier doublons
select email, count(*) from profiles group by email having count(*) > 1;

-- Lier manuellement profil et auth user
update profiles
set auth_user_id = (select id from auth.users where email = profiles.email)
where auth_user_id is null;
```

### ❌ Build Vercel échoue

**Causes fréquentes** :
- Variables d'environnement manquantes → vérifier dans Vercel Settings
- Erreur TypeScript stricte → `tsconfig.json` a `strict: false` par défaut
- Module not found → `npm install` avant push

### ❌ Page blanche en production

**Cause** : variables `NEXT_PUBLIC_*` non définies au moment du build.
**Solution** : ajouter dans Vercel **Environment Variables** puis **Redeploy**.

---

## 📞 Support

- 📚 Documentation Next.js : [nextjs.org/docs](https://nextjs.org/docs)
- 📚 Documentation Supabase : [supabase.com/docs](https://supabase.com/docs)
- 🐛 Issues internes : créer un ticket dans votre tracker

---

✅ **Checklist déploiement production**

- [ ] Projet Supabase Pro (backup auto)
- [ ] Scripts SQL exécutés (01, 02, 03 si seed)
- [ ] RLS activé sur toutes les tables
- [ ] Compte DG créé et rôle élevé
- [ ] Site URL et Redirect URLs configurés
- [ ] Variables d'env Vercel renseignées
- [ ] Domaine custom configuré + HTTPS
- [ ] Test login + création tâche en prod
- [ ] Premier batch d'utilisateurs créés
- [ ] Email de bienvenue envoyé
- [ ] Plan de backup et restore testé
