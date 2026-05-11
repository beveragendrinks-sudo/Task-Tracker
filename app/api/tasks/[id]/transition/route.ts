import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { canTransition } from '@/lib/workflow';
import type { TaskStatus } from '@/types/database';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json();
  const { to_status, reason } = body as { to_status: TaskStatus; reason?: string };

  const supabase = createClient();
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

  const { error: updateError } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Audit
  if (reason) {
    await supabase.from('task_status_history').insert({
      task_id: params.id,
      from_status: task.status,
      to_status,
      changed_by: profile.id,
      reason,
    });
  }

  return NextResponse.json({ success: true });
}
