import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parent_task_id');

  let q = supabase.from('task_subtasks').select(`*,
    owner:profiles!task_subtasks_owner_id_fkey(id, full_name, email),
    creator:profiles!task_subtasks_created_by_fkey(id, full_name)`);
  if (parentId) q = q.eq('parent_task_id', parentId);

  const { data, error } = await q.order('position', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subtasks: data });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('task_subtasks')
    .insert({ ...body, created_by: profile.id, status: body.status || 'draft' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ subtask: data }, { status: 201 });
}
