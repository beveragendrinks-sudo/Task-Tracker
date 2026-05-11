import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      entity:entities(*),
      department:departments!tasks_primary_department_id_fkey(*),
      creator:profiles!tasks_created_by_fkey(*),
      owner:profiles!tasks_owner_id_fkey(*)
    `)
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ task: data });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json();
  const supabase = createClient();

  const allowed = [
    'title', 'description', 'priority', 'complexity', 'proposed_deadline',
    'proposed_workload_percent', 'definition_of_done', 'primary_department_id',
    'accepted_deadline', 'accepted_workload_percent'
  ];

  const updates: any = {};
  for (const k of allowed) if (k in body) updates[k] = body[k];

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  if (!['general_manager', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 });
  }

  const supabase = createClient();
  const { error } = await supabase.from('tasks').delete().eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
