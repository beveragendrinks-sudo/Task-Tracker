import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string;
  trend?: number;
  accent?: string;
  iconBg?: string;
}

export default function Stat({ icon: Icon, label, value, sub, trend, accent, iconBg }: StatProps) {
  const isAlert = !!accent;

  return (
    <div className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 p-5 ${
      isAlert ? 'border-red-100' : 'border-slate-100'
    } shadow-card`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
          <div className={`mt-2 text-3xl font-serif font-light tabular-nums ${accent || 'text-slate-900'}`}>
            {value}
          </div>
          {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${iconBg || (isAlert ? 'bg-red-50' : 'bg-slate-50')}`}>
          <Icon className={`h-5 w-5 ${accent || 'text-slate-500'}`} />
        </div>
      </div>

      {trend !== undefined && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs">
          {trend > 0
            ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
          <span className={`font-medium ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {Math.abs(trend)}%
          </span>
          <span className="text-slate-400">vs sem. dernière</span>
        </div>
      )}
    </div>
  );
}

