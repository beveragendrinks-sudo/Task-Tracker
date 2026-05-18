import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/permissions { resource_type: 'task'|'subtask', resource_id, user_id, permission_type }
export async function POST(request: Request) {
  const supabase = createClient();
  const body = await request.json();
  const { resource_type, resource_id, user_id, permission_type = 'viewer' } = body;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const table = resource_type === 'task' ? 'task_permissions' : 'subtask_permissions';
  const fk = resource_type === 'task' ? 'task_id' : 'subtask_id';

  const { data, error } = await supabase
    .from(table)
    .insert({ [fk]: resource_id, user_id, permission_type, created_by: profile.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Audit
  await supabase.from('audit_log').insert({
    user_id: profile.id,
    action: 'permission.grant',
    object_type: 'permission',
    object_id: data.id,
    new_value: { resource_type, resource_id, target_user_id: user_id, permission_type },
  });

  return NextResponse.json({ permission: data }, { status: 201 });
}

// DELETE /api/permissions?id=xxx&resource_type=task|subtask
export async function DELETE(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const resourceType = searchParams.get('resource_type');
  if (!id || !resourceType) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const table = resourceType === 'task' ? 'task_permissions' : 'subtask_permissions';
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
