import Link from 'next/link';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { PriorityBadge, StatusBadge, Avatar } from './Badges';
import { formatDateShort, isOverdue } from '@/lib/utils';

interface TasksTableProps {
  title: string;
  tasks: any[];
}

export default function TasksTable({ title, tasks }: TasksTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg text-slate-900">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{tasks.length} résultat{tasks.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-3xl mb-2">📋</div>
          <div className="text-sm text-slate-400">Aucune tâche à afficher</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tâche</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Prio.</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Statut</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Owner</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Entité</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Deadline</th>
                <th className="text-left px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Charge</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map(t => {
                const overdue = t.accepted_deadline && isOverdue(t.accepted_deadline) &&
                  !['approved', 'cancelled'].includes(t.status);

                return (
                  <tr key={t.id} className={`group transition-colors hover:bg-slate-50/80 ${
                    overdue ? 'bg-red-50/30' : ''
                  }`}>
                    <td className="px-6 py-3.5">
                      <Link href={`/tasks/${t.id}`} className="block">
                        <div className="font-medium text-slate-900 truncate max-w-md text-sm">{t.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{t.reference}</div>
                      </Link>
                    </td>
                    <td className="px-3 py-3.5">
                      <PriorityBadge priority={t.priority} small />
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-3 py-3.5">
                      {t.owner ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={t.owner.full_name} size="xs" />
                          <span className="text-sm text-slate-700">{t.owner.full_name.split(' ')[0]}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-sm text-slate-500">{t.entity?.name || '—'}</td>
                    <td className="px-3 py-3.5">
                      {overdue ? (
                        <div className="flex items-center gap-1 text-red-600 font-medium text-sm">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {formatDateShort(t.accepted_deadline)}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">
                          {formatDateShort(t.accepted_deadline || t.proposed_deadline)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-sm text-slate-500">
                      {t.accepted_workload_percent ? `${t.accepted_workload_percent}%` : '—'}
                    </td>
                    <td className="px-3 py-3.5">
                      <Link href={`/tasks/${t.id}`}>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-amber-500 transition-colors" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
