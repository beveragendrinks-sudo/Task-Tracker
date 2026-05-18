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
