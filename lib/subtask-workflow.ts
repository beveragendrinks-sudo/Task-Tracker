import type { TaskStatus, UserRole } from '@/types/database';

// Workflow simplifié MVP pour sous-tâches (8 statuts utiles)
// Statuts utilisés : draft (Backlog), accepted, active, pending, on_hold, blocked, closed_by_owner (Closed), approved, cancelled
// Mapping UI : draft="Backlog", closed_by_owner="Fermée"

export interface SubtaskTransition {
  from: TaskStatus;
  to: TaskStatus;
  allowedRoles: ('owner'|'creator'|'parent_owner'|'parent_creator'|'dg'|'admin')[];
  label: string;
  requiresReason?: boolean;
  tone: 'positive'|'negative'|'neutral';
}

export const SUBTASK_TRANSITIONS: SubtaskTransition[] = [
  // Cycle d'acceptation
  { from:'draft',          to:'accepted',         allowedRoles:['owner'], label:'Accepter', tone:'positive' },
  { from:'draft',          to:'cancelled',        allowedRoles:['creator','parent_owner','dg','admin'], label:'Annuler', tone:'negative', requiresReason:true },

  // Démarrage
  { from:'accepted',       to:'active',           allowedRoles:['owner'], label:'Démarrer', tone:'positive' },
  { from:'accepted',       to:'cancelled',        allowedRoles:['creator','parent_owner','dg','admin'], label:'Annuler', tone:'negative' },

  // En cours
  { from:'active',         to:'on_hold',          allowedRoles:['owner','creator','dg','admin'], label:'Mettre en pause', tone:'neutral', requiresReason:true },
  { from:'active',         to:'blocked',          allowedRoles:['owner','creator'], label:'Déclarer blocage', tone:'negative', requiresReason:true },
  { from:'active',         to:'closed_by_owner',  allowedRoles:['owner','creator'], label:'Marquer terminée', tone:'positive' },

  // Reprise
  { from:'on_hold',        to:'active',           allowedRoles:['owner','creator','dg','admin'], label:'Reprendre', tone:'positive' },
  { from:'blocked',        to:'active',           allowedRoles:['owner','creator','parent_owner','dg','admin'], label:'Résoudre blocage', tone:'positive' },

  // Approbation finale
  { from:'closed_by_owner', to:'approved',        allowedRoles:['creator','parent_owner','parent_creator','dg','admin'], label:'Approuver', tone:'positive' },
  { from:'closed_by_owner', to:'rejected_closure',allowedRoles:['creator','parent_owner','parent_creator','dg','admin'], label:'Rejeter clôture', tone:'negative', requiresReason:true },
  { from:'rejected_closure',to:'active',          allowedRoles:['owner'], label:'Corriger', tone:'neutral' },
  { from:'rejected_closure',to:'closed_by_owner', allowedRoles:['owner'], label:'Re-clôturer', tone:'positive' },
];

interface SubtaskContext {
  status: TaskStatus;
  owner_id: string | null;
  created_by: string;
  parent_owner_id: string | null;
  parent_created_by: string;
}

export function getAvailableSubtaskTransitions(
  ctx: SubtaskContext,
  currentUserId: string,
  currentUserRole: UserRole
): SubtaskTransition[] {
  return SUBTASK_TRANSITIONS.filter(t => {
    if (t.from !== ctx.status) return false;
    const userRoles: ('owner'|'creator'|'parent_owner'|'parent_creator'|'dg'|'admin')[] = [];
    if (ctx.owner_id === currentUserId) userRoles.push('owner');
    if (ctx.created_by === currentUserId) userRoles.push('creator');
    if (ctx.parent_owner_id === currentUserId) userRoles.push('parent_owner');
    if (ctx.parent_created_by === currentUserId) userRoles.push('parent_creator');
    if (currentUserRole === 'general_manager') userRoles.push('dg');
    if (currentUserRole === 'admin') userRoles.push('admin');
    return t.allowedRoles.some(r => userRoles.includes(r));
  });
}

export function canTransitionSubtask(
  ctx: SubtaskContext,
  toStatus: TaskStatus,
  currentUserId: string,
  currentUserRole: UserRole
): { allowed: boolean; transition?: SubtaskTransition; reason?: string } {
  const transitions = getAvailableSubtaskTransitions(ctx, currentUserId, currentUserRole);
  const transition = transitions.find(t => t.to === toStatus);
  if (!transition) return { allowed: false, reason: 'Transition sous-tâche non autorisée' };
  return { allowed: true, transition };
}

// Mapping pour l'UI : labels affichés pour les statuts sous-tâche
export const SUBTASK_STATUS_LABEL: Partial<Record<TaskStatus, string>> = {
  draft: 'Backlog',
  accepted: 'Acceptée',
  active: 'Active',
  on_hold: 'En pause',
  blocked: 'Bloquée',
  closed_by_owner: 'Fermée',
  rejected_closure: 'Clôture rejetée',
  approved: 'Approuvée',
  cancelled: 'Annulée',
};
