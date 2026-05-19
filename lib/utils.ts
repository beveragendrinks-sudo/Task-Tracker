import clsx, { type ClassValue } from 'clsx';
import type { TaskStatus, TaskPriority, TaskComplexity } from '@/types/database';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ===========================================================
// Configuration UI : statuts, priorités, complexité
// ===========================================================

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; kanban: string }> = {
  draft:           { label: 'Brouillon',       color: 'bg-slate-100 text-slate-700 border-slate-300', kanban: 'Backlog' },
  assigned:        { label: 'Assignée',        color: 'bg-slate-100 text-slate-800 border-slate-300', kanban: 'À accepter' },
  negotiation:     { label: 'Négociation',     color: 'bg-orange-100 text-orange-800 border-orange-300', kanban: 'Négociation' },
  accepted:        { label: 'Acceptée',        color: 'bg-sky-100 text-sky-800 border-sky-300', kanban: 'Acceptée' },
  active:          { label: 'En cours',        color: 'bg-blue-100 text-blue-800 border-blue-300', kanban: 'En cours' },
  //pending:         { label: 'En attente',      color: 'bg-yellow-100 text-yellow-800 border-yellow-300', kanban: 'En attente' },
  on_hold:         { label: 'En pause',        color: 'bg-purple-100 text-purple-800 border-purple-300', kanban: 'En pause' },
  blocked:         { label: 'Bloquée',         color: 'bg-red-100 text-red-800 border-red-400', kanban: 'Bloquée' },
  closed_by_owner: { label: 'Fermée Owner',    color: 'bg-teal-100 text-teal-800 border-teal-300', kanban: 'À Valider' },
  rejected_closure:{ label: 'Clôture rejetée', color: 'bg-rose-100 text-rose-800 border-rose-400', kanban: 'À corriger' },
  approved:        { label: 'Validée',       color: 'bg-emerald-100 text-emerald-800 border-emerald-300', kanban: 'Terminée' },
  cancelled:       { label: 'Annulée',         color: 'bg-stone-100 text-stone-600 border-stone-300', kanban: 'Annulée' },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { color: string; border: string; label: string }> = {
  P1: { color: 'bg-red-600 text-white',     border: 'border-red-600',    label: 'P1 — Critique DG' },
  P2: { color: 'bg-orange-500 text-white',  border: 'border-orange-500', label: 'P2 — Business' },
  P3: { color: 'bg-blue-500 text-white',    border: 'border-blue-500',   label: 'P3 — Important' },
  P4: { color: 'bg-yellow-500 text-white',   border: 'border-yellow-500',  label: 'P4 — Low' },
};

export const COMPLEXITY_CONFIG: Record<TaskComplexity, { coef: number; label: string }> = {
  simple:    { coef: 1, label: 'Simple' },
  medium:    { coef: 2, label: 'Moyenne' },
  complex:   { coef: 3, label: 'Complexe' },
  strategic: { coef: 5, label: 'Stratégique' },
};

export const KANBAN_COLUMNS: TaskStatus[] = [
  'assigned', 'negotiation', 'accepted', 'active',
  'on_hold', 'blocked', 'closed_by_owner', 'approved'
];

// ===========================================================
// Helpers dates
// ===========================================================

export function formatDate(date: string | Date | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function formatDateShort(date: string | Date | null): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(d);
}

export function daysFromNow(date: string | Date | null): number | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function isOverdue(date: string | Date | null): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() < Date.now();
}

// ===========================================================
// Helpers utilisateur
// ===========================================================

export function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    general_manager: 'Direction Générale',
    admin: 'Scrum Master',
    head_of_department: 'Chef d\'Entité',
    manager: 'Manager',
    collaborator: 'Collaborateur',
  };
  return map[role] || role;
}
