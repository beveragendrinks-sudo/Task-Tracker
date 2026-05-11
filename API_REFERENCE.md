# 🔌 API Reference — Task Engine

Documentation complète des APIs et points d'accès aux données.

L'application utilise **deux modes d'accès** :
1. **Supabase REST/PostgREST** : accès direct aux tables via le SDK `@supabase/ssr` (sécurisé par RLS)
2. **Routes API Next.js** : endpoints custom pour validations métier (workflow, etc.)

---

## Sommaire

1. [Authentication](#1-authentication)
2. [Routes API Next.js](#2-routes-api-nextjs)
3. [Tables Supabase (PostgREST)](#3-tables-supabase-postgrest)
4. [Vues Supabase](#4-vues-supabase)
5. [Fonctions RPC](#5-fonctions-rpc)
6. [Edge Functions à implémenter (Phase 5)](#6-edge-functions-à-implémenter-phase-5)
7. [Webhooks (Phase 4)](#7-webhooks-phase-4)

---

## 1. Authentication

Toutes les requêtes nécessitent une session Supabase active.
Le SDK gère automatiquement les cookies via `@supabase/ssr`.

### Login
```ts
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'xxxxxx'
});
```

### Logout
```ts
await supabase.auth.signOut();
```

### Récupérer profil courant
```ts
import { getCurrentProfile } from '@/lib/supabase/server';

const profile = await getCurrentProfile();
// → { id, full_name, role, entity, department, ... }
```

---

## 2. Routes API Next.js

### `GET /api/tasks`

Liste les tâches accessibles à l'utilisateur courant (filtré par RLS).

**Query params (optionnels) :**
| Param | Type | Description |
|---|---|---|
| `status` | TaskStatus | Filtrer par statut |
| `owner_id` | uuid | Filtrer par responsable |
| `entity_id` | uuid | Filtrer par entité |

**Réponse :**
```json
{
  "tasks": [
    { "id": "...", "title": "...", "priority": "P1", ... }
  ]
}
```

---

### `POST /api/tasks`

Crée une nouvelle tâche en statut `assigned`.

**Body :**
```json
{
  "title": "Lancement nouveau produit",
  "description": "...",
  "entity_id": "uuid",
  "primary_department_id": "uuid",
  "owner_id": "uuid",
  "priority": "P2",
  "complexity": "complex",
  "proposed_deadline": "2026-08-15",
  "proposed_workload_percent": 40,
  "definition_of_done": [
    { "label": "BAT validé", "done": false }
  ]
}
```

**Validations :**
- `title`, `description`, `entity_id`, `owner_id` obligatoires
- `definition_of_done` doit contenir au moins 1 critère
- Création P1 réservée aux DG (sinon abaissé à P2)

**Réponse 201 :**
```json
{ "task": { "id": "...", "reference": "TSK-2026-00001", ... } }
```

---

### `GET /api/tasks/[id]`

Détail complet d'une tâche avec relations (entité, département, créateur, owner).

---

### `PATCH /api/tasks/[id]`

Met à jour les champs autorisés d'une tâche.

**Body (champs autorisés) :**
- `title`, `description`
- `priority`, `complexity`
- `proposed_deadline`, `proposed_workload_percent`
- `accepted_deadline`, `accepted_workload_percent`
- `definition_of_done`
- `primary_department_id`

---

### `DELETE /api/tasks/[id]`

Supprime une tâche. **Réservé DG/Admin.**

---

### `POST /api/tasks/[id]/transition`

Effectue une transition de statut sur une tâche, avec validation workflow.

**Body :**
```json
{
  "to_status": "accepted",
  "reason": "Texte requis si la transition exige une raison"
}
```

**Logique :**
1. Vérifie que l'utilisateur a le rôle autorisé pour cette transition (voir `lib/workflow.ts`)
2. Si `requiresReason: true`, vérifie présence de `reason`
3. Si `requiresDoD: true`, vérifie que tous les critères DoD sont `done: true`
4. Met à jour la tâche avec timestamps appropriés
5. Insère dans `task_status_history` pour audit trail

**Codes retour :**
- `200` : succès
- `400` : raison ou DoD manquante
- `401` : non authentifié
- `403` : transition non autorisée pour ce rôle
- `404` : tâche introuvable

**Transitions autorisées (extrait) :**

| De | Vers | Rôles autorisés | Raison ? | DoD ? |
|---|---|---|---|---|
| `assigned` | `accepted` | owner | non | non |
| `assigned` | `negotiation` | owner | **oui** | non |
| `accepted` | `active` | owner | non | non |
| `active` | `pending` | owner | **oui** | non |
| `active` | `blocked` | owner | **oui** | non |
| `active` | `closed_by_owner` | owner | non | **oui** |
| `closed_by_owner` | `approved` | creator/DG | non | non |
| `closed_by_owner` | `rejected_closure` | creator/DG | **oui** | non |

(liste complète dans `lib/workflow.ts → TRANSITIONS`)

---

## 3. Tables Supabase (PostgREST)

Accès direct via SDK Supabase. **Toutes filtrées par RLS.**

### Endpoint pattern
```
https://<project>.supabase.co/rest/v1/<table>
```

Avec headers :
```
apikey: <anon-key>
Authorization: Bearer <user-jwt>
```

### Tables disponibles

| Table | Description | Permissions |
|---|---|---|
| `profiles` | Utilisateurs et rôles | Lecture publique (actifs) ; modif own profile + DG/Admin |
| `entities` | Entités du groupe | Lecture publique ; modif DG/Admin |
| `departments` | Départements | Lecture publique ; modif DG/Admin |
| `user_departments` | Affectations multiples | Lecture publique ; modif DG/Admin |
| `tasks` | Tâches | RLS complexe (voir 02_rls.sql) |
| `task_milestones` | Jalons | Selon accès tâche parente |
| `task_subtasks` | Sous-tâches | Selon accès tâche parente |
| `task_contributors` | Contributeurs | Selon accès tâche |
| `task_workload_allocations` | Allocations charge | DG/Head/Owner |
| `task_status_history` | Audit trail | Lecture si accès tâche |
| `task_deadline_changes` | Changements deadlines | Lecture si accès tâche |
| `task_blockers` | Blocages déclarés | Lecture si accès tâche |
| `task_approvals` | Décisions d'approbation | Lecture si accès tâche |
| `task_comments` | Commentaires | Lecture si accès tâche |
| `task_attachments` | Fichiers attachés | Lecture si accès tâche |
| `notifications` | Notifications in-app | Own seulement |
| `ai_alerts` | Alertes IA | DG/Admin/Head/concerné |
| `kpi_snapshots` | Snapshots KPI | DG/Admin |
| `bonus_scores` | Scores bonus | Own + DG/Admin |
| `settings` | Paramètres système | Lecture publique ; modif DG/Admin |

### Exemples d'utilisation

**Lecture filtrée :**
```ts
const { data } = await supabase
  .from('tasks')
  .select('*, owner:profiles!tasks_owner_id_fkey(full_name)')
  .eq('priority', 'P1')
  .eq('status', 'active');
```

**Insertion :**
```ts
const { data, error } = await supabase
  .from('task_comments')
  .insert({
    task_id: 'xxx',
    author_id: profile.id,
    content: 'Commentaire'
  });
```

**Mise à jour :**
```ts
await supabase
  .from('tasks')
  .update({ status: 'active' })
  .eq('id', taskId);
```

**Real-time (changements live) :**
```ts
supabase
  .channel('tasks-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' },
    (payload) => console.log('Change!', payload))
  .subscribe();
```

---

## 4. Vues Supabase

### `v_tasks_overdue`
Toutes les tâches en retard avec détails owner/entité/département.

```ts
const { data } = await supabase.from('v_tasks_overdue').select('*');
```

### `v_dg_dashboard`
KPIs agrégés pour le tableau de bord DG.

Champs :
- `tasks_open`, `p1_open`, `p1_overdue`
- `not_accepted`, `in_negotiation`, `blocked`
- `awaiting_approval`, `rejected_closures`

```ts
const { data } = await supabase.from('v_dg_dashboard').select('*').single();
```

---

## 5. Fonctions RPC

### `get_user_workload(p_user_id, p_start_date, p_end_date)`

Calcule la charge réelle d'un utilisateur sur une période.

```ts
const { data: workload } = await supabase.rpc('get_user_workload', {
  p_user_id: 'uuid',
  p_start_date: '2026-05-01',
  p_end_date: '2026-05-31'
});
// → 87.5
```

### Helpers RLS (interne)

Fonctions utilisées en interne par les policies — non destinées à appel direct :
- `current_profile_id()` → uuid
- `current_role_value()` → user_role
- `current_department_id()` → uuid
- `is_dg_or_admin()` → boolean
- `is_head()` → boolean

---

## 6. Edge Functions à implémenter (Phase 5)

Edge Functions Supabase Deno à déployer pour activer l'IA et les automatismes.

### 6.1 `ai-analyze-task`
**Trigger :** Insertion `tasks` (priorité P1/P2) via webhook DB.
**Action :** Appelle Claude API pour calculer `ai_risk_score`, `ai_summary` et stocker dans `tasks`.

### 6.2 `ai-suggest-milestones`
**Trigger :** Insertion ou update `tasks` où durée prévue > 10 jours.
**Action :** Demande à Claude une suggestion de découpe en milestones (3-5 jalons).

### 6.3 `ai-detect-overload`
**Trigger :** Cron quotidien (Supabase Cron Jobs).
**Action :** Pour chaque user, calcule charge sur 30 jours glissants. Si > 150% pendant > 3 mois → insère `ai_alerts` avec sévérité `critical`.

### 6.4 `ai-escalate-blockers`
**Trigger :** Cron toutes les 4 heures.
**Action :** Détecte `task_blockers` avec `status = 'open'` depuis plus de 72h sur P1/P2 → notifie DG + insère `ai_alerts`.

### 6.5 `ai-daily-digest`
**Trigger :** Cron à 8h chaque jour.
**Action :** Pour chaque DG/Head : compile top 5 risques (P1 retard, blocages, surcharges, non-acceptations) et envoie email via Resend.

### 6.6 `notification-email-send`
**Trigger :** Insertion `notifications` (webhook DB).
**Action :** Si `email_sent = false`, envoie email via Resend, met `email_sent = true`.

### 6.7 `nightly-kpi-snapshot`
**Trigger :** Cron à 2h du matin.
**Action :** Calcule KPI globaux, par entité, par département → insère dans `kpi_snapshots`.

### 6.8 `monthly-bonus-scoring`
**Trigger :** Cron 1er du mois à 3h.
**Action :** Pour chaque user, calcule scores du mois précédent (deadline, qualité, réactivité, etc.) pondérés par complexité → insère dans `bonus_scores`.

---

## 7. Webhooks (Phase 4)

### Hook DB → Edge Function

Activer dans **Database → Webhooks** :

| Table | Event | URL |
|---|---|---|
| `tasks` (P1/P2 only) | INSERT | `https://<project>.functions.supabase.co/ai-analyze-task` |
| `notifications` | INSERT | `https://<project>.functions.supabase.co/notification-email-send` |
| `task_blockers` (P1/P2) | INSERT | `https://<project>.functions.supabase.co/ai-escalate-blockers` |

---

## 📊 Résumé des endpoints

| Type | Quantité |
|---|---|
| Routes API Next.js | 5 |
| Tables Supabase exposées | 21 |
| Vues SQL | 2 |
| Fonctions RPC | 1 publique + 5 helpers RLS |
| Edge Functions à créer | 8 |

**Stack complète disponible immédiatement** dès l'exécution des scripts SQL.
**Edge Functions et webhooks** = phase 4-5 d'évolution.
