import type { Task, Subtask, Profile, TaskPermission, SubtaskPermission, UserRole } from '@/types/database';

/**
 * Vérifie si l'utilisateur peut voir le CONTENU d'une tâche (côté client).
 * ⚠ Vérification UI uniquement — la sécurité réelle est dans le RLS Supabase.
 */
export function canViewTaskClient(
  task: Pick<Task, 'is_private'|'created_by'|'owner_id'>,
  userId: string,
  userRole: UserRole,
  permissions: TaskPermission[] = []
): boolean {
  if (!task.is_private) return true;
  if (task.created_by === userId) return true;
  if (task.owner_id === userId) return true;
  return permissions.some(p => p.user_id === userId);
}

export function canViewSubtaskClient(
  subtask: Pick<Subtask, 'is_private'|'created_by'|'owner_id'>,
  parentTask: Pick<Task, 'is_private'|'created_by'|'owner_id'>,
  userId: string,
  userRole: UserRole,
  subtaskPerms: SubtaskPermission[] = [],
  parentTaskPerms: TaskPermission[] = []
): boolean {
  if (!subtask.is_private) {
    return canViewTaskClient(parentTask, userId, userRole, parentTaskPerms);
  }
  if (subtask.created_by === userId) return true;
  if (subtask.owner_id === userId) return true;
  return subtaskPerms.some(p => p.user_id === userId);
}

/**
 * Renvoie le titre à afficher (avec masking si nécessaire).
 */
export function displayTitle(item: { title: string; is_private: boolean; is_authorized?: boolean }, isSubtask = false): string {
  if (item.is_private && item.is_authorized === false) {
    return isSubtask ? 'Sous-tâche privée' : 'Tâche privée';
  }
  return item.title;
}

/**
 * Détecte si on doit afficher la carte masquée.
 */
export function shouldMask(item: { is_private: boolean; is_authorized?: boolean }): boolean {
  return item.is_private && item.is_authorized === false;
}
