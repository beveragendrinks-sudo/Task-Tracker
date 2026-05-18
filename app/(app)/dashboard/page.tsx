import {
  ClipboardList, Flag, AlertTriangle, Ban, Clock, FileCheck2,
  Activity, Users, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/Header';
import Stat from '@/components/Stat';
import { PriorityBadge, StatusBadge, Avatar } from '@/components/Badges';
import { formatDateShort, isOverdue } from '@/lib/utils';

export default async function DashboardPage() {
  const supabase = createClient();

  // Récupération des tâches accessibles (filtrées par RLS)
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      entity:entities!tasks_entity_id_fkey(name),
      owner:profiles!tasks_owner_id_fkey(id, full_name),
      department:departments!tasks_primary_department_id_fkey(name)
    `)
    .order('created_at', { ascending: false });

  const tasksList = tasks || [];

  // KPIs
  const open = tasksList.filter(t => !['approved', 'cancelled'].includes(t.status));
  const p1Open = open.filter(t => t.priority === 'P1');
  const p1Late = p1Open.filter(t =>
    t.accepted_deadline && isOverdue(t.accepted_deadline) &&
    ['active', 'pending', 'blocked', 'accepted'].includes(t.status)
  );
  const blocked = open.filter(t => t.status === 'blocked');
  const notAccepted = open.filter(t => t.status === 'assigned');
  const awaitingApproval = tasksList.filter(t => t.status === 'closed_by_owner');

  const criticalTasks = [...p1Late, ...blocked.filter(t => t.priority === 'P1')]
    .filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i)
    .slice(0, 5);

  return (
    <>
      <Header title="Tableau de bord" subtitle="Vue temps réel · Pilotage groupe" />

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={ClipboardList} label="Tâches ouvertes" value={open.length} sub={`${tasksList.length} au total`} />
          <Stat icon={Flag} label="P1 critiques" value={p1Open.length} accent={p1Open.length > 0 ? 'text-red-700' : ''} />
          <Stat icon={AlertTriangle} label="P1 en retard" value={p1Late.length}
                accent={p1Late.length > 0 ? 'text-red-700' : ''} sub="Action DG requise" />
          <Stat icon={Ban} label="Tâches bloquées" value={blocked.length}
                accent={blocked.length > 0 ? 'text-orange-700' : ''} />
          <Stat icon={Clock} label="Non acceptées" value={notAccepted.length} sub="Délai > 48h" />
          <Stat icon={FileCheck2} label="À approuver" value={awaitingApproval.length} sub="Action créateurs" />
          <Stat icon={Activity} label="En cours" value={open.filter(t => t.status === 'active').length} />
          <Stat icon={Users} label="En négociation" value={open.filter(t => t.status === 'negotiation').length} />
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
