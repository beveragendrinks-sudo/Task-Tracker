-- ============================================================
-- TASK ENGINE v2.1 — RLS PRIVACY
-- À exécuter APRÈS 04_migration_v2.1.sql
-- ============================================================
-- OBJECTIF : aucun user non autorisé ne peut récupérer le CONTENU
-- (titre, description, commentaires, fichiers, historique) d'une
-- tâche ou sous-tâche privée, même via API directe.
-- ============================================================

alter table task_permissions       enable row level security;
alter table subtask_permissions    enable row level security;
alter table subtask_comments       enable row level security;
alter table subtask_attachments    enable row level security;
alter table subtask_status_history enable row level security;
alter table audit_log              enable row level security;

-- ── FONCTIONS HELPER PRIVACY ─────────────────────────────────

create or replace function can_view_task(p_task_id uuid)
returns boolean as $$
declare
  uid uuid;
  t_record record;
begin
  uid := current_profile_id();
  if uid is null then return false; end if;

  select t.is_private, t.created_by, t.owner_id, t.primary_department_id
  into t_record from tasks t where t.id = p_task_id;
  if not found then return false; end if;

  if t_record.is_private = false then
    return (
      is_dg_or_admin() or
      t_record.created_by = uid or
      t_record.owner_id = uid or
      (is_head() and t_record.primary_department_id = current_department_id()) or
      exists (select 1 from task_contributors tc where tc.task_id = p_task_id and tc.user_id = uid)
    );
  end if;

  -- Tâche PRIVÉE : SEULEMENT créateur, owner, ou permissions explicites
  -- DG/Admin/Head/Contributors n'ont PAS accès sans ajout manuel
  return (
    t_record.created_by = uid or
    t_record.owner_id = uid or
    exists (select 1 from task_permissions tp where tp.task_id = p_task_id and tp.user_id = uid)
  );
end;
$$ language plpgsql stable security definer;

create or replace function can_view_subtask(p_subtask_id uuid)
returns boolean as $$
declare
  uid uuid;
  s_record record;
begin
  uid := current_profile_id();
  if uid is null then return false; end if;

  select s.is_private, s.created_by, s.owner_id, s.parent_task_id
  into s_record from task_subtasks s where s.id = p_subtask_id;
  if not found then return false; end if;

  if s_record.is_private = false then
    return can_view_task(s_record.parent_task_id);
  end if;

  return (
    s_record.created_by = uid or
    s_record.owner_id = uid or
    exists (select 1 from subtask_permissions sp where sp.subtask_id = p_subtask_id and sp.user_id = uid)
  );
end;
$$ language plpgsql stable security definer;

create or replace function can_edit_task(p_task_id uuid)
returns boolean as $$
declare
  uid uuid;
  t_record record;
begin
  uid := current_profile_id();
  if uid is null then return false; end if;
  select t.created_by, t.owner_id into t_record from tasks t where t.id = p_task_id;
  if not found then return false; end if;
  return (
    is_dg_or_admin() or
    t_record.created_by = uid or
    t_record.owner_id = uid or
    exists (select 1 from task_permissions tp where tp.task_id = p_task_id and tp.user_id = uid and tp.permission_type in ('editor','owner'))
  );
end;
$$ language plpgsql stable security definer;

-- ── REMPLACEMENT POLITIQUES TÂCHES ───────────────────────────
drop policy if exists "DG/Admin voit toutes tâches"     on tasks;
drop policy if exists "Head voit tâches département"    on tasks;
drop policy if exists "Créateur voit ses tâches"        on tasks;
drop policy if exists "Owner voit ses tâches"           on tasks;
drop policy if exists "Contributeur voit ses tâches"    on tasks;

create policy "Lecture tâche (privacy)" on tasks for select using (
  (is_private = false and (
    is_dg_or_admin() or
    created_by = current_profile_id() or
    owner_id = current_profile_id() or
    (is_head() and primary_department_id = current_department_id()) or
    exists (select 1 from task_contributors tc where tc.task_id = tasks.id and tc.user_id = current_profile_id()) or
    exists (select 1 from task_permissions tp where tp.task_id = tasks.id and tp.user_id = current_profile_id())
  ))
  or
  (is_private = true and (
    created_by = current_profile_id() or
    owner_id = current_profile_id() or
    exists (select 1 from task_permissions tp where tp.task_id = tasks.id and tp.user_id = current_profile_id())
  ))
);

-- ── COMMENTS, ATTACHMENTS, HISTORY : strict privacy ──────────
drop policy if exists "Lecture commentaires"        on task_comments;
drop policy if exists "Création commentaires"       on task_comments;
create policy "Lecture commentaires (privacy)"  on task_comments for select using (can_view_task(task_id));
create policy "Création commentaire (privacy)"  on task_comments for insert with check (author_id = current_profile_id() and can_view_task(task_id));

drop policy if exists "Lecture fichiers"            on task_attachments;
drop policy if exists "Upload fichier"              on task_attachments;
create policy "Lecture fichiers (privacy)"      on task_attachments for select using (can_view_task(task_id));
create policy "Upload fichier (privacy)"        on task_attachments for insert with check (uploaded_by = current_profile_id() and can_view_task(task_id));

drop policy if exists "Lecture audit"               on task_status_history;
create policy "Lecture audit (privacy)"         on task_status_history for select using (can_view_task(task_id));

drop policy if exists "Lecture historique deadlines" on task_deadline_changes;
create policy "Lecture deadlines (privacy)"     on task_deadline_changes for select using (can_view_task(task_id));

drop policy if exists "Lecture blocages"            on task_blockers;
create policy "Lecture blocages (privacy)"      on task_blockers for select using (can_view_task(task_id));

drop policy if exists "Lecture approbations"        on task_approvals;
create policy "Lecture approbations (privacy)"  on task_approvals for select using (can_view_task(task_id));

drop policy if exists "Lecture contributeurs"       on task_contributors;
create policy "Lecture contributeurs (privacy)" on task_contributors for select using (can_view_task(task_id));

-- Workload : pas de fuite via tâches privées
drop policy if exists "DG/Admin voit workload"            on task_workload_allocations;
drop policy if exists "Head voit workload département"    on task_workload_allocations;
drop policy if exists "User voit son workload"            on task_workload_allocations;
create policy "Workload (own)"      on task_workload_allocations for select using (user_id = current_profile_id());
create policy "Workload (DG/Admin)" on task_workload_allocations for select using (is_dg_or_admin() and (task_id is null or can_view_task(task_id)));
create policy "Workload (Head)"     on task_workload_allocations for select using (is_head() and (task_id is null or can_view_task(task_id)));

-- ── SOUS-TÂCHES : privacy-aware ──────────────────────────────
drop policy if exists "Lecture sous-tâches" on task_subtasks;
drop policy if exists "Modif sous-tâches"   on task_subtasks;

create policy "Lecture sous-tâche (privacy)" on task_subtasks for select using (
  (is_private = false and exists (select 1 from tasks t where t.id = parent_task_id))
  or
  (is_private = true and (
    created_by = current_profile_id() or
    owner_id = current_profile_id() or
    exists (select 1 from subtask_permissions sp where sp.subtask_id = task_subtasks.id and sp.user_id = current_profile_id())
  ))
);

create policy "Création sous-tâche" on task_subtasks for insert with check (
  created_by = current_profile_id() and can_edit_task(parent_task_id)
);

create policy "Modif sous-tâche (privacy)" on task_subtasks for update using (
  is_dg_or_admin() or
  owner_id = current_profile_id() or
  created_by = current_profile_id() or
  exists (select 1 from subtask_permissions sp where sp.subtask_id = task_subtasks.id and sp.user_id = current_profile_id() and sp.permission_type in ('editor','owner'))
);

create policy "Suppression sous-tâche" on task_subtasks for delete using (
  is_dg_or_admin() or created_by = current_profile_id()
);

-- ── COMMENTAIRES / FICHIERS / HISTORIQUE SOUS-TÂCHES ─────────
create policy "Lecture commentaires sous-tâche" on subtask_comments for select using (can_view_subtask(subtask_id));
create policy "Création commentaire sous-tâche" on subtask_comments for insert with check (author_id = current_profile_id() and can_view_subtask(subtask_id));
create policy "Modif son commentaire sous-tâche" on subtask_comments for update using (author_id = current_profile_id());

create policy "Lecture fichiers sous-tâche"  on subtask_attachments for select using (can_view_subtask(subtask_id));
create policy "Upload fichier sous-tâche"    on subtask_attachments for insert with check (uploaded_by = current_profile_id() and can_view_subtask(subtask_id));
create policy "Suppression fichier sous-tâche" on subtask_attachments for delete using (uploaded_by = current_profile_id() or is_dg_or_admin());

create policy "Lecture historique sous-tâche"   on subtask_status_history for select using (can_view_subtask(subtask_id));
create policy "Insertion historique sous-tâche" on subtask_status_history for insert with check (true);

-- ── PERMISSIONS TÂCHES & SOUS-TÂCHES ─────────────────────────
create policy "Lecture permissions" on task_permissions for select using (
  user_id = current_profile_id() or is_dg_or_admin() or
  exists (select 1 from tasks t where t.id = task_id and (t.created_by = current_profile_id() or t.owner_id = current_profile_id()))
);
create policy "Gestion permissions" on task_permissions for all using (
  is_dg_or_admin() or
  exists (select 1 from tasks t where t.id = task_id and (t.created_by = current_profile_id() or t.owner_id = current_profile_id()))
);

create policy "Lecture permissions sous-tâche" on subtask_permissions for select using (
  user_id = current_profile_id() or is_dg_or_admin() or
  exists (select 1 from task_subtasks s where s.id = subtask_id and (s.created_by = current_profile_id() or s.owner_id = current_profile_id()))
);
create policy "Gestion permissions sous-tâche" on subtask_permissions for all using (
  is_dg_or_admin() or
  exists (select 1 from task_subtasks s where s.id = subtask_id and (s.created_by = current_profile_id() or s.owner_id = current_profile_id()))
);

-- ── AUDIT LOG ────────────────────────────────────────────────
create policy "Audit log DG/Admin lit tout" on audit_log for select using (is_dg_or_admin());
create policy "Audit log user lit ses actions" on audit_log for select using (user_id = current_profile_id());
create policy "Audit log insertion" on audit_log for insert with check (true);
-- Pas de UPDATE/DELETE policy : immutable
revoke update, delete on audit_log from authenticated, anon;

-- ── VUES PRIVACY-SAFE (pour cartes masquées dans listes) ─────
create or replace view v_tasks_safe with (security_invoker = true) as
select
  t.id,
  case when can_view_task(t.id) then t.reference else null end as reference,
  case when can_view_task(t.id) then t.title else 'Tâche privée' end as title,
  case when can_view_task(t.id) then t.description else null end as description,
  t.entity_id, t.primary_department_id, t.created_by, t.owner_id,
  t.priority, t.status, t.complexity,
  t.proposed_deadline, t.accepted_deadline, t.start_date_actual,
  t.closed_by_owner_at, t.approved_at,
  t.proposed_workload_percent, t.accepted_workload_percent,
  t.workload_start_date, t.workload_end_date,
  case when can_view_task(t.id) then t.definition_of_done else '[]'::jsonb end as definition_of_done,
  case when can_view_task(t.id) then t.rejection_reason else null end as rejection_reason,
  case when can_view_task(t.id) then t.ai_risk_score else null end as ai_risk_score,
  t.is_private, t.is_locked,
  t.created_at, t.updated_at,
  can_view_task(t.id) as is_authorized
from tasks t;

create or replace view v_subtasks_safe with (security_invoker = true) as
select
  s.id, s.parent_task_id,
  case when can_view_subtask(s.id) then s.title else 'Sous-tâche privée' end as title,
  case when can_view_subtask(s.id) then s.description else null end as description,
  s.owner_id, s.created_by, s.priority, s.status,
  s.due_date, s.workload_percent, s.position,
  s.is_private, s.accepted_at, s.closed_at, s.approved_at, s.cancelled_at,
  case when can_view_subtask(s.id) then s.rejection_reason else null end as rejection_reason,
  s.completed_at, s.created_at, s.updated_at,
  can_view_subtask(s.id) as is_authorized
from task_subtasks s;

grant select on v_tasks_safe to authenticated, anon;
grant select on v_subtasks_safe to authenticated, anon;

-- FIN RLS PRIVACY v2.1
