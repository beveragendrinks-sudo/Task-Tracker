import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PriorityBadge, StatusBadge, Avatar } from './Badges';
import { formatDateShort, isOverdue } from '@/lib/utils';

interface TasksTableProps {
  title: string;
  tasks: any[];
}

export default function TasksTable({ title, tasks }: TasksTableProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-stone-200">
        <h2 className="font-serif text-lg text-stone-900">{title}</h2>
        <p className="text-xs text-stone-500 mt-0.5">{tasks.length} résultat(s)</p>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 text-sm text-stone-500">Aucune tâche</div>
      ) : (
        <table className="w-full">
          <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500 border-b border-stone-200">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Tâche</th>
              <th className="text-left px-3 py-3 font-medium">Pri.</th>
              <th className="text-left px-3 py-3 font-medium">Statut</th>
              <th className="text-left px-3 py-3 font-medium">Owner</th>
              <th className="text-left px-3 py-3 font-medium">Entité</th>
              <th className="text-left px-3 py-3 font-medium">Deadline</th>
              <th className="text-left px-3 py-3 font-medium">Charge</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-stone-100">
            {tasks.map(t => {
              const overdue = t.accepted_deadline && isOverdue(t.accepted_deadline) &&
                !['approved', 'cancelled'].includes(t.status);

              return (
                <tr key={t.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="px-5 py-3">
                    <Link href={`/tasks/${t.id}`} className="block">
                      <div className="font-medium text-stone-900 truncate max-w-md">{t.title}</div>
                      <div className="text-xs text-stone-400 font-mono">{t.reference}</div>
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <PriorityBadge priority={t.priority} small />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-3 py-3">
                    {t.owner ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={t.owner.full_name} size="xs" />
                        <span className="text-stone-700">{t.owner.full_name.split(' ')[0]}</span>
                      </div>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-stone-600">{t.entity?.name || '—'}</td>
                  <td className={`px-3 py-3 ${overdue ? 'text-red-700 font-medium' : 'text-stone-600'}`}>
                    {formatDateShort(t.accepted_deadline || t.proposed_deadline)}
                    {overdue && ' ⚠'}
                  </td>
                  <td className="px-3 py-3 text-stone-600">
                    {t.accepted_workload_percent ? `${t.accepted_workload_percent}%` : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/tasks/${t.id}`}>
                      <ChevronRight className="h-4 w-4 text-stone-400" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
