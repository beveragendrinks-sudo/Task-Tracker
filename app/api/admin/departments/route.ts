import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/supabase/server';

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || !['admin', 'general_manager'].includes(profile.role)) return null;
  return profile;
}

// GET /api/admin/departments
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin.from('departments').select('*').order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ departments: data });
}

// POST /api/admin/departments
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('departments')
    .insert({ name, description: description || null, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ department: data }, { status: 201 });
}
