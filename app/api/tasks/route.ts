import { NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const owner = url.searchParams.get('owner_id');
  const entity = url.searchParams.get('entity_id');

  const supabase = createClient();
  let query = supabase
    .from('tasks')
    .select(`
      *,
      entity:entities!tasks_entity_id_fkey(name),
      owner:profiles!tasks_owner_id_fkey(id, full_name),
      department:departments!tasks_primary_department_id_fkey(name)
    `);

  if (status) query = query.eq('status', status);
  if (owner) query = query.eq('owner_id', owner);
  if (entity) query = query.eq('entity_id', entity);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tasks: data });
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json();

  if (!body.title || !body.description || !body.entity_id || !body.owner_id) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
  }

  const dod = body.definition_of_done || [];
  if (!Array.isArray(dod) || dod.length === 0) {
    return NextResponse.json({ error: 'Definition of Done requise' }, { status: 400 });
  }

  // Le DG peut désigner un autre créateur ; tous les autres sont toujours créateurs eux-mêmes
  const isDG = profile.role === 'general_manager' || profile.role === 'admin';
  const creatorId: string = (isDG && body.created_by) ? body.created_by : profile.id;

  // Always use admin client for INSERT to avoid select-after-insert RLS blocking
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('tasks')
    .insert({
      title: body.title,
      description: body.description,
      entity_id: body.entity_id,
      primary_department_id: body.primary_department_id || null,
      created_by: creatorId,
      owner_id: body.owner_id,
      priority: body.priority || 'P3',
      complexity: body.complexity || 'medium',
      status: 'assigned',
      proposed_deadline: body.proposed_deadline || null,
      proposed_workload_percent: body.proposed_workload_percent || null,
      definition_of_done: dod,
      is_private: body.is_private ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Explicit permissions (private tasks only)
  const authorizedUsers: string[] = body.is_private && Array.isArray(body.authorizedUsers) ? body.authorizedUsers : [];
  if (authorizedUsers.length > 0) {
    await admin.from('task_permissions').insert(
      authorizedUsers.map((uid: string) => ({
        task_id: data.id, user_id: uid,
        permission_type: 'viewer', created_by: creatorId,
      }))
    );
  }

  // Notification owner
  try {
    const { createAndSendNotification } = await import('@/lib/notifications');
    await createAndSendNotification({
      user_id: body.owner_id,
      type: 'task_to_accept',
      title: `Nouvelle tâche à accepter : ${body.title}`,
      message: `${profile.full_name} vous a assigné une tâche.`,
      task_id: data.id,
      related_user_id: profile.id,
    });
  } catch (e) {
    console.warn('[POST /api/tasks] Notification non envoyée:', e);
  }

  return NextResponse.json({ task: data }, { status: 201 });
}
