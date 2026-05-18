import { Sparkles, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/Header';

export default async function AlertsPage() {
  const supabase = createClient();

  const { data: alerts } = await supabase
    .from('ai_alerts')
    .select(`
      *,
      related_user:profiles!ai_alerts_related_user_id_fkey(full_name)
    `)
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false });

  const list = alerts || [];

  const sevConfig = {
    critical: { icon: AlertCircle, color: 'border-red-300 bg-red-50', accent: 'text-red-700', badge: 'bg-red-600 text-white' },
    warning:  { icon: AlertTriangle, color: 'border-orange-300 bg-orange-50', accent: 'text-orange-700', badge: 'bg-orange-500 text-white' },
    info:     { icon: Info, color: 'border-blue-300 bg-blue-50', accent: 'text-blue-700', badge: 'bg-blue-500 text-white' },
  };

  return (
    <>
      <Header title="Alertes IA" subtitle="Détection automatique de risques et recommandations" />

      <div className="p-4 md:p-8 space-y-4">
        {list.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl p-16 text-center">
            <Sparkles className="h-12 w-12 text-stone-300 mx-auto mb-4" />
            <h3 className="font-serif text-xl text-stone-900">Aucune alerte active</h3>
            <p className="text-sm text-stone-500 mt-1">
              L'IA surveille en continu et générera des alertes en cas de risque détecté.
            </p>
          </div>
        ) : (
          list.map(a => {
            const cfg = sevConfig[a.severity as keyof typeof sevConfig] || sevConfig.info;
            const Icon = cfg.icon;
            const recos = (a.recommendations as string[]) || [];

            return (
              <div key={a.id} className={`border-2 rounded-xl p-5 ${cfg.color}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-white border ${cfg.color}`}>
                    <Icon className={`h-5 w-5 ${cfg.accent}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-serif text-base ${cfg.accent}`}>{a.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${cfg.badge}`}>
                        {a.severity}
                      </span>
                    </div>
                    <p className="text-sm text-stone-800 mt-1">{a.message}</p>

                    {(a as any).related_user && (
                      <div className="mt-2 text-xs text-stone-600">
                        Concerné : <span className="font-medium">{(a as any).related_user.full_name}</span>
                      </div>
                    )}

                    {recos.length > 0 && (
                      <div className="mt-3 bg-white/60 border border-white rounded-lg p-3">
                        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
                          Recommandations
                        </div>
                        <ul className="space-y-1 text-sm text-stone-800">
                          {recos.map((r, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-amber-700 mt-0.5">→</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
