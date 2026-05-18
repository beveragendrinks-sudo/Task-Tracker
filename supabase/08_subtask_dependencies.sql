-- =====================================================================
-- Dépendances entre sous-tâches
-- Une sous-tâche peut dépendre d'une autre du même parent.
-- Elle ne peut pas passer à "active" tant que la dépendance
-- n'est pas "closed_by_owner" ou "approved".
-- =====================================================================

ALTER TABLE task_subtasks
  ADD COLUMN IF NOT EXISTS depends_on_subtask_id uuid
    REFERENCES task_subtasks(id) ON DELETE SET NULL;
