import { Send, Clock, Ban, FileCheck2 } from 'lucide-react';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import Header from '@/components/Header';
import Stat from '@/components/Stat';
import TasksTable from '@/components/TasksTable';

export default async function GivenTasksPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = createClient();
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(`
      *,
      entity:entities!tasks_entity_id_fkey(name),
      owner:profiles!tasks_owner_id_fkey(id, full_name)
    `)
    .eq('created_by', profile.id)
    .order('created_at', { ascending: false });

  if (tasksError) console.error('[GivenTasksPage] RLS/query error:', tasksError.message);
  const tasksList = tasks || [];

  return (
    <>
      <Header title="Tâches données" subtitle="Tâches que j'ai créées et déléguées" />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Stat icon={Send} label="Total données" value={tasksList.length} />
          <Stat icon={Clock} label="Non acceptées" value={tasksList.filter(t => t.status === 'assigned').length} />
          <Stat icon={Ban} label="Bloquées" value={tasksList.filter(t => t.status === 'blocked').length} />
          <Stat
            icon={FileCheck2}
            label="À approuver"
            value={tasksList.filter(t => t.status === 'closed_by_owner').length}
            accent={tasksList.filter(t => t.status === 'closed_by_owner').length > 0 ? 'text-amber-700' : ''}
          />
        </div>

        <TasksTable title="Tâches que j'ai données" tasks={tasksList} />
      </div>
    </>
  );
}
