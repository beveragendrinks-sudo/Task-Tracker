import { redirect } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/supabase/server';
import Header from '@/components/Header';
import { Avatar } from '@/components/Badges';
import { roleLabel } from '@/lib/utils';
import EntityFilter from '@/components/EntityFilter';

export const dynamic = 'force-dynamic';

export default async function WorkloadPage({ searchParams }: { searchParams: { entity_id?: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  const isHead = profile.role === 'head_of_department';
  if (!['admin', 'general_manager', 'head_of_department'].includes(profile.role)) redirect('/dashboard');

  const supabase = createAdminClient();
  // Chefs de département : forcé sur leur entité, pas de filtre libre
  const entityId = isHead ? profile.entity_id : (searchParams.entity_id ?? null);

  const [{ data: users }, { data: entities }, { data: activeTasks }] = await Promise.all([
    (() => {
      let q = supabase
        .from('profiles')
        .select('*, department:departments!profiles_department_id_fkey(name)')
        .eq('is_active', true)
        .order('full_name');
      if (entityId) q = q.eq('entity_id', entityId);
      return q;
    })(),
    supabase.from('entities').select('id, name').order('name'),
    (() => {
      let q = supabase
        .from('tasks')
        .select('owner_id, accepted_workload_percent, proposed_workload_percent, status, entity_id')
        .not('status', 'in', '("approved","cancelled")')
        .not('owner_id', 'is', null);
      if (entityId) q = q.eq('entity_id', entityId);
      return q;
    })(),
  ]);

  // Somme de la charge par owner
  const workloadByUser: Record<string, number> = {};
  const taskCountByUser: Record<string, number> = {};
  (activeTasks || []).forEach(t => {
    if (!t.owner_id) return;
    const wl = Number(t.accepted_workload_percent ?? t.proposed_workload_percent ?? 0);
    workloadByUser[t.owner_id] = (workloadByUser[t.owner_id] || 0) + wl;
    taskCountByUser[t.owner_id] = (taskCountByUser[t.owner_id] || 0) + 1;
  });

  // Pour les chefs de département, tous les users de l'entité sont affichés
  // Pour admin/DG avec filtre entité, seulement ceux qui ont des tâches
  const allUsers = users || [];
  const usersList = (!isHead && entityId)
    ? allUsers.filter(u => (taskCountByUser[u.id] || 0) > 0)
    : allUsers;
  const overloaded  = usersList.filter(u => (workloadByUser[u.id] || 0) > 110);
  const underloaded = usersList.filter(u => (workloadByUser[u.id] || 0) < 70);
  // Moyenne uniquement sur les utilisateurs ayant au moins 1 tâche active (cohérent avec dashboard)
  const usersWithTasks = usersList.filter(u => (taskCountByUser[u.id] || 0) > 0);
  const avgWl = usersWithTasks.length
    ? Math.round(usersWithTasks.reduce((s, u) => s + (workloadByUser[u.id] || 0), 0) / usersWithTasks.length)
    : 0;

  return (
    <>
      <Header title="Charge de travail" subtitle="Workload temps réel — vue groupe" />

      <div className="page-content">
        {/* Filtre entité — masqué pour les chefs de département (vue fixe sur leur entité) */}
        {!isHead && (
          <div className="flex items-center justify-between">
            <EntityFilter entities={entities || []} currentEntityId={entityId} />
          </div>
        )}
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Surchargés</div>
            <div className="mt-2 text-3xl font-serif font-light text-red-600">{overloaded.length}</div>
            <div className="mt-1 text-xs text-slate-400">&gt; 110% de capacité</div>
          </div>
          <div className="card p-5">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Sous-utilisés</div>
            <div className="mt-2 text-3xl font-serif font-light text-amber-600">{underloaded.length}</div>
            <div className="mt-1 text-xs text-slate-400">&lt; 70% de capacité</div>
          </div>
          <div className="card p-5">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Charge moyenne</div>
            <div className={`mt-2 text-3xl font-serif font-light ${avgWl > 110 ? 'text-red-600' : avgWl < 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {avgWl}%
            </div>
            <div className="mt-1 text-xs text-slate-400">{usersWithTasks.length} collaborateurs actifs</div>
          </div>
        </div>

        {/* Barre de charge par collaborateur */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-serif text-lg text-slate-900">Charge par collaborateur</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tâches actives, acceptées, en attente ou bloquées · capacité nominale = 100%</p>
            </div>
            {/* Légende */}
            <div className="hidden sm:flex items-center gap-4 text-xs">
              {[
                { color: 'bg-slate-300',   label: '< 70%'    },
                { color: 'bg-emerald-500', label: '70–110%'  },
                { color: 'bg-orange-500',  label: '110–130%' },
                { color: 'bg-red-600',     label: '> 130%'   },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className={`h-2 w-5 rounded-full ${l.color}`} />
                  <span className="text-slate-500">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3.5">
            {usersList
              .sort((a, b) => (workloadByUser[b.id] || 0) - (workloadByUser[a.id] || 0))
              .map(u => {
                const wl = workloadByUser[u.id] || 0;
                const tasks = taskCountByUser[u.id] || 0;
                const barColor =
                  wl > 130 ? 'bg-red-600' :
                  wl > 110 ? 'bg-orange-500' :
                  wl >= 70 ? 'bg-emerald-500' :
                  'bg-slate-300';
                const textColor =
                  wl > 110 ? 'text-red-600' :
                  wl < 70  ? 'text-amber-600' :
                  'text-emerald-600';

                return (
                  <div key={u.id} className="flex items-center gap-3">
                    <Avatar name={u.full_name} size="sm" />
                    <div className="w-44 shrink-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{u.full_name}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {(u as any).department?.name || roleLabel(u.role)}
                        {tasks > 0 && <span className="ml-1 text-slate-300">· {tasks} tâche{tasks > 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                    {/* Barre */}
                    <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(wl, 200) / 2}%` }}
                      />
                      {/* Ligne 100% */}
                      <div className="absolute top-0 bottom-0 w-px bg-slate-400/40" style={{ left: '70%' }} />
                    </div>
                    <div className={`text-sm font-mono font-bold w-14 text-right tabular-nums ${textColor}`}>
                      {Math.round(wl)}%
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Alerte surcharge */}
        {overloaded.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-red-900 text-sm">
                  {overloaded.length} collaborateur{overloaded.length > 1 ? 's' : ''} en surcharge
                </h4>
                <p className="text-sm text-red-700 mt-1">
                  Au-dessus du seuil critique (110%). Considérer un rebalancing ou une renégociation des deadlines.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-red-800">
                  {overloaded.map(u => (
                    <li key={u.id} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                      {u.full_name}
                      <span className="font-mono font-bold">{Math.round(workloadByUser[u.id] || 0)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
