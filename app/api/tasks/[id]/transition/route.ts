import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canTransition } from '@/lib/workflow';
import type { TaskStatus } from '@/types/database';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json();
  const { to_status, reason } = body as { to_status: TaskStatus; reason?: string };

  const supabase = createClient();
  const admin = createAdminClient();
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', params.id)
    .single();

  if (fetchError || !task) {
    return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });
  }

  // Vérifier la transition autorisée
  const check = canTransition(task as any, to_status, profile.id, profile.role);
  if (!check.allowed) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }

  // Vérifier raison si requise
  if (check.transition?.requiresReason && !reason?.trim()) {
    return NextResponse.json({ error: 'Une raison est requise' }, { status: 400 });
  }

  // Vérifier DoD si requise
  if (check.transition?.requiresDoD) {
    const dod = (task.definition_of_done as any[]) || [];
    const undone = dod.filter(d => !d.done);
    if (undone.length > 0) {
      return NextResponse.json(
        { error: `${undone.length} critère(s) DoD non rempli(s)` },
        { status: 400 }
      );
    }
  }

  // Préparer les updates
  const updates: any = { status: to_status };
  if (to_status === 'accepted') {
    updates.accepted_deadline = task.proposed_deadline;
    updates.accepted_workload_percent = task.proposed_workload_percent;
  }
  if (to_status === 'active' && !task.start_date_actual) {
    updates.start_date_actual = new Date().toISOString();
  }
  if (to_status === 'closed_by_owner') updates.closed_by_owner_at = new Date().toISOString();
  if (to_status === 'approved') updates.approved_at = new Date().toISOString();
  if (to_status === 'rejected_closure') {
    updates.rejected_at = new Date().toISOString();
    updates.rejection_reason = reason;
  }
  if (to_status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString();
    updates.cancellation_reason = reason;
  }

  const { error: updateError } = await admin
    .from('tasks')
    .update(updates)
    .eq('id', params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Audit
  if (reason) {
    await admin.from('task_status_history').insert({
      task_id: params.id,
      from_status: task.status,
      to_status,
      changed_by: profile.id,
      reason,
    });
  }

  // Envoi d'une notification au(x) utilisateur(s) concernés — incluant le texte de modification
  try {
    const notifMap: Record<string, { user?: string | null; type: string; title: string; message?: string }> = {
      negotiation: {
        user: task.created_by,
        type: 'change_requested',
        title: `Modification demandée : ${task.title}`,
        message: reason ? `Modification demandée : ${reason}` : 'Modification demandée',
      },
      rejected_closure: {
        user: task.owner_id || null,
        type: 'closure_rejected',
        title: `Clôture rejetée : ${task.title}`,
        message: reason ? reason : 'Clôture rejetée',
      },
      cancelled: {
        user: task.created_by,
        type: 'task_cancelled',
        title: `Tâche annulée : ${task.title}`,
        message: reason ? reason : 'Tâche annulée',
      },
      accepted: {
        user: task.created_by,
        type: 'deadline_accepted',
        title: `Tâche acceptée : ${task.title}`,
        message: 'Deadline acceptée',
      },
      active: {
        user: task.created_by,
        type: 'task_activated',
        title: `Tâche démarrée : ${task.title}`,
        message: 'Action effectuée',
      },
      closed_by_owner: {
        user: task.created_by,
        type: 'task_closed',
        title: `À approuver : ${task.title}`,
        message: 'Clôture demandée par le responsable',
      },
      approved: {
        user: task.owner_id || null,
        type: 'closure_approved',
        title: `Clôture approuvée : ${task.title}`,
        message: 'Clôture approuvée',
      },
    };

    const n = notifMap[to_status];
    if (n && n.user) {
      // n.user peut être null/undefined si pas d'owner — vérifier
      try {
        // Utiliser le client admin pour créer et envoyer l'email si configuré
        const { createAndSendNotification } = await import('@/lib/notifications');
        await createAndSendNotification({
          user_id: n.user,
          type: n.type,
          title: n.title,
          message: n.message || '',
          task_id: params.id,
          related_user_id: profile.id,
        });
      } catch (err) {
        console.error('Erreur en créant/ envoyant notification:', err);
        // fallback : insérer la notification sans envoi mail
        await supabase.from('notifications').insert({
          user_id: n.user,
          type: n.type,
          title: n.title,
          message: n.message || '',
          task_id: params.id,
          related_user_id: profile.id,
        });
      }
    }
  } catch (err) {
    // Ne pas bloquer la transition si la notification échoue
    console.error('Erreur en envoyant notification:', err);
  }

  return NextResponse.json({ success: true });
}
