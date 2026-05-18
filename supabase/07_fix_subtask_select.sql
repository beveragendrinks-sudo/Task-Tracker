-- =====================================================================
-- Recrée la politique SELECT sur task_subtasks
-- (la version dans 05_fix_subtask_rls.sql avait échoué car la colonne
--  created_by n'existait pas encore au moment de l'exécution)
-- À exécuter dans le SQL Editor de Supabase
-- =====================================================================

-- Noms des politiques créées par 05_fix_subtask_rls.sql et 07 lui-même
DROP POLICY IF EXISTS "Lecture sous-tâches"     ON task_subtasks;
DROP POLICY IF EXISTS "Modif sous-tâches"        ON task_subtasks;
DROP POLICY IF EXISTS "Insertion sous-tâches"    ON task_subtasks;
DROP POLICY IF EXISTS "Suppression sous-tâches"  ON task_subtasks;
-- Noms alternatifs créés par 05_rls_privacy.sql (toujours actifs → cycle RLS)
DROP POLICY IF EXISTS "Lecture sous-tâche (privacy)"  ON task_subtasks;
DROP POLICY IF EXISTS "Modif sous-tâche (privacy)"    ON task_subtasks;
DROP POLICY IF EXISTS "Création sous-tâche"            ON task_subtasks;
DROP POLICY IF EXISTS "Suppression sous-tâche"         ON task_subtasks;

-- SELECT : responsable, créateur, ou accès à la tâche parente
CREATE POLICY "Lecture sous-tâches" ON task_subtasks FOR SELECT
  USING (
    owner_id      = current_profile_id()
    OR created_by = current_profile_id()
    OR task_is_accessible(parent_task_id)
  );

-- INSERT : utilisateur connecté, created_by doit être lui-même
CREATE POLICY "Insertion sous-tâches" ON task_subtasks FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = current_profile_id()
  );

-- UPDATE : responsable, créateur, ou accès via tâche parente
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
