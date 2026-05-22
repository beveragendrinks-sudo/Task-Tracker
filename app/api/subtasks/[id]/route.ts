import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('task_subtasks')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  // Enrich with owner profile
  if (data?.owner_id) {
    const { data: owner } = await admin.from('profiles').select('id, full_name, job_title, email').eq('id', data.owner_id).single();
    (data as any).owner = owner ?? null;
  }

  return NextResponse.json({ subtask: data });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const admin = createAdminClient();
  const body = await request.json();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('auth_user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Load subtask to verify access
  const { data: subtask } = await admin
    .from('task_subtasks')
    .select('id, parent_task_id, owner_id, created_by')
    .eq('id', params.id)
    .single();
  if (!subtask) return NextResponse.json({ error: 'Sous-tâche introuvable' }, { status: 404 });

  const { data: parentTask } = await supabase
    .from('tasks').select('id, owner_id, created_by').eq('id', subtask.parent_task_id).single();

  const isAllowed =
    ['general_manager', 'admin'].includes(profile.role) ||
    subtask.owner_id === profile.id ||
    subtask.created_by === profile.id ||
    parentTask?.owner_id === profile.id ||
    parentTask?.created_by === profile.id;

  if (!isAllowed) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  // Only allow updating depends_on_subtask_id via this endpoint
  const { depends_on_subtask_id } = body;

  // Validate dep belongs to same parent task (if provided)
  if (depends_on_subtask_id) {
    const { data: dep } = await admin
      .from('task_subtasks')
      .select('id, parent_task_id')
      .eq('id', depends_on_subtask_id)
      .single();
    if (!dep) return NextResponse.json({ error: 'Sous-tâche dépendante introuvable' }, { status: 404 });
    if (dep.parent_task_id !== subtask.parent_task_id)
      return NextResponse.json({ error: 'La dépendance doit appartenir à la même tâche parente' }, { status: 400 });
    if (depends_on_subtask_id === params.id)
      return NextResponse.json({ error: 'Une sous-tâche ne peut pas dépendre d\'elle-même' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('task_subtasks')
    .update({ depends_on_subtask_id: depends_on_subtask_id ?? null })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ subtask: data });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { error } = await supabase.from('task_subtasks').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
