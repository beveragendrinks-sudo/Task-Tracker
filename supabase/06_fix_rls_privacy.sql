-- ============================================================
-- TASK ENGINE — FIX RLS PRIVACY
-- À exécuter si les tâches n'apparaissent plus après 05_rls_privacy.sql
--
-- CAUSE : 05_rls_privacy.sql a supprimé les anciennes politiques SELECT
-- sur tasks, mais si 04_migration_v2.1.sql n'avait pas encore été exécuté
-- (colonne is_private et table task_permissions absentes), le CREATE POLICY
-- a échoué → la table tasks se retrouve sans aucune politique SELECT → RLS
-- bloque tout accès → liste vide.
--
-- Ce script est idempotent et peut être réexécuté sans risque.
-- ============================================================

-- ── 1. PRÉREQUIS : colonnes et tables nécessaires ─────────────

-- Colonne is_private sur tasks (ajoutée par 04_migration_v2.1.sql)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Colonne is_private sur task_subtasks (ajoutée par 04_migration_v2.1.sql)
ALTER TABLE task_subtasks
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- Table task_permissions (créée par 04_migration_v2.1.sql)
CREATE TABLE IF NOT EXISTS task_permissions (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id         uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_type text NOT NULL DEFAULT 'viewer'
                  CHECK (permission_type IN ('viewer','editor','owner')),
  created_by      uuid REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Table subtask_permissions (créée par 04_migration_v2.1.sql)
CREATE TABLE IF NOT EXISTS subtask_permissions (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subtask_id      uuid NOT NULL REFERENCES task_subtasks(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_type text NOT NULL DEFAULT 'viewer'
                  CHECK (permission_type IN ('viewer','editor','owner')),
  created_by      uuid REFERENCES profiles(id),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(subtask_id, user_id)
);

ALTER TABLE task_permissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtask_permissions ENABLE ROW LEVEL SECURITY;

-- ── 2. FONCTION can_view_task (SECURITY DEFINER — bypass RLS interne) ──

CREATE OR REPLACE FUNCTION can_view_task(p_task_id uuid)
RETURNS boolean AS $$
DECLARE
  uid      uuid;
  t_record record;
BEGIN
  uid := current_profile_id();
  IF uid IS NULL THEN RETURN false; END IF;

  SELECT t.is_private, t.created_by, t.owner_id, t.primary_department_id
    INTO t_record
    FROM tasks t
   WHERE t.id = p_task_id;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Tâche NON privée : accès selon rôle / relation
  IF NOT COALESCE(t_record.is_private, false) THEN
    RETURN (
      is_dg_or_admin()
      OR t_record.created_by = uid
      OR t_record.owner_id   = uid
      OR (is_head() AND t_record.primary_department_id = current_department_id())
      OR EXISTS (SELECT 1 FROM task_contributors tc
                  WHERE tc.task_id = p_task_id AND tc.user_id = uid)
      OR EXISTS (SELECT 1 FROM task_permissions  tp
                  WHERE tp.task_id = p_task_id AND tp.user_id = uid)
    );
  END IF;

  -- Tâche PRIVÉE : uniquement créateur, owner ou permission explicite
  RETURN (
    t_record.created_by = uid
    OR t_record.owner_id = uid
    OR EXISTS (SELECT 1 FROM task_permissions tp
                WHERE tp.task_id = p_task_id AND tp.user_id = uid)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ── 3. RECRÉER LA POLITIQUE SELECT SUR TASKS ──────────────────
--
-- Raison du remplacement : l'ancienne politique de 05_rls_privacy.sql
-- requêtait task_contributors en ligne, déclenchant le RLS de cette
-- table → appel à can_view_task → requête sur tasks (cycle potentiel).
-- Ici on délègue directement à can_view_task (SECURITY DEFINER) pour
-- éviter tout risque de récursion et simplifier la logique.

DROP POLICY IF EXISTS "DG/Admin voit toutes tâches"     ON tasks;
DROP POLICY IF EXISTS "Head voit tâches département"    ON tasks;
DROP POLICY IF EXISTS "Créateur voit ses tâches"        ON tasks;
DROP POLICY IF EXISTS "Owner voit ses tâches"           ON tasks;
DROP POLICY IF EXISTS "Contributeur voit ses tâches"    ON tasks;
DROP POLICY IF EXISTS "Lecture tâche (privacy)"         ON tasks;

CREATE POLICY "Lecture tâche (privacy)" ON tasks FOR SELECT
  USING (can_view_task(id));

-- ── 4. POLITIQUES TASK_PERMISSIONS / SUBTASK_PERMISSIONS ──────

DROP POLICY IF EXISTS "Lecture permissions"  ON task_permissions;
DROP POLICY IF EXISTS "Gestion permissions"  ON task_permissions;

CREATE POLICY "Lecture permissions" ON task_permissions FOR SELECT USING (
  user_id = current_profile_id()
  OR is_dg_or_admin()
  OR EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id
              AND (t.created_by = current_profile_id() OR t.owner_id = current_profile_id()))
);
CREATE POLICY "Gestion permissions" ON task_permissions FOR ALL USING (
  is_dg_or_admin()
  OR EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id
              AND (t.created_by = current_profile_id() OR t.owner_id = current_profile_id()))
);

DROP POLICY IF EXISTS "Lecture permissions sous-tâche"  ON subtask_permissions;
DROP POLICY IF EXISTS "Gestion permissions sous-tâche"  ON subtask_permissions;

CREATE POLICY "Lecture permissions sous-tâche" ON subtask_permissions FOR SELECT USING (
  user_id = current_profile_id()
  OR is_dg_or_admin()
  OR EXISTS (SELECT 1 FROM task_subtasks s WHERE s.id = subtask_id
              AND (s.created_by = current_profile_id() OR s.owner_id = current_profile_id()))
);
CREATE POLICY "Gestion permissions sous-tâche" ON subtask_permissions FOR ALL USING (
  is_dg_or_admin()
  OR EXISTS (SELECT 1 FROM task_subtasks s WHERE s.id = subtask_id
              AND (s.created_by = current_profile_id() OR s.owner_id = current_profile_id()))
);

-- FIN 06_fix_rls_privacy.sql
