import type { Task, Profile, TaskStatus } from '@/types/database';

// ============================================================
// POLITIQUE EMAIL — Minimum nécessaire pour garder l'importance
// ============================================================
// Règle : un email = action requise. Pas de bruit.

export interface EmailToSend {
  trigger_type: string;
  to_email: string;
  to_user_id: string;
  subject: string;
  body: string;
  task_id?: string;
}

export const EMAIL_TRIGGERS = {
  TASK_HIGH_PRIORITY_ASSIGNED: { label: 'Tâche P1/P2 assignée', desc: "Email immédiat à l'owner — action requise" },
  CLOSURE_REJECTED: { label: 'Clôture rejetée', desc: "Email à l'owner — action correctrice requise" },
  BLOCKER_ESCALATION: { label: 'Escalade blocage P1/P2 > 72h', desc: 'Email DG + créateur' },
  P1_OVERDUE: { label: 'P1 en retard > 24h', desc: 'Email owner + manager + DG' },
  NOT_ACCEPTED_48H: { label: 'Non acceptée > 48h', desc: 'Email owner + manager' },
  WORKLOAD_OVERLOAD_SUSTAINED: { label: 'Surcharge > 150% sur 3 mois', desc: 'Email user + manager' },
  DAILY_DIGEST_DG: { label: 'Digest quotidien DG (8h)', desc: 'Synthèse des 5 risques majeurs' },
};

export const EMAIL_NOT_SENT = [
  'Commentaire ajouté',
  'Négociation (visible in-app)',
  'Statut mineur (active → pending)',
  'Approbation positive',
  'Tâche P3/P4 assignée',
  'Workload < 110% (info seulement)',
];

/**
 * Calcule les emails à envoyer suite à un événement
 */
export function computeEmailsForCreate(
  task: Task & { owner?: Profile; creator?: Profile },
  creator: Profile
): EmailToSend[] {
  const emails: EmailToSend[] = [];
  if (['P1','P2'].includes(task.priority) && task.owner) {
    emails.push({
      trigger_type: 'TASK_HIGH_PRIORITY_ASSIGNED',
      to_email: task.owner.email,
      to_user_id: task.owner.id,
      subject: `[${task.priority}] Nouvelle tâche à accepter : ${task.title}`,
      body: emailTaskAssigned(task, creator),
      task_id: task.id,
    });
  }
  return emails;
}

export function computeEmailsForTransition(
  task: Task & { owner?: Profile; creator?: Profile },
  oldStatus: TaskStatus,
  changedBy: Profile,
  users: Profile[]
): EmailToSend[] {
  const emails: EmailToSend[] = [];

  // Clôture rejetée → email à l'owner
  if (oldStatus !== 'rejected_closure' && task.status === 'rejected_closure' && task.owner) {
    emails.push({
      trigger_type: 'CLOSURE_REJECTED',
      to_email: task.owner.email,
      to_user_id: task.owner.id,
      subject: `❌ Clôture rejetée : ${task.title}`,
      body: emailClosureRejected(task, changedBy),
      task_id: task.id,
    });
  }

  // Blocage P1/P2 → email DG + créateur
  if (oldStatus !== 'blocked' && task.status === 'blocked' && ['P1','P2'].includes(task.priority)) {
    const dg = users.find(u => u.role === 'general_manager');
    if (dg) {
      emails.push({
        trigger_type: 'BLOCKER_ESCALATION',
        to_email: dg.email,
        to_user_id: dg.id,
        subject: `🚨 Tâche ${task.priority} bloquée : ${task.title}`,
        body: emailBlockerEscalation(task, changedBy),
        task_id: task.id,
      });
    }
    if (task.creator && task.creator.id !== dg?.id) {
      emails.push({
        trigger_type: 'BLOCKER_ESCALATION',
        to_email: task.creator.email,
        to_user_id: task.creator.id,
        subject: `⚠ Votre tâche ${task.priority} est bloquée : ${task.title}`,
        body: emailBlockerEscalation(task, changedBy),
        task_id: task.id,
      });
    }
  }

  return emails;
}

// ── TEMPLATES EMAILS ─────────────────────────────────────────
function emailTaskAssigned(task: any, creator: Profile): string {
  return `Bonjour,

${creator.full_name} vous a assigné une tâche ${task.priority} :

Titre : ${task.title}
Description : ${task.description}
Deadline proposée : ${task.proposed_deadline || 'à négocier'}
Charge proposée : ${task.proposed_workload_percent || '—'}%

Merci d'accepter, négocier ou refuser dans les 48h.

→ Voir la tâche : ${process.env.NEXT_PUBLIC_APP_URL}/tasks/${task.id}

—
Task Engine`;
}

function emailClosureRejected(task: any, by: Profile): string {
  return `Bonjour,

${by.full_name} a rejeté la clôture de la tâche :

${task.title}
Référence : ${task.reference}

Raison : ${task.rejection_reason || 'Voir la tâche pour les détails.'}

Merci de corriger et re-soumettre.

→ Voir la tâche : ${process.env.NEXT_PUBLIC_APP_URL}/tasks/${task.id}

—
Task Engine`;
}

function emailBlockerEscalation(task: any, by: Profile): string {
  return `Bonjour,

Une tâche ${task.priority} a été déclarée en blocage par ${by.full_name} :

${task.title}
Référence : ${task.reference}

Sans résolution sous 72h, escalade automatique au DG.

→ Voir la tâche : ${process.env.NEXT_PUBLIC_APP_URL}/tasks/${task.id}

—
Task Engine`;
}
