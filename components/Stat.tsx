import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string;
  trend?: number;
  accent?: string;
}

export default function Stat({ icon: Icon, label, value, sub, trend, accent }: StatProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-stone-500 font-medium">{label}</div>
          <div className={`mt-2 text-3xl font-serif font-light ${accent || 'text-stone-900'}`}>{value}</div>
          {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
        </div>
        <div className={`p-2 rounded-lg ${accent ? 'bg-red-50' : 'bg-stone-50'}`}>
          <Icon className={`h-5 w-5 ${accent || 'text-stone-600'}`} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend > 0 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-red-600" />}
          <span className={trend > 0 ? 'text-emerald-700' : 'text-red-700'}>{Math.abs(trend)}%</span>
          <span className="text-stone-500">vs sem. dernière</span>
        </div>
      )}
    </div>
  );
}
