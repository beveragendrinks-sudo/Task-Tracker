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

  const TASK_SELECT = `
    *,
    entity:entities!tasks_entity_id_fkey(name),
    owner:profiles!tasks_owner_id_fkey(id, full_name),
    subtasks:task_subtasks(id, title, status, priority, due_date, workload_percent, owner:profiles!task_subtasks_owner_id_fkey(id, full_name))
  `;

  let mainQuery = supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('owner_id', profile.id)
    .order('created_at', { ascending: false });
  if (entityId) mainQuery = mainQuery.eq('entity_id', entityId);

  // Fetch in parallel: my tasks, entities list, and subtasks I'm responsible for
  const [
    { data: tasks, error: tasksError },
    { data: entities },
    { data: subtaskParents },
  ] = await Promise.all([
    mainQuery,
    supabase.from('entities').select('id, name').eq('is_active', true).order('name'),
    supabase.from('task_subtasks').select('parent_task_id').eq('owner_id', profile.id),
  ]);

  if (tasksError) console.error('[MyTasksPage] RLS/query error:', tasksError.message);

  // Tasks where I own a subtask but am not the task owner (parent tasks not yet in list)
  const myTaskIds = new Set((tasks || []).map((t: any) => t.id));
  const extraIds = [...new Set(
    (subtaskParents || []).map((s: any) => s.parent_task_id).filter(Boolean) as string[]
  )].filter(id => !myTaskIds.has(id));

  let extraTasks: any[] = [];
  if (extraIds.length > 0) {
    let extraQuery = supabase
      .from('tasks')
      .select(TASK_SELECT)
      .in('id', extraIds)
      .order('created_at', { ascending: false });
    if (entityId) extraQuery = extraQuery.eq('entity_id', entityId);
    const { data } = await extraQuery;
    extraTasks = data || [];
  }

  const tasksList = [...(tasks || []), ...extraTasks];
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
