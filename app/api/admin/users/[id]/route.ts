import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database';

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !['admin', 'general_manager'].includes(profile.role)) return null;
  return profile;
}

// PATCH /api/admin/users/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const body = await req.json();
  const { role, department_id, entity_id, job_title, is_active } = body;

  const adminClient = createAdminClient();
  const updates: Record<string, unknown> = {};

  if (role !== undefined)          updates.role = role as UserRole;
  if (department_id !== undefined) updates.department_id = department_id || null;
  if (entity_id !== undefined)     updates.entity_id = entity_id || null;
  if (job_title !== undefined)     updates.job_title = job_title || null;
  if (is_active !== undefined)     updates.is_active = is_active;

  const { data, error } = await adminClient
    .from('profiles')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data });
}

// DELETE /api/admin/users/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  if (me.id === params.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: profile, error: fetchError } = await admin
    .from('profiles')
    .select('auth_user_id')
    .eq('id', params.id)
    .single();

  if (fetchError || !profile) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  if (profile.auth_user_id) {
    const { error: authError } = await admin.auth.admin.deleteUser(profile.auth_user_id);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
  } else {
    const { error: delError } = await admin.from('profiles').delete().eq('id', params.id);
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
