-- =====================================================================
-- FIX COMPLET — Récursion infinie dans task_subtasks / task_contributors
-- À exécuter dans le SQL Editor de Supabase
-- =====================================================================
-- Cause : task_subtasks → tasks (RLS) → task_contributors (RLS) → tasks (RLS) → ♻
-- Fix   : fonctions SECURITY DEFINER qui bypassent RLS pour les checks croisés

-- ---------------------------------------------------------------------
-- 1. Fonction helper — vérifie l'accès à une tâche SANS déclencher RLS
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION task_is_accessible(p_task_id uuid)
RETURNS boolean AS $$
  DECLARE
    v_profile_id uuid;
    v_role       text;
  BEGIN
    SELECT id, role::text
      INTO v_profile_id, v_role
      FROM profiles
     WHERE auth_user_id = auth.uid()
     LIMIT 1;

    IF v_profile_id IS NULL THEN RETURN false; END IF;

    RETURN EXISTS (
      SELECT 1 FROM tasks t
       WHERE t.id = p_task_id
         AND (
               v_role IN ('general_manager', 'admin')
            OR t.created_by = v_profile_id
            OR t.owner_id   = v_profile_id
            OR EXISTS (
                 SELECT 1 FROM task_contributors tc
                  WHERE tc.task_id = p_task_id
                    AND tc.user_id = v_profile_id
               )
         )
    );
  END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 2. task_contributors — rompt le cycle tasks ↔ task_contributors
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Lecture contributeurs" ON task_contributors;
DROP POLICY IF EXISTS "Gestion contributeurs" ON task_contributors;

CREATE POLICY "Lecture contributeurs" ON task_contributors FOR SELECT
  USING (task_is_accessible(task_id));

CREATE POLICY "Gestion contributeurs" ON task_contributors FOR ALL
  USING (task_is_accessible(task_id));

-- ---------------------------------------------------------------------
-- 3. task_milestones
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Lecture milestones" ON task_milestones;
DROP POLICY IF EXISTS "Modif milestones"   ON task_milestones;

CREATE POLICY "Lecture milestones" ON task_milestones FOR SELECT
  USING (task_is_accessible(task_id));

CREATE POLICY "Modif milestones" ON task_milestones FOR ALL
  USING (task_is_accessible(task_id));

-- ---------------------------------------------------------------------
-- 4. task_subtasks — fix principal
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Lecture sous-tâches"   ON task_subtasks;
DROP POLICY IF EXISTS "Modif sous-tâches"      ON task_subtasks;
DROP POLICY IF EXISTS "Insertion sous-tâches"  ON task_subtasks;
DROP POLICY IF EXISTS "Suppression sous-tâches" ON task_subtasks;

-- SELECT : responsable de la sous-tâche, créateur, ou accès à la tâche parente
CREATE POLICY "Lecture sous-tâches" ON task_subtasks FOR SELECT
  USING (
    owner_id      = current_profile_id()
    OR created_by = current_profile_id()
    OR task_is_accessible(parent_task_id)
  );

-- INSERT : doit avoir accès à la tâche parente
CREATE POLICY "Insertion sous-tâches" ON task_subtasks FOR INSERT
  WITH CHECK (
    created_by = current_profile_id()
    AND task_is_accessible(parent_task_id)
  );

-- UPDATE : responsable peut mettre à jour son statut, créateur/DG aussi
CREATE POLICY "Modif sous-tâches" ON task_subtasks FOR UPDATE
  USING (
    is_dg_or_admin()
    OR owner_id      = current_profile_id()
    OR created_by    = current_profile_id()
    OR task_is_accessible(parent_task_id)
  );

-- DELETE : admin/DG ou créateur
CREATE POLICY "Suppression sous-tâches" ON task_subtasks FOR DELETE
  USING (
    is_dg_or_admin()
    OR created_by = current_profile_id()
  );
