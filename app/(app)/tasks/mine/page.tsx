import { Bell, PlayCircle, Ban, Clock } from 'lucide-react';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import Header from '@/components/Header';
import Stat from '@/components/Stat';
import TasksTable from '@/components/TasksTable';
import EntityFilter from '@/components/EntityFilter';
import { isOverdue } from '@/lib/utils';

export default async function MyTasksPage({
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
    .eq('owner_id', profile.id)
    .order('created_at', { ascending: false });
  if (entityId) query = query.eq('entity_id', entityId);

  const [{ data: tasks, error: tasksError }, { data: entities }] = await Promise.all([
    query,
    supabase.from('entities').select('id, name').eq('is_active', true).order('name'),
  ]);

  if (tasksError) console.error('[MyTasksPage] RLS/query error:', tasksError.message);
  const tasksList = tasks || [];
  const entitiesList = entities || [];

  const toAccept = tasksList.filter(t => t.status === 'assigned');
  const active = tasksList.filter(t => ['active', 'pending'].includes(t.status));
  const blocked = tasksList.filter(t => t.status === 'blocked');
  const overdue = tasksList.filter(t =>
    t.accepted_deadline && isOverdue(t.accepted_deadline) &&
    !['approved', 'cancelled'].includes(t.status)
  );

  return (
    <>
      <Header title="Mes tâches" subtitle="Tâches qui me sont assignées" />

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        <EntityFilter entities={entitiesList} currentEntityId={entityId} />
        <div className="grid grid-cols-4 gap-4">
          <Stat icon={Bell} label="À accepter" value={toAccept.length} accent={toAccept.length > 0 ? 'text-orange-700' : ''} />
          <Stat icon={PlayCircle} label="En cours" value={active.length} />
          <Stat icon={Ban} label="Bloquées" value={blocked.length} accent={blocked.length > 0 ? 'text-red-700' : ''} />
          <Stat icon={Clock} label="En retard" value={overdue.length} accent={overdue.length > 0 ? 'text-red-700' : ''} />
        </div>

        <TasksTable title="Toutes mes tâches" tasks={tasksList} />
      </div>
    </>
  );
}
