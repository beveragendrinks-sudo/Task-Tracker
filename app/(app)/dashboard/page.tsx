import {
  ClipboardList, Flag, AlertTriangle, Ban, Clock,  Calendar, FileCheck, FileCheck2, Sparkles, PauseCircle,
  Activity, Users, ChevronRight, Bell, CornerDownRight
} from 'lucide-react';
import Link from 'next/link';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Header from '@/components/Header';
import Stat from '@/components/Stat';
import { PriorityBadge, StatusBadge, Avatar } from '@/components/Badges';
import { formatDateShort, isOverdue } from '@/lib/utils';

export default async function DashboardPage() {
  const supabase = createClient();
  const supabaseAdmin = createAdminClient();
  const profile = await getCurrentProfile();

  // Chef d'entité : limité à son entité pour le workload
  const isHead = profile?.role === 'head_of_department';
  const headEntityId = isHead ? profile?.entity_id : null;

  // Requêtes admin pour le workload — identiques à WorkloadPage
  let wlTasksQuery = supabaseAdmin
    .from('tasks')
    .select('id, owner_id, accepted_workload_percent, proposed_workload_percent')
    .not('status', 'in', '("approved","cancelled")')
    .not('owner_id', 'is', null);
  if (headEntityId) wlTasksQuery = wlTasksQuery.eq('entity_id', headEntityId);

  let wlSubtasksQuery = supabaseAdmin
    .from('task_subtasks')
    .select('owner_id, workload_percent, status, parent_task_id')
    .not('status', 'in', '("approved","cancelled")')
    .not('owner_id', 'is', null);

  let wlProfilesQuery = supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('is_active', true);
  if (headEntityId) wlProfilesQuery = wlProfilesQuery.eq('entity_id', headEntityId);

  const [{ data: tasks }, { data: wlTasks }, { data: wlProfiles }, { data: wlSubtasks }, { data: pendingSubtasksRaw }] = await Promise.all([
    supabase
      .from('tasks')
      .select(`
        *,
        entity:entities!tasks_entity_id_fkey(name),
        owner:profiles!tasks_owner_id_fkey(id, full_name),
        department:departments!tasks_primary_department_id_fkey(name)
      `)
      .order('created_at', { ascending: false }),
    wlTasksQuery,
    wlProfilesQuery,
    wlSubtasksQuery,
    profile
      ? supabase
          .from('task_subtasks')
          .select('id, title, parent_task_id, parent_task:tasks!task_subtasks_parent_task_id_fkey(id, title)')
          .eq('owner_id', profile.id)
          .eq('status', 'draft')
      : Promise.resolve({ data: [] as any[] }),
  ]);

  // Tasks assigned to current user waiting for acceptance
  // Derived from tasksList to avoid a separate query + potential RLS edge cases
  const tasksList = tasks || [];
  const pendingList = profile
    ? tasksList.filter(t => t.owner_id === profile.id && t.status === 'assigned')
    : [];

  // Subtasks assigned to current user waiting for acceptance (status = 'draft')
  const pendingSubtaskList = (pendingSubtasksRaw || []) as any[];

  // KPIs
  const open = tasksList.filter(t => !['approved', 'cancelled'].includes(t.status));
  const active = tasksList.filter(t => ['active'].includes(t.status));
  const accepted = tasksList.filter(t => ['accepted'].includes(t.status));
  const backlog = tasksList.filter(t => ['assigned', 'negotiation', 'accepted'].includes(t.status));
  const kanban = tasksList.filter(t => ['active', 'on_hold', 'blocked', 'closed_by_owner', 'approved'].includes(t.status));
  const negotiation = tasksList.filter(t => ['negotiation'].includes(t.status));
  const p1Open = open.filter(t => t.priority === 'P1');
  const p1Late = p1Open.filter(t =>
    t.accepted_deadline && isOverdue(t.accepted_deadline) &&
    ['active', 'pending', 'blocked', 'accepted'].includes(t.status)
  );
  const pLate = open.filter(t =>
    t.accepted_deadline && isOverdue(t.accepted_deadline) &&
    ['active', 'pending', 'blocked', 'accepted'].includes(t.status)
  );
  const blocked = open.filter(t => t.status === 'blocked');
  const notAccepted = open.filter(t => t.status === 'assigned');
  const awaitingApproval = tasksList.filter(t => t.status === 'closed_by_owner');

  const criticalTasks = [...p1Late, ...blocked.filter(t => t.priority === 'P1')]
    .filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)
    .slice(0, 5);

  // Calcul de la charge — même logique exacte que WorkloadPage (données admin)
  const workloadByUser: Record<string, number> = {};
  const taskCountByUser: Record<string, number> = {};
  const taskOwnerMap: Record<string, string> = {};
  (wlTasks || []).forEach(t => {
    if (!t.owner_id) return;
    const wl = Number(t.accepted_workload_percent ?? t.proposed_workload_percent ?? 0);
    workloadByUser[t.owner_id] = (workloadByUser[t.owner_id] || 0) + wl;
    taskCountByUser[t.owner_id] = (taskCountByUser[t.owner_id] || 0) + 1;
    taskOwnerMap[t.id] = t.owner_id;
  });
  // Ajouter la charge des sous-tâches dont le responsable ≠ responsable de la tâche mère
  (wlSubtasks || []).forEach(s => {
    if (!s.owner_id || !s.parent_task_id) return;
    const parentOwnerId = taskOwnerMap[s.parent_task_id];
    if (!parentOwnerId) return;
    if (s.owner_id === parentOwnerId) return;
    const wl = Number(s.workload_percent ?? 0);
    workloadByUser[s.owner_id] = (workloadByUser[s.owner_id] || 0) + wl;
  });
  // Filtrer les owners via les profils actifs — identique à WorkloadPage
  const activeProfileIds = new Set((wlProfiles || []).map(u => u.id));
  const usersWithTasks = [...new Set(
    (wlTasks || [])
      .filter(t => t.owner_id && activeProfileIds.has(t.owner_id))
      .map(t => t.owner_id as string)
  )];
  const avgWl = usersWithTasks.length
    ? Math.round(usersWithTasks.reduce((s, uid) => s + (workloadByUser[uid] || 0), 0) / usersWithTasks.length)
    : 0;
  // Pour les collaborateurs : leur propre charge (pas une moyenne)
  const isCollaborator = profile?.role && ['collaborator', 'manager'].includes(profile.role);
  const myWorkload = profile ? Math.round(workloadByUser[profile.id] || 0) : 0;
  const wlValue = isCollaborator ? myWorkload : avgWl;
  const wlLabel = isCollaborator ? 'Ma charge' : 'Charge moyenne';
  const wlSub = isCollaborator ? 'Mon workload actuel' : `${usersWithTasks.length} collaborateurs actifs`;

  return (
    <>
      <Header title="Tableau de bord" subtitle="Vue temps réel · Pilotage groupe" />

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Banner: tâches à accepter */}
        {pendingList.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-amber-900 text-sm">
                  {pendingList.length === 1
                    ? 'Vous avez 1 nouvelle tâche à accepter'
                    : `Vous avez ${pendingList.length} nouvelles tâches à accepter`}
                </div>
                <div className="text-xs text-amber-700 mt-0.5 truncate">
                  {pendingList.map(t => t.title).join(' · ')}
                </div>
              </div>
            </div>
            <Link
              href="/tasks/mine"
              className="shrink-0 text-sm font-medium px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              Voir mes tâches
            </Link>
          </div>
        )}

        {/* Banner: sous-tâches à accepter */}
        {pendingSubtaskList.length > 0 && (
          <div className="bg-sky-50 border border-sky-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-9 w-9 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                <CornerDownRight className="h-4 w-4 text-sky-600" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sky-900 text-sm">
                  {pendingSubtaskList.length === 1
                    ? 'Vous avez 1 nouvelle sous-tâche à accepter'
                    : `Vous avez ${pendingSubtaskList.length} nouvelles sous-tâches à accepter`}
                </div>
                <div className="text-xs text-sky-700 mt-0.5 truncate">
                  {pendingSubtaskList.map((s: any) => {
                    const parentTitle = s.parent_task?.title;
                    return parentTitle ? `${s.title} (${parentTitle})` : s.title;
                  }).join(' · ')}
                </div>
              </div>
            </div>
            <Link
              href="/tasks/mine"
              className="shrink-0 text-sm font-medium px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
            >
              Voir mes tâches
            </Link>
          </div>
        )}
        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={ClipboardList} label="Tâches Backlog" value={backlog.length}  />
          <Stat 
            icon={Calendar} 
            label="À accepter" 
            value={open.filter(t => t.status === 'assigned').length} 
          />
          <Stat icon={Users} label="En négociation" value={open.filter(t => t.status === 'negotiation').length} />
          <Stat icon={FileCheck} label="Tâches Acceptées / À Démarrer" value={accepted.length} />
          <Stat icon={Sparkles} label="Tâches Kanban" value={kanban.length} sub={`${active.length} En cours`}/>
          <Stat icon={AlertTriangle} label="Tâches en retard" value={pLate.length} 
                accent={pLate.length > 0 ? 'text-red-700' : ''} sub="Action requise" />
          <Stat icon={FileCheck2} label="Résultats à Valider" value={awaitingApproval.length} sub="Action créateurs" />
      
          <Stat
            icon={Activity}
            label={wlLabel}
            value={`${wlValue}%`}
            sub={wlSub}
          />
        </div>

        {/* Tâches critiques */}
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg text-stone-900">Tâches P1 en retard ou bloquées</h3>
              <p className="text-xs text-stone-500 mt-0.5">Action immédiate requise</p>
            </div>
            <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full font-medium">
              {criticalTasks.length} critique{criticalTasks.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2">
            {criticalTasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-stone-500">Aucune tâche P1 critique 🎉</div>
            ) : (
              criticalTasks.map(t => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 hover:border-amber-700 hover:bg-amber-50/30 cursor-pointer transition-colors"
                >
                  <PriorityBadge priority={t.priority} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-stone-900 truncate">{t.title}</div>
                    <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                      <span>{(t as any).owner?.full_name || 'Non assigné'}</span>
                      <span>·</span>
                      <span>{(t as any).entity?.name}</span>
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Tâches récentes */}
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <h3 className="font-serif text-lg text-stone-900 mb-4">Tâches récentes</h3>
          <div className="space-y-2">
            {tasksList.slice(0, 8).map(t => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-stone-50 cursor-pointer transition-colors"
              >
                <PriorityBadge priority={t.priority} small />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-stone-900 truncate">{t.title}</div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {(t as any).owner?.full_name || 'Non assigné'} · {formatDateShort(t.accepted_deadline || t.proposed_deadline)}
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
