import { redirect } from 'next/navigation';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import Header from '@/components/Header';
import TaskForm from '@/components/TaskForm';

export default async function NewTaskPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = createClient();

  const [{ data: entities }, { data: departments }, { data: users }] = await Promise.all([
    supabase.from('entities').select('*').eq('is_active', true).order('name'),
    supabase.from('departments').select('*').eq('is_active', true).order('name'),
    supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
  ]);

  return (
    <>
      <Header title="Nouvelle tâche" subtitle="Créer un engagement clair et traçable" />

      <div className="p-8">
        <TaskForm
          entities={entities || []}
          departments={departments || []}
          users={users || []}
          currentProfile={profile}
        />
      </div>
    </>
  );
}
