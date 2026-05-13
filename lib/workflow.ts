import type { TaskStatus, UserRole } from '@/types/database';

// ===========================================================
// Machine à états : transitions autorisées par rôle
// ===========================================================

export interface Transition {
  from: TaskStatus;
  to: TaskStatus;
  allowedRoles: ('owner' | 'creator' | 'dg' | 'admin')[];
  label: string;
  requiresReason?: boolean;
  requiresDoD?: boolean;
}

export const TRANSITIONS: Transition[] = [
  // Draft → Assigned
  { from: 'draft', to: 'assigned', allowedRoles: ['creator', 'dg', 'admin'], label: 'Envoyer pour acceptation' },

  // Assigned → ...
  { from: 'assigned', to: 'accepted', allowedRoles: ['owner'], label: 'Accepter' },
  { from: 'assigned', to: 'negotiation', allowedRoles: ['owner'], label: 'Demander modification', requiresReason: true },
  { from: 'assigned', to: 'cancelled', allowedRoles: ['creator', 'dg', 'admin'], label: 'Annuler', requiresReason: true },

  // Negotiation → ...
  { from: 'negotiation', to: 'assigned', allowedRoles: ['creator'], label: 'Accepter modification' },
  { from: 'negotiation', to: 'cancelled', allowedRoles: ['creator', 'dg', 'admin'], label: 'Annuler' },

  // Accepted → Active
  { from: 'accepted', to: 'active', allowedRoles: ['owner'], label: 'Démarrer' },
  { from: 'accepted', to: 'cancelled', allowedRoles: ['creator', 'dg', 'admin'], label: 'Annuler' },

  // Active → ...
  { from: 'active', to: 'pending', allowedRoles: ['owner'], label: 'En attente', requiresReason: true },
  { from: 'active', to: 'on_hold', allowedRoles: ['owner', 'dg', 'admin'], label: 'Mettre en pause', requiresReason: true },
  { from: 'active', to: 'blocked', allowedRoles: ['owner'], label: 'Déclarer blocage', requiresReason: true },
  { from: 'active', to: 'closed_by_owner', allowedRoles: ['owner'], label: 'Marquer terminée', requiresDoD: true },

  // Pending → Active / Blocked
  { from: 'pending', to: 'active', allowedRoles: ['owner'], label: 'Reprendre' },
  { from: 'pending', to: 'blocked', allowedRoles: ['owner'], label: 'Déclarer blocage', requiresReason: true },

  // On Hold → Active
  { from: 'on_hold', to: 'active', allowedRoles: ['owner', 'creator', 'dg', 'admin'], label: 'Reprendre' },

  // Blocked → Active
  { from: 'blocked', to: 'active', allowedRoles: ['owner', 'creator', 'dg', 'admin'], label: 'Résoudre blocage' },

  // Closed by Owner → Approved / Rejected
  { from: 'closed_by_owner', to: 'approved', allowedRoles: ['creator'], label: 'Approuver' },
  { from: 'closed_by_owner', to: 'rejected_closure', allowedRoles: ['creator'], label: 'Rejeter clôture', requiresReason: true },

  // Rejected Closure → Active
  { from: 'rejected_closure', to: 'active', allowedRoles: ['owner'], label: 'Corriger' },
  { from: 'rejected_closure', to: 'closed_by_owner', allowedRoles: ['owner'], label: 'Re-clôturer', requiresDoD: true },
];

/**
 * Détermine quelles transitions sont possibles pour un utilisateur sur une tâche
 */
export function getAvailableTransitions(
  task: { status: TaskStatus; owner_id: string | null; created_by: string },
  currentUserId: string,
  currentUserRole: UserRole
): Transition[] {
  return TRANSITIONS.filter(t => {
    if (t.from !== task.status) return false;

    const userRoles: ('owner' | 'creator' | 'dg' | 'admin')[] = [];
    if (task.owner_id === currentUserId) userRoles.push('owner');
    if (task.created_by === currentUserId) userRoles.push('creator');
    if (currentUserRole === 'general_manager') userRoles.push('dg');
    if (currentUserRole === 'admin') userRoles.push('admin');

    return t.allowedRoles.some(r => userRoles.includes(r));
  });
}

/**
 * Vérifie si une transition est autorisée
 */
export function canTransition(
  task: { status: TaskStatus; owner_id: string | null; created_by: string },
  toStatus: TaskStatus,
  currentUserId: string,
  currentUserRole: UserRole
): { allowed: boolean; transition?: Transition; reason?: string } {
  const transitions = getAvailableTransitions(task, currentUserId, currentUserRole);
  const transition = transitions.find(t => t.to === toStatus);

  if (!transition) {
    return { allowed: false, reason: 'Transition non autorisée pour ce rôle ou ce statut.' };
  }

  return { allowed: true, transition };
}
