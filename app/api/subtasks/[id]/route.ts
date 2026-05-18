import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('task_subtasks')
    .select(`*,
      owner:profiles!task_subtasks_owner_id_fkey(*),
      creator:profiles!task_subtasks_created_by_fkey(*),
      permissions:subtask_permissions(*, profile:profiles(id, full_name, job_title, email))`)
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ subtask: data });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const body = await request.json();
  const { data, error } = await supabase.from('task_subtasks').update(body).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ subtask: data });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { error } = await supabase.from('task_subtasks').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
