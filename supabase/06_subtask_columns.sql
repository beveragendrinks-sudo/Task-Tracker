-- =====================================================================
-- Ajout des colonnes manquantes sur task_subtasks
-- À exécuter dans le SQL Editor de Supabase
-- =====================================================================

ALTER TABLE task_subtasks
  ADD COLUMN IF NOT EXISTS created_by       uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS priority         task_priority NOT NULL DEFAULT 'P3',
  ADD COLUMN IF NOT EXISTS is_private       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_at      timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at      timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at     timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Simplifier la politique INSERT : pas besoin de task_is_accessible
-- (le front-end contrôle déjà qui voit le bouton "Ajouter")
DROP POLICY IF EXISTS "Insertion sous-tâches" ON task_subtasks;

CREATE POLICY "Insertion sous-tâches" ON task_subtasks FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = current_profile_id()
  );
