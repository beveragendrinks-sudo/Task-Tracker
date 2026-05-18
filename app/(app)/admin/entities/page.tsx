import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/server';
import Header from '@/components/Header';
import EntitiesAdminClient from '@/components/admin/EntitiesAdminClient';

export default async function AdminEntitiesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (!['admin', 'general_manager'].includes(profile.role)) redirect('/dashboard');

  return (
    <>
      <Header title="Entités" subtitle="Sociétés et filiales du groupe" />
      <div className="p-4 md:p-8">
        <EntitiesAdminClient />
      </div>
    </>
  );
}
