-- ============================================================
-- TASK ENGINE v2.1 — MIGRATION (sous-tâches + privacy)
-- À exécuter APRÈS 01_schema.sql et 02_rls.sql
-- Fresh install : 01 → 02 → 03 (optionnel) → 04 → 05
-- Upgrade v2.0→v2.1 : exécuter UNIQUEMENT 04 et 05
-- ============================================================

-- ── 1. TÂCHES : ajout is_private ─────────────────────────────
alter table tasks add column if not exists is_private boolean not null default false;
create index if not exists idx_tasks_private on tasks(is_private) where is_private = true;

-- ── 2. SOUS-TÂCHES : enrichir table existante ────────────────
alter table task_subtasks
  add column if not exists created_by uuid references profiles(id),
  add column if not exists priority task_priority not null default 'P3',
  add column if not exists is_private boolean not null default false,
  add column if not exists accepted_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists rejection_reason text;

create index if not exists idx_subtasks_owner on task_subtasks(owner_id);
create index if not exists idx_subtasks_private on task_subtasks(is_private) where is_private = true;
create index if not exists idx_subtasks_parent on task_subtasks(parent_task_id);

-- ── 3. PERMISSIONS EXPLICITES ────────────────────────────────
create table if not exists task_permissions (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  permission_type text not null default 'viewer' check (permission_type in ('viewer','editor','owner')),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique(task_id, user_id)
);
create index idx_task_perm_user on task_permissions(user_id);
create index idx_task_perm_task on task_permissions(task_id);

create table if not exists subtask_permissions (
  id uuid primary key default uuid_generate_v4(),
  subtask_id uuid not null references task_subtasks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  permission_type text not null default 'viewer' check (permission_type in ('viewer','editor','owner')),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique(subtask_id, user_id)
);
create index idx_subtask_perm_user on subtask_permissions(user_id);
create index idx_subtask_perm_subtask on subtask_permissions(subtask_id);

-- ── 4. COMMENTAIRES / FICHIERS / HISTORIQUE SOUS-TÂCHES ──────
create table if not exists subtask_comments (
  id uuid primary key default uuid_generate_v4(),
  subtask_id uuid not null references task_subtasks(id) on delete cascade,
  author_id uuid not null references profiles(id),
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_subtask_comments_subtask on subtask_comments(subtask_id, created_at desc);
create trigger trg_subtask_comments_updated before update on subtask_comments for each row execute function set_updated_at();

create table if not exists subtask_attachments (
  id uuid primary key default uuid_generate_v4(),
  subtask_id uuid not null references task_subtasks(id) on delete cascade,
  uploaded_by uuid not null references profiles(id),
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz default now()
);
create index idx_subtask_attachments_subtask on subtask_attachments(subtask_id);

create table if not exists subtask_status_history (
  id uuid primary key default uuid_generate_v4(),
  subtask_id uuid not null references task_subtasks(id) on delete cascade,
  from_status task_status,
  to_status task_status not null,
  changed_by uuid references profiles(id),
  reason text,
  created_at timestamptz default now()
);
create index idx_subtask_history on subtask_status_history(subtask_id, created_at desc);

-- ── 5. AUDIT LOG GLOBAL ──────────────────────────────────────
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id),
  user_role user_role,
  action text not null,
  object_type text not null,
  object_id uuid,
  old_value jsonb,
  new_value jsonb,
  reason text,
  ip_address inet,
  user_agent text,
  created_at timestamptz default now()
);
create index idx_audit_user on audit_log(user_id, created_at desc);
create index idx_audit_object on audit_log(object_type, object_id, created_at desc);

-- ── 6. TRIGGERS SOUS-TÂCHES ──────────────────────────────────
create or replace function log_subtask_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into subtask_status_history (subtask_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, new.owner_id);
  end if;
  return new;
end; $$ language plpgsql;
drop trigger if exists trg_subtasks_status_history on task_subtasks;
create trigger trg_subtasks_status_history after update on task_subtasks for each row execute function log_subtask_status_change();

-- Héritage privacy
create or replace function inherit_task_privacy()
returns trigger as $$
declare parent_private boolean;
begin
  if new.is_private is null or new.is_private = false then
    select is_private into parent_private from tasks where id = new.parent_task_id;
    if parent_private = true then new.is_private := true; end if;
  end if;
  return new;
end; $$ language plpgsql;
drop trigger if exists trg_subtasks_inherit_privacy on task_subtasks;
create trigger trg_subtasks_inherit_privacy before insert on task_subtasks for each row execute function inherit_task_privacy();

-- Auto-grant permission au nouvel owner si tâche privée
create or replace function grant_task_owner_permission()
returns trigger as $$
begin
  if new.is_private = true
     and new.owner_id is not null
     and new.owner_id is distinct from old.owner_id then
    insert into task_permissions (task_id, user_id, permission_type, created_by)
    values (new.id, new.owner_id, 'editor', new.owner_id)
    on conflict (task_id, user_id) do update set permission_type = 'editor';
  end if;
  return new;
end; $$ language plpgsql;
drop trigger if exists trg_tasks_owner_permission on tasks;
create trigger trg_tasks_owner_permission after update of owner_id on tasks for each row execute function grant_task_owner_permission();

-- Auto-grant permission sous-tâche au changement d'owner
create or replace function grant_subtask_owner_permission()
returns trigger as $$
begin
  if new.is_private = true
     and new.owner_id is not null
     and new.owner_id is distinct from old.owner_id then
    insert into subtask_permissions (subtask_id, user_id, permission_type, created_by)
    values (new.id, new.owner_id, 'editor', new.owner_id)
    on conflict (subtask_id, user_id) do update set permission_type = 'editor';
  end if;
  return new;
end; $$ language plpgsql;
drop trigger if exists trg_subtasks_owner_permission on task_subtasks;
create trigger trg_subtasks_owner_permission after update of owner_id on task_subtasks for each row execute function grant_subtask_owner_permission();

-- ── 7. AGRÉGATS SOUS-TÂCHES SUR TÂCHE PARENTE ────────────────
create or replace view v_task_subtask_stats as
select
  parent_task_id,
  count(*) as total_subtasks,
  count(*) filter (where status = 'approved') as completed_subtasks,
  count(*) filter (where status in ('accepted','active','pending','on_hold','blocked')) as active_subtasks,
  count(*) filter (where status = 'blocked') as blocked_subtasks,
  count(*) filter (where due_date < now() and status not in ('approved','cancelled')) as overdue_subtasks,
  case
    when count(*) = 0 then 0
    else round(100.0 * count(*) filter (where status = 'approved') / count(*), 0)
  end as progress_percent
from task_subtasks
group by parent_task_id;

-- ── 8. MIGRATION DONNÉES EXISTANTES ──────────────────────────
update task_subtasks s
set created_by = t.created_by
from tasks t
where s.parent_task_id = t.id and s.created_by is null;

-- FIN MIGRATION v2.1 — exécuter ensuite 05_rls_privacy.sql
