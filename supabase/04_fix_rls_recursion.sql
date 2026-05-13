-- =====================================================================
-- FIX — Infinite recursion in RLS policies
-- Cause : tasks ← → task_contributors cycle
--   "Contributeur voit ses tâches" (tasks)  queries task_contributors
--   "Lecture contributeurs" (task_contributors) queries tasks  → loop
-- Fix  : use a SECURITY DEFINER function to bypass RLS for cross-table
--         checks on tasks.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SECURITY DEFINER helper — reads tasks + task_contributors without RLS
-- ---------------------------------------------------------------------
create or replace function task_is_accessible(p_task_id uuid)
returns boolean as $$
  declare
    v_profile_id uuid;
    v_role       text;
  begin
    select id, role::text
      into v_profile_id, v_role
      from profiles
     where auth_user_id = auth.uid()
     limit 1;

    return exists (
      select 1 from tasks t
       where t.id = p_task_id
         and (
               v_role in ('general_manager', 'admin')
            or t.created_by = v_profile_id
            or t.owner_id   = v_profile_id
            or exists (
                 select 1 from task_contributors tc
                  where tc.task_id  = p_task_id
                    and tc.user_id  = v_profile_id
               )
         )
    );
  end;
$$ language plpgsql stable security definer;

-- ---------------------------------------------------------------------
-- 2. task_contributors  (was querying tasks → broke the cycle)
-- ---------------------------------------------------------------------
drop policy if exists "Lecture contributeurs"  on task_contributors;
drop policy if exists "Gestion contributeurs"  on task_contributors;

create policy "Lecture contributeurs" on task_contributors for select
  using (task_is_accessible(task_id));

create policy "Gestion contributeurs" on task_contributors for all
  using (task_is_accessible(task_id));

-- ---------------------------------------------------------------------
-- 3. task_milestones
-- ---------------------------------------------------------------------
drop policy if exists "Lecture milestones" on task_milestones;
drop policy if exists "Modif milestones"   on task_milestones;

create policy "Lecture milestones" on task_milestones for select
  using (task_is_accessible(task_id));

create policy "Modif milestones" on task_milestones for all
  using (task_is_accessible(task_id));

-- ---------------------------------------------------------------------
-- 4. task_subtasks
-- ---------------------------------------------------------------------
drop policy if exists "Lecture sous-tâches" on task_subtasks;
drop policy if exists "Modif sous-tâches"   on task_subtasks;

create policy "Lecture sous-tâches" on task_subtasks for select
  using (task_is_accessible(parent_task_id));

create policy "Modif sous-tâches" on task_subtasks for all
  using (
    is_dg_or_admin()
    or owner_id = current_profile_id()
    or task_is_accessible(parent_task_id)
  );

-- ---------------------------------------------------------------------
-- 5. task_comments
-- ---------------------------------------------------------------------
drop policy if exists "Lecture commentaires" on task_comments;

create policy "Lecture commentaires" on task_comments for select
  using (task_is_accessible(task_id));

-- ---------------------------------------------------------------------
-- 6. task_attachments
-- ---------------------------------------------------------------------
drop policy if exists "Lecture fichiers" on task_attachments;

create policy "Lecture fichiers" on task_attachments for select
  using (task_is_accessible(task_id));

-- ---------------------------------------------------------------------
-- 7. task_status_history
-- ---------------------------------------------------------------------
drop policy if exists "Lecture audit" on task_status_history;

create policy "Lecture audit" on task_status_history for select
  using (task_is_accessible(task_id));

-- ---------------------------------------------------------------------
-- 8. task_deadline_changes
-- ---------------------------------------------------------------------
drop policy if exists "Lecture historique deadlines"    on task_deadline_changes;
drop policy if exists "Création changement deadline"    on task_deadline_changes;

create policy "Lecture historique deadlines" on task_deadline_changes for select
  using (task_is_accessible(task_id));

create policy "Création changement deadline" on task_deadline_changes for insert
  with check (
    requested_by = current_profile_id()
    and task_is_accessible(task_id)
  );

-- ---------------------------------------------------------------------
-- 9. task_workload_allocations
-- ---------------------------------------------------------------------
drop policy if exists "Modif workload" on task_workload_allocations;

create policy "Modif workload" on task_workload_allocations for all
  using (
    is_dg_or_admin()
    or user_id = current_profile_id()
    or task_is_accessible(task_id)
  );

-- ---------------------------------------------------------------------
-- 10. task_blockers
-- ---------------------------------------------------------------------
drop policy if exists "Lecture blocages"     on task_blockers;
drop policy if exists "Déclaration blocage"  on task_blockers;
drop policy if exists "Résolution blocage"   on task_blockers;

create policy "Lecture blocages" on task_blockers for select
  using (task_is_accessible(task_id));

create policy "Déclaration blocage" on task_blockers for insert
  with check (task_is_accessible(task_id));

create policy "Résolution blocage" on task_blockers for update
  using (is_dg_or_admin() or task_is_accessible(task_id));

-- ---------------------------------------------------------------------
-- 11. task_approvals
-- ---------------------------------------------------------------------
drop policy if exists "Lecture approbations"         on task_approvals;
drop policy if exists "Approbation par créateur/DG"  on task_approvals;

create policy "Lecture approbations" on task_approvals for select
  using (task_is_accessible(task_id));

create policy "Approbation par créateur/DG" on task_approvals for insert
  with check (
    decided_by = current_profile_id()
    and (is_dg_or_admin() or task_is_accessible(task_id))
  );

-- =====================================================================
-- END FIX
-- =====================================================================
