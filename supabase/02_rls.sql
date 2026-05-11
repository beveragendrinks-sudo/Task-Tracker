-- =====================================================================
-- TASK ENGINE — Row Level Security
-- À exécuter APRÈS 01_schema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ACTIVATION RLS
-- ---------------------------------------------------------------------
alter table profiles               enable row level security;
alter table entities               enable row level security;
alter table departments            enable row level security;
alter table user_departments       enable row level security;
alter table tasks                  enable row level security;
alter table task_entities          enable row level security;
alter table task_departments       enable row level security;
alter table task_contributors      enable row level security;
alter table task_milestones        enable row level security;
alter table task_subtasks          enable row level security;
alter table task_comments          enable row level security;
alter table task_attachments       enable row level security;
alter table task_status_history    enable row level security;
alter table task_deadline_changes  enable row level security;
alter table task_workload_allocations enable row level security;
alter table task_blockers          enable row level security;
alter table task_approvals         enable row level security;
alter table notifications          enable row level security;
alter table ai_alerts              enable row level security;
alter table kpi_snapshots          enable row level security;
alter table bonus_scores           enable row level security;
alter table settings               enable row level security;

-- ---------------------------------------------------------------------
-- 2. FONCTIONS HELPER (SECURITY DEFINER)
-- ---------------------------------------------------------------------

create or replace function current_profile_id()
returns uuid as $$
  select id from profiles where auth_user_id = auth.uid() limit 1;
$$ language sql stable security definer;

create or replace function current_role_value()
returns user_role as $$
  select role from profiles where auth_user_id = auth.uid() limit 1;
$$ language sql stable security definer;

create or replace function current_department_id()
returns uuid as $$
  select department_id from profiles where auth_user_id = auth.uid() limit 1;
$$ language sql stable security definer;

create or replace function is_dg_or_admin()
returns boolean as $$
  select coalesce(
    (select role in ('general_manager', 'admin') from profiles where auth_user_id = auth.uid()),
    false
  );
$$ language sql stable security definer;

create or replace function is_head()
returns boolean as $$
  select coalesce(
    (select role = 'head_of_department' from profiles where auth_user_id = auth.uid()),
    false
  );
$$ language sql stable security definer;

-- ---------------------------------------------------------------------
-- 3. PROFILES
-- ---------------------------------------------------------------------
create policy "Lecture profils actifs" on profiles for select using (is_active = true);
create policy "Créer son propre profil" on profiles for insert with check (auth_user_id = auth.uid());
create policy "Modif son profil" on profiles for update using (auth_user_id = auth.uid());
create policy "Admin/DG gère profils" on profiles for all using (is_dg_or_admin());

-- ---------------------------------------------------------------------
-- 4. ENTITIES & DEPARTMENTS
-- ---------------------------------------------------------------------
create policy "Lecture entités" on entities for select using (is_active = true);
create policy "Admin gère entités" on entities for all using (is_dg_or_admin());

create policy "Lecture départements" on departments for select using (is_active = true);
create policy "Admin gère départements" on departments for all using (is_dg_or_admin());

create policy "Lecture user_departments" on user_departments for select using (true);
create policy "Admin gère user_departments" on user_departments for all using (is_dg_or_admin());

-- ---------------------------------------------------------------------
-- 5. TASKS
-- ---------------------------------------------------------------------
create policy "DG/Admin voit toutes tâches" on tasks for select using (is_dg_or_admin());

create policy "Head voit tâches département" on tasks for select
  using (is_head() and primary_department_id = current_department_id());

create policy "Créateur voit ses tâches" on tasks for select
  using (created_by = current_profile_id());

create policy "Owner voit ses tâches" on tasks for select
  using (owner_id = current_profile_id());

create policy "Contributeur voit ses tâches" on tasks for select
  using (exists (select 1 from task_contributors tc where tc.task_id = tasks.id and tc.user_id = current_profile_id()));

create policy "Création tâche" on tasks for insert
  with check (auth.uid() is not null and created_by = current_profile_id());

create policy "DG/Admin modifie tout" on tasks for update using (is_dg_or_admin());

create policy "Créateur modifie ses tâches draft/assigned" on tasks for update
  using (created_by = current_profile_id() and status in ('draft', 'assigned', 'negotiation'));

create policy "Owner met à jour tâche" on tasks for update
  using (owner_id = current_profile_id() and status in (
    'assigned', 'negotiation', 'accepted', 'active', 'pending',
    'on_hold', 'blocked', 'closed_by_owner', 'rejected_closure'
  ));

create policy "Suppression DG/Admin" on tasks for delete using (is_dg_or_admin());

-- ---------------------------------------------------------------------
-- 6. MILESTONES & SUBTASKS & CONTRIBUTORS
-- ---------------------------------------------------------------------
create policy "Lecture milestones" on task_milestones for select
  using (exists (select 1 from tasks t where t.id = task_milestones.task_id));

create policy "Modif milestones" on task_milestones for all using (
  is_dg_or_admin() or exists (
    select 1 from tasks t where t.id = task_milestones.task_id
      and (t.owner_id = current_profile_id() or t.created_by = current_profile_id())
  )
);

create policy "Lecture sous-tâches" on task_subtasks for select
  using (exists (select 1 from tasks t where t.id = task_subtasks.parent_task_id));

create policy "Modif sous-tâches" on task_subtasks for all using (
  is_dg_or_admin() or owner_id = current_profile_id() or exists (
    select 1 from tasks t where t.id = task_subtasks.parent_task_id
      and (t.owner_id = current_profile_id() or t.created_by = current_profile_id())
  )
);

create policy "Lecture contributeurs" on task_contributors for select
  using (exists (select 1 from tasks t where t.id = task_contributors.task_id));

create policy "Gestion contributeurs" on task_contributors for all using (
  is_dg_or_admin() or exists (
    select 1 from tasks t where t.id = task_contributors.task_id
      and (t.owner_id = current_profile_id() or t.created_by = current_profile_id())
  )
);

-- ---------------------------------------------------------------------
-- 7. COMMENTAIRES, FICHIERS
-- ---------------------------------------------------------------------
create policy "Lecture commentaires" on task_comments for select
  using (exists (select 1 from tasks t where t.id = task_comments.task_id));

create policy "Création commentaires" on task_comments for insert
  with check (author_id = current_profile_id());

create policy "Modif ses commentaires" on task_comments for update
  using (author_id = current_profile_id());

create policy "Lecture fichiers" on task_attachments for select
  using (exists (select 1 from tasks t where t.id = task_attachments.task_id));

create policy "Upload fichier" on task_attachments for insert
  with check (uploaded_by = current_profile_id());

create policy "Suppression fichier" on task_attachments for delete
  using (uploaded_by = current_profile_id() or is_dg_or_admin());

-- ---------------------------------------------------------------------
-- 8. AUDIT TRAIL
-- ---------------------------------------------------------------------
create policy "Lecture audit" on task_status_history for select
  using (exists (select 1 from tasks t where t.id = task_status_history.task_id));

create policy "Insertion audit système" on task_status_history for insert with check (true);

create policy "Lecture historique deadlines" on task_deadline_changes for select
  using (exists (select 1 from tasks t where t.id = task_deadline_changes.task_id));

create policy "Création changement deadline" on task_deadline_changes for insert
  with check (
    requested_by = current_profile_id() and exists (
      select 1 from tasks t where t.id = task_id
        and (t.owner_id = current_profile_id() or t.created_by = current_profile_id())
    )
  );

-- ---------------------------------------------------------------------
-- 9. WORKLOAD
-- ---------------------------------------------------------------------
create policy "DG/Admin voit workload" on task_workload_allocations for select using (is_dg_or_admin());

create policy "Head voit workload département" on task_workload_allocations for select using (
  is_head() and exists (
    select 1 from profiles p where p.id = task_workload_allocations.user_id
      and p.department_id = current_department_id()
  )
);

create policy "User voit son workload" on task_workload_allocations for select
  using (user_id = current_profile_id());

create policy "Modif workload" on task_workload_allocations for all using (
  is_dg_or_admin() or user_id = current_profile_id() or exists (
    select 1 from tasks t where t.id = task_workload_allocations.task_id
      and (t.owner_id = current_profile_id() or t.created_by = current_profile_id())
  )
);

-- ---------------------------------------------------------------------
-- 10. BLOCAGES & APPROBATIONS
-- ---------------------------------------------------------------------
create policy "Lecture blocages" on task_blockers for select
  using (exists (select 1 from tasks t where t.id = task_blockers.task_id));

create policy "Déclaration blocage" on task_blockers for insert with check (
  exists (select 1 from tasks t where t.id = task_blockers.task_id and (
    t.owner_id = current_profile_id() or
    exists (select 1 from task_contributors tc where tc.task_id = t.id and tc.user_id = current_profile_id())
  ))
);

create policy "Résolution blocage" on task_blockers for update using (
  is_dg_or_admin() or exists (
    select 1 from tasks t where t.id = task_blockers.task_id
      and (t.owner_id = current_profile_id() or t.created_by = current_profile_id())
  )
);

create policy "Lecture approbations" on task_approvals for select
  using (exists (select 1 from tasks t where t.id = task_approvals.task_id));

create policy "Approbation par créateur/DG" on task_approvals for insert with check (
  decided_by = current_profile_id() and (
    is_dg_or_admin() or exists (
      select 1 from tasks t where t.id = task_approvals.task_id and t.created_by = current_profile_id()
    )
  )
);

-- ---------------------------------------------------------------------
-- 11. NOTIFICATIONS, ALERTES, KPI, BONUS
-- ---------------------------------------------------------------------
create policy "User voit ses notifications" on notifications for select using (user_id = current_profile_id());
create policy "User marque ses notifs lues" on notifications for update using (user_id = current_profile_id());

create policy "DG/Admin voit alertes" on ai_alerts for select using (is_dg_or_admin());
create policy "Head voit alertes département" on ai_alerts for select using (is_head() and related_department_id = current_department_id());
create policy "User voit alertes le concernant" on ai_alerts for select using (related_user_id = current_profile_id());
create policy "DG/Admin gère alertes" on ai_alerts for all using (is_dg_or_admin());

create policy "DG/Admin voit KPI" on kpi_snapshots for select using (is_dg_or_admin());

create policy "User voit son bonus" on bonus_scores for select using (user_id = current_profile_id() or is_dg_or_admin());
create policy "DG/Admin gère scoring" on bonus_scores for all using (is_dg_or_admin());

create policy "Lecture paramètres" on settings for select using (true);
create policy "Admin modifie paramètres" on settings for all using (is_dg_or_admin());

-- =====================================================================
-- FIN RLS — Vérifier : select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- =====================================================================
