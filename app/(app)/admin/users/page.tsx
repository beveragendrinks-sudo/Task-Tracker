import { redirect } from 'next/navigation';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import Header from '@/components/Header';
import UsersAdminClient from '@/components/admin/UsersAdminClient';

export default async function AdminUsersPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (!['admin', 'general_manager'].includes(profile.role)) redirect('/dashboard');

  const supabase = createClient();
  const [{ data: entities }, { data: departments }] = await Promise.all([
    supabase.from('entities').select('*').eq('is_active', true).order('name'),
    supabase.from('departments').select('*').eq('is_active', true).order('name'),
  ]);

  return (
    <>
      <Header title="Utilisateurs" subtitle="Créer et gérer les comptes utilisateurs" />
      <div className="p-8">
        <UsersAdminClient
          entities={entities || []}
          departments={departments || []}
        />
      </div>
    </>
  );
}
