-- =====================================================================
-- TASK ENGINE — Schéma Supabase / PostgreSQL
-- Version : 1.0
-- =====================================================================
-- Application de gestion des tâches multi-entités
-- À exécuter dans Supabase SQL Editor avant 02_rls.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 2. TYPES ÉNUMÉRÉS
-- ---------------------------------------------------------------------
create type user_role as enum (
  'general_manager', 'admin', 'head_of_department',
  'manager', 'task_owner', 'contributor'
);

create type task_priority as enum ('P1', 'P2', 'P3', 'P4');
create type task_complexity as enum ('simple', 'medium', 'complex', 'strategic');

create type task_status as enum (
  'draft', 'assigned', 'negotiation', 'accepted', 'active',
  'pending', 'on_hold', 'blocked',
  'closed_by_owner', 'rejected_closure', 'approved', 'cancelled'
);

create type milestone_status as enum ('pending', 'in_progress', 'done', 'overdue', 'cancelled');

create type blocker_type as enum (
  'awaiting_validation', 'awaiting_document', 'awaiting_supplier',
  'awaiting_information', 'priority_conflict', 'resource_lack',
  'technical_issue', 'financial_issue', 'legal_issue', 'other'
);

create type blocker_status as enum ('open', 'escalated', 'resolved', 'cancelled');
create type alert_severity as enum ('info', 'warning', 'critical');
create type alert_status as enum ('open', 'acknowledged', 'resolved', 'dismissed');

create type notification_type as enum (
  'task_assigned', 'task_to_accept', 'change_requested', 'deadline_changed',
  'deadline_accepted', 'task_activated', 'task_blocked', 'task_overdue',
  'milestone_overdue', 'task_closed', 'closure_approved', 'closure_rejected',
  'task_cancelled', 'workload_overload', 'workload_underload',
  'p1_overdue', 'arbitration_required', 'dg_daily_summary'
);

-- ---------------------------------------------------------------------
-- 3. TABLES DE RÉFÉRENCE
-- ---------------------------------------------------------------------

create table entities (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  is_group_level boolean default false,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role user_role not null default 'task_owner',
  job_title text,
  entity_id uuid references entities(id),
  department_id uuid references departments(id),
  manager_id uuid references profiles(id),
  capacity_percent integer default 100,
  is_active boolean default true,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table user_departments (
  user_id uuid references profiles(id) on delete cascade,
  department_id uuid references departments(id) on delete cascade,
  is_primary boolean default false,
  created_at timestamptz default now(),
  primary key (user_id, department_id)
);

-- ---------------------------------------------------------------------
-- 4. TABLES TÂCHES
-- ---------------------------------------------------------------------

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  reference text unique,
  title text not null,
  description text not null,
  entity_id uuid not null references entities(id),
  primary_department_id uuid references departments(id),
  created_by uuid not null references profiles(id),
  owner_id uuid references profiles(id),
  priority task_priority not null default 'P3',
  complexity task_complexity not null default 'medium',
  status task_status not null default 'draft',
  proposed_deadline timestamptz,
  accepted_deadline timestamptz,
  start_date_planned date,
  start_date_actual timestamptz,
  closed_by_owner_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  proposed_workload_percent numeric(5,2),
  accepted_workload_percent numeric(5,2),
  workload_start_date date,
  workload_end_date date,
  definition_of_done jsonb default '[]'::jsonb,
  rejection_reason text,
  cancellation_reason text,
  closure_proof_url text,
  ai_risk_score numeric(3,2),
  ai_summary text,
  ai_suggestions jsonb,
  is_locked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table task_entities (
  task_id uuid references tasks(id) on delete cascade,
  entity_id uuid references entities(id) on delete cascade,
  primary key (task_id, entity_id)
);

create table task_departments (
  task_id uuid references tasks(id) on delete cascade,
  department_id uuid references departments(id) on delete cascade,
  primary key (task_id, department_id)
);

create table task_contributors (
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  added_at timestamptz default now(),
  added_by uuid references profiles(id),
  primary key (task_id, user_id)
);

create table task_milestones (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  title text not null,
  description text,
  owner_id uuid references profiles(id),
  due_date timestamptz not null,
  status milestone_status default 'pending',
  proof_required boolean default false,
  proof_url text,
  completed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references profiles(id),
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table task_subtasks (
  id uuid primary key default uuid_generate_v4(),
  parent_task_id uuid not null references tasks(id) on delete cascade,
  title text not null,
  description text,
  owner_id uuid references profiles(id),
  due_date timestamptz,
  status task_status default 'assigned',
  workload_percent numeric(5,2),
  completed_at timestamptz,
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 5. TABLES WORKFLOW & TRAÇABILITÉ
-- ---------------------------------------------------------------------

create table task_workload_allocations (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id),
  workload_percent numeric(5,2) not null,
  start_date date not null,
  end_date date not null,
  source text default 'task',
  accepted_by_user boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table task_status_history (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  from_status task_status,
  to_status task_status not null,
  changed_by uuid references profiles(id),
  reason text,
  metadata jsonb,
  created_at timestamptz default now()
);

create table task_deadline_changes (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  old_deadline timestamptz,
  new_deadline timestamptz not null,
  requested_by uuid references profiles(id),
  approved_by uuid references profiles(id),
  reason text not null,
  approved boolean default false,
  created_at timestamptz default now()
);

create table task_blockers (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  blocker_type blocker_type not null,
  blocked_by_user_id uuid references profiles(id),
  blocked_by_department_id uuid references departments(id),
  description text not null,
  impact text,
  action_required text not null,
  escalation_required boolean default false,
  escalation_level integer default 0,
  started_at timestamptz default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id),
  resolution_note text,
  status blocker_status default 'open',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table task_approvals (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  decision text not null check (decision in ('approved', 'rejected')),
  decided_by uuid not null references profiles(id),
  decision_note text,
  rework_required text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 6. COMMENTAIRES, FICHIERS, NOTIFICATIONS
-- ---------------------------------------------------------------------

create table task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_id uuid not null references profiles(id),
  content text not null,
  is_system boolean default false,
  parent_comment_id uuid references task_comments(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table task_attachments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  uploaded_by uuid not null references profiles(id),
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  is_proof boolean default false,
  related_milestone_id uuid references task_milestones(id),
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  message text not null,
  task_id uuid references tasks(id) on delete cascade,
  related_user_id uuid references profiles(id),
  is_read boolean default false,
  read_at timestamptz,
  email_sent boolean default false,
  email_sent_at timestamptz,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 7. KPI, ALERTES IA, BONUS
-- ---------------------------------------------------------------------

create table ai_alerts (
  id uuid primary key default uuid_generate_v4(),
  alert_type text not null,
  severity alert_severity default 'warning',
  title text not null,
  message text not null,
  related_task_id uuid references tasks(id) on delete cascade,
  related_user_id uuid references profiles(id),
  related_department_id uuid references departments(id),
  related_entity_id uuid references entities(id),
  recommendations jsonb,
  status alert_status default 'open',
  acknowledged_by uuid references profiles(id),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create table kpi_snapshots (
  id uuid primary key default uuid_generate_v4(),
  scope text not null,
  scope_id uuid,
  period_start date not null,
  period_end date not null,
  metrics jsonb not null,
  created_at timestamptz default now()
);

create table bonus_scores (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  deadline_score numeric(5,2),
  quality_score numeric(5,2),
  responsiveness_score numeric(5,2),
  transparency_score numeric(5,2),
  priority_score numeric(5,2),
  contribution_score numeric(5,2),
  global_score numeric(5,2),
  complexity_multiplier numeric(4,2),
  tasks_count integer,
  details jsonb,
  created_at timestamptz default now(),
  unique(user_id, period_start, period_end)
);

create table settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references profiles(id),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 8. INDEXES PERFORMANCE
-- ---------------------------------------------------------------------
create index idx_tasks_owner on tasks(owner_id) where status not in ('approved', 'cancelled');
create index idx_tasks_creator on tasks(created_by);
create index idx_tasks_status on tasks(status);
create index idx_tasks_priority on tasks(priority);
create index idx_tasks_deadline on tasks(accepted_deadline) where status not in ('approved', 'cancelled');
create index idx_tasks_entity on tasks(entity_id);
create index idx_tasks_dept on tasks(primary_department_id);

create index idx_milestones_task on task_milestones(task_id);
create index idx_milestones_owner on task_milestones(owner_id);
create index idx_subtasks_parent on task_subtasks(parent_task_id);
create index idx_workload_user_dates on task_workload_allocations(user_id, start_date, end_date);
create index idx_status_history_task on task_status_history(task_id, created_at desc);
create index idx_blockers_task on task_blockers(task_id) where status = 'open';
create index idx_notifications_user on notifications(user_id, is_read, created_at desc);
create index idx_alerts_open on ai_alerts(status, severity, created_at desc) where status = 'open';
create index idx_comments_task on task_comments(task_id, created_at);

-- ---------------------------------------------------------------------
-- 9. TRIGGERS — updated_at
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_entities_updated before update on entities for each row execute function set_updated_at();
create trigger trg_departments_updated before update on departments for each row execute function set_updated_at();
create trigger trg_profiles_updated before update on profiles for each row execute function set_updated_at();
create trigger trg_tasks_updated before update on tasks for each row execute function set_updated_at();
create trigger trg_milestones_updated before update on task_milestones for each row execute function set_updated_at();
create trigger trg_subtasks_updated before update on task_subtasks for each row execute function set_updated_at();
create trigger trg_workload_updated before update on task_workload_allocations for each row execute function set_updated_at();
create trigger trg_blockers_updated before update on task_blockers for each row execute function set_updated_at();
create trigger trg_comments_updated before update on task_comments for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 10. TRIGGER — Auto P1 si DG
-- ---------------------------------------------------------------------
create or replace function auto_p1_for_dg()
returns trigger as $$
declare creator_role user_role;
begin
  if new.priority is null then
    select role into creator_role from profiles where id = new.created_by;
    if creator_role = 'general_manager' then new.priority := 'P1'; end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_tasks_auto_p1 before insert on tasks for each row execute function auto_p1_for_dg();

-- ---------------------------------------------------------------------
-- 11. TRIGGER — Audit trail automatique
-- ---------------------------------------------------------------------
create or replace function log_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into task_status_history (task_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, new.owner_id);
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_tasks_status_history after update on tasks for each row execute function log_status_change();

-- ---------------------------------------------------------------------
-- 12. TRIGGER — Génération référence tâche
-- ---------------------------------------------------------------------
create sequence if not exists task_reference_seq;

create or replace function generate_task_reference()
returns trigger as $$
begin
  if new.reference is null then
    new.reference := 'TSK-' || to_char(now(), 'YYYY') || '-' ||
                     lpad(nextval('task_reference_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_tasks_reference before insert on tasks for each row execute function generate_task_reference();

-- ---------------------------------------------------------------------
-- 13. TRIGGER — Création profil automatique à l'inscription
-- ---------------------------------------------------------------------
create or replace function handle_new_auth_user()
returns trigger as $$
begin
  insert into public.profiles (auth_user_id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'task_owner'
  );
  return new;
exception when others then
  -- Ne pas bloquer la création du compte auth en cas d'erreur
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ---------------------------------------------------------------------
-- 14. FONCTION — Calcul workload utilisateur
-- ---------------------------------------------------------------------
create or replace function get_user_workload(
  p_user_id uuid, p_start_date date, p_end_date date
) returns numeric as $$
declare total_workload numeric;
begin
  select coalesce(sum(
    workload_percent *
    (least(end_date, p_end_date) - greatest(start_date, p_start_date) + 1)::numeric /
    (p_end_date - p_start_date + 1)::numeric
  ), 0)
  into total_workload
  from task_workload_allocations
  where user_id = p_user_id
    and start_date <= p_end_date
    and end_date >= p_start_date
    and accepted_by_user = true;
  return total_workload;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- 15. VUES UTILES
-- ---------------------------------------------------------------------
create or replace view v_tasks_overdue as
select t.*, extract(day from now() - t.accepted_deadline) as days_overdue,
       p.full_name as owner_name, e.name as entity_name, d.name as department_name
from tasks t
left join profiles p on p.id = t.owner_id
left join entities e on e.id = t.entity_id
left join departments d on d.id = t.primary_department_id
where t.accepted_deadline < now()
  and t.status in ('accepted', 'active', 'pending', 'blocked');

create or replace view v_dg_dashboard as
select
  count(*) filter (where status not in ('approved', 'cancelled')) as tasks_open,
  count(*) filter (where priority = 'P1' and status not in ('approved', 'cancelled')) as p1_open,
  count(*) filter (where priority = 'P1' and accepted_deadline < now()
                       and status in ('accepted','active','pending','blocked')) as p1_overdue,
  count(*) filter (where status = 'assigned') as not_accepted,
  count(*) filter (where status = 'negotiation') as in_negotiation,
  count(*) filter (where status = 'blocked') as blocked,
  count(*) filter (where status = 'closed_by_owner') as awaiting_approval,
  count(*) filter (where status = 'rejected_closure') as rejected_closures
from tasks;

-- ---------------------------------------------------------------------
-- 16. PARAMÈTRES PAR DÉFAUT
-- ---------------------------------------------------------------------
insert into settings (key, value, description) values
  ('workload.threshold_overload', '150', 'Seuil surcharge critique %'),
  ('workload.overload_alert_months', '3', 'Durée surcharge avant alerte critique'),
  ('escalation.blocker_dg_hours', '72', 'Délai notification DG (P1/P2)'),
  ('acceptance.max_hours_before_alert', '48', 'Délai max acceptation avant alerte'),
  ('milestones.recommend_days', '10', 'Tâche > N jours = recommander milestones'),
  ('bonus.weight_deadline', '30', 'Poids respect deadlines'),
  ('bonus.weight_quality', '25', 'Poids qualité (no rework)'),
  ('bonus.weight_responsiveness', '10', 'Poids réactivité'),
  ('bonus.weight_transparency', '15', 'Poids transparence'),
  ('bonus.weight_priority', '10', 'Poids respect priorités'),
  ('bonus.weight_contribution', '10', 'Poids contribution')
on conflict (key) do nothing;

-- =====================================================================
-- FIN DU SCHÉMA — Étape suivante : exécuter 02_rls.sql
-- =====================================================================
