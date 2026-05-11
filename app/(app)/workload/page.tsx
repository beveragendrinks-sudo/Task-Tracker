import { Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/Header';
import { Avatar } from '@/components/Badges';
import { roleLabel } from '@/lib/utils';

export default async function WorkloadPage() {
  const supabase = createClient();

  const { data: users } = await supabase
    .from('profiles')
    .select('*, department:departments(name)')
    .eq('is_active', true)
    .order('full_name');

  // Charger les allocations actives
  const { data: allocations } = await supabase
    .from('task_workload_allocations')
    .select('*')
    .eq('accepted_by_user', true)
    .gte('end_date', new Date().toISOString().split('T')[0]);

  // Calcul charge par utilisateur (mois en cours)
  const today = new Date();
  const month_start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const month_end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  const workloadByUser: Record<string, number> = {};
  (allocations || []).forEach(a => {
    if (a.start_date <= month_end && a.end_date >= month_start) {
      workloadByUser[a.user_id] = (workloadByUser[a.user_id] || 0) + Number(a.workload_percent);
    }
  });

  const usersList = users || [];
  const overloaded = usersList.filter(u => (workloadByUser[u.id] || 0) > 110);
  const underloaded = usersList.filter(u => (workloadByUser[u.id] || 0) < 50);

  return (
    <>
      <Header title="Charge de travail" subtitle="Workload temps réel — vue groupe" />

      <div className="p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-stone-500">Surchargés</div>
            <div className="mt-2 text-3xl font-serif font-light text-red-700">{overloaded.length}</div>
            <div className="mt-1 text-xs text-stone-500">&gt; 110%</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-stone-500">Sous-utilisés</div>
            <div className="mt-2 text-3xl font-serif font-light text-orange-700">{underloaded.length}</div>
            <div className="mt-1 text-xs text-stone-500">&lt; 50%</div>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="text-xs uppercase tracking-wider text-stone-500">Total équipe</div>
            <div className="mt-2 text-3xl font-serif font-light text-stone-900">{usersList.length}</div>
            <div className="mt-1 text-xs text-stone-500">collaborateurs actifs</div>
          </div>
        </div>

        {/* Heatmap workload */}
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg text-stone-900">Charge par collaborateur</h3>
              <p className="text-xs text-stone-500 mt-0.5">Mois en cours · capacité 100%</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-2 w-4 bg-stone-300 rounded" />
                <span className="text-stone-500">&lt;50%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-4 bg-emerald-500 rounded" />
                <span className="text-stone-500">50-110%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-4 bg-orange-500 rounded" />
                <span className="text-stone-500">110-150%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-4 bg-red-600 rounded" />
                <span className="text-stone-500">&gt;150%</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {usersList.map(u => {
              const wl = workloadByUser[u.id] || 0;
              const color =
                wl > 150 ? 'bg-red-600' :
                wl > 110 ? 'bg-orange-500' :
                wl >= 50 ? 'bg-emerald-500' :
                'bg-stone-300';

              return (
                <div key={u.id} className="flex items-center gap-3">
                  <Avatar name={u.full_name} size="sm" />
                  <div className="w-48 shrink-0">
                    <div className="text-sm font-medium text-stone-900 truncate">{u.full_name}</div>
                    <div className="text-xs text-stone-500 truncate">
                      {(u as any).department?.name || roleLabel(u.role)}
                    </div>
                  </div>
                  <div className="flex-1 h-6 bg-stone-100 rounded-md overflow-hidden relative">
                    <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(wl, 200) / 2}%` }} />
                    {wl > 100 && (
                      <div className="absolute top-0 bottom-0 w-px bg-stone-700" style={{ left: '50%' }} />
                    )}
                  </div>
                  <div className={`text-sm font-mono font-bold w-16 text-right tabular-nums ${
                    wl > 110 ? 'text-red-700' : wl < 50 ? 'text-orange-700' : 'text-emerald-700'
                  }`}>
                    {Math.round(wl)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {overloaded.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-serif text-base text-red-900">Surcharge détectée</h4>
                <p className="text-sm text-red-700 mt-1">
                  {overloaded.length} collaborateur(s) au-dessus du seuil critique. Considérer rebalancing ou
                  négociation des deadlines.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-red-800">
                  {overloaded.map(u => (
                    <li key={u.id}>• {u.full_name} — {Math.round(workloadByUser[u.id] || 0)}%</li>
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
