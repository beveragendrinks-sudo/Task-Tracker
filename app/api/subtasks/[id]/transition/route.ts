import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canTransitionSubtask } from '@/lib/subtask-workflow';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const body = await request.json();
  const { to_status, reason } = body;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id, role').eq('auth_user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data: subtask } = await supabase
    .from('task_subtasks')
    .select('id, status, owner_id, created_by, parent_task_id')
    .eq('id', params.id)
    .single();
  if (!subtask) return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });

  const { data: parent } = await supabase
    .from('tasks')
    .select('owner_id, created_by')
    .eq('id', subtask.parent_task_id)
    .single();
  if (!parent) return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });

  const check = canTransitionSubtask(
    {
      status: subtask.status,
      owner_id: subtask.owner_id,
      created_by: subtask.created_by,
      parent_owner_id: parent.owner_id,
      parent_created_by: parent.created_by,
    },
    to_status, profile.id, profile.role
  );
  if (!check.allowed) return NextResponse.json({ error: check.reason }, { status: 403 });

  const updates: any = { status: to_status };
  if (to_status === 'accepted')        updates.accepted_at = new Date().toISOString();
  if (to_status === 'closed_by_owner') updates.closed_at = new Date().toISOString();
  if (to_status === 'approved')        { updates.approved_at = new Date().toISOString(); updates.completed_at = new Date().toISOString(); }
  if (to_status === 'rejected_closure') updates.rejection_reason = reason;
  if (to_status === 'cancelled')       updates.cancelled_at = new Date().toISOString();

  const { data, error } = await supabase.from('task_subtasks').update(updates).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (reason) {
    await supabase.from('subtask_status_history').insert({
      subtask_id: params.id, from_status: subtask.status, to_status, changed_by: profile.id, reason,
    });
  }

  return NextResponse.json({ subtask: data });
}
