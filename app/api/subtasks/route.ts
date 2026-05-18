import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parent_task_id');

  let q = supabase.from('task_subtasks').select('*');
  if (parentId) q = q.eq('parent_task_id', parentId);

  const { data, error } = await q.order('position', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subtasks: data });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const admin = createAdminClient();
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('id, role').eq('auth_user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  // Verify user has access to the parent task
  const { data: parentTask } = await supabase
    .from('tasks').select('id, owner_id, created_by').eq('id', body.parent_task_id).single();
  if (!parentTask) return NextResponse.json({ error: 'Tâche parente introuvable' }, { status: 404 });

  const isAllowed =
    ['general_manager', 'admin'].includes(profile.role) ||
    parentTask.owner_id === profile.id ||
    parentTask.created_by === profile.id;

  if (!isAllowed) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  // Use admin client to bypass RLS for the insert
  const { data, error } = await admin
    .from('task_subtasks')
    .insert({
      parent_task_id: body.parent_task_id,
      title: body.title,
      description: body.description || null,
      owner_id: body.owner_id,
      created_by: profile.id,
      status: 'draft',
      priority: body.priority || 'P3',
      due_date: body.due_date || null,
      workload_percent: body.workload_percent || null,
      is_private: body.is_private ?? false,
      depends_on_subtask_id: body.depends_on_subtask_id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ subtask: data }, { status: 201 });
}
