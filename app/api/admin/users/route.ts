import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database';

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !['admin', 'general_manager'].includes(profile.role)) return null;
  return profile;
}

// GET /api/admin/users
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('*, department:departments!profiles_department_id_fkey(id, name), entity:entities!profiles_entity_id_fkey(id, name)')
    .order('full_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
}

// POST /api/admin/users  — créer un utilisateur
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const body = await req.json();
  const { full_name, email, password, role, entity_id, department_id, job_title } = body;

  if (!full_name || !email || !password || !role) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // 1. Créer le compte auth
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  const authUserId = authData.user.id;

  // 2. Créer ou mettre à jour le profil
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .upsert({
      auth_user_id: authUserId,
      full_name,
      email,
      role: role as UserRole,
      entity_id: entity_id || null,
      department_id: department_id || null,
      job_title: job_title || null,
      is_active: true,
    }, { onConflict: 'auth_user_id' })
    .select()
    .single();

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  return NextResponse.json({ user: profile }, { status: 201 });
}
