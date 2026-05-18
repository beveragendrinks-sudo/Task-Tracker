import { Send, Clock, Ban, FileCheck2 } from 'lucide-react';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import Header from '@/components/Header';
import Stat from '@/components/Stat';
import TasksTable from '@/components/TasksTable';
import EntityFilter from '@/components/EntityFilter';

export default async function GivenTasksPage({
  searchParams,
}: {
  searchParams: { entity_id?: string };
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const entityId = searchParams.entity_id ?? null;
  const supabase = createClient();

  let query = supabase
    .from('tasks')
    .select(`
      *,
      entity:entities!tasks_entity_id_fkey(name),
      owner:profiles!tasks_owner_id_fkey(id, full_name)
    `)
    .eq('created_by', profile.id)
    .order('created_at', { ascending: false });
  if (entityId) query = query.eq('entity_id', entityId);

  const [{ data: tasks, error: tasksError }, { data: entities }] = await Promise.all([
    query,
    supabase.from('entities').select('id, name').eq('is_active', true).order('name'),
  ]);

  if (tasksError) console.error('[GivenTasksPage] RLS/query error:', tasksError.message);
  const tasksList = tasks || [];
  const entitiesList = entities || [];

  return (
    <>
      <Header title="Tâches données" subtitle="Tâches que j'ai créées et déléguées" />

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        <EntityFilter entities={entitiesList} currentEntityId={entityId} />
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
