import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/supabase/server';

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !['admin', 'general_manager'].includes(profile.role)) return null;
  return profile;
}

// PATCH /api/admin/departments/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const body = await req.json();
  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined)        updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description || null;
  if (body.is_active !== undefined)   updates.is_active = body.is_active;

  const { data, error } = await admin
    .from('departments')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ department: data });
}

// DELETE /api/admin/departments/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const admin = createAdminClient();

  // Vérifier les tâches liées
  const { count: taskCount } = await admin
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('primary_department_id', params.id);

  if (taskCount && taskCount > 0) {
    return NextResponse.json(
      { error: `Impossible de supprimer : ${taskCount} tâche${taskCount > 1 ? 's' : ''} sont liée${taskCount > 1 ? 's' : ''} à ce département. Réassignez-les d'abord.` },
      { status: 409 }
    );
  }

  // Vérifier les profils liés
  const { count: profileCount } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('department_id', params.id);

  if (profileCount && profileCount > 0) {
    return NextResponse.json(
      { error: `Impossible de supprimer : ${profileCount} utilisateur${profileCount > 1 ? 's' : ''} appartien${profileCount > 1 ? 'nent' : 't'} à ce département. Réassignez-les d'abord.` },
      { status: 409 }
    );
  }

  const { error } = await admin.from('departments').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
