import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/server';
import Header from '@/components/Header';
import DepartmentsAdminClient from '@/components/admin/DepartmentsAdminClient';

export default async function AdminDepartmentsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (!['admin', 'general_manager'].includes(profile.role)) redirect('/dashboard');

  return (
    <>
      <Header title="Départements" subtitle="Directions et services de l'organisation" />
      <div className="p-4 md:p-8">
        <DepartmentsAdminClient />
      </div>
    </>
  );
}
