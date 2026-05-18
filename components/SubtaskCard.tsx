import Link from 'next/link';
import { Lock, Calendar, ChevronRight, Link2 } from 'lucide-react';
import { Avatar, PriorityBadge } from './Badges';
import { SUBTASK_STATUS_LABEL } from '@/lib/subtask-workflow';
import { STATUS_CONFIG, formatDateShort, isOverdue, cn } from '@/lib/utils';
import type { SubtaskWithRelations } from '@/types/database';

interface Props {
  subtask: SubtaskWithRelations;
  dependsOnTitle?: string | null;
  dependencyReady?: boolean;
}

export default function SubtaskCard({ subtask, dependsOnTitle, dependencyReady = true }: Props) {
  const masked = subtask.is_private && subtask.is_authorized === false;
  const overdue = subtask.due_date && isOverdue(subtask.due_date) && !['approved','cancelled'].includes(subtask.status);
  const statusLabel = SUBTASK_STATUS_LABEL[subtask.status] || STATUS_CONFIG[subtask.status]?.label || subtask.status;

  if (masked) {
    return (
      <div className="border border-slate-200 bg-slate-50 rounded-lg p-3 flex items-center gap-2">
        <Lock className="h-4 w-4 text-slate-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-400 italic">Sous-tâche privée</div>
          <div className="text-[11px] text-slate-400">Contenu non accessible</div>
        </div>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded', STATUS_CONFIG[subtask.status]?.color)}>{statusLabel}</span>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 bg-white rounded-lg p-3 hover:border-amber-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <PriorityBadge priority={subtask.priority} small />
            {subtask.is_private && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-slate-800 text-white rounded">
                <Lock className="h-2.5 w-2.5" /> Privée
              </span>
            )}
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', STATUS_CONFIG[subtask.status]?.color)}>
              {statusLabel}
            </span>
          </div>
          <div className="text-sm font-medium text-slate-900 leading-tight">{subtask.title}</div>
          {subtask.description && (
            <div className="text-xs text-slate-500 mt-1 line-clamp-2">{subtask.description}</div>
          )}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
            {subtask.due_date && (
              <span className={`flex items-center gap-0.5 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                <Calendar className="h-3 w-3" />
                {formatDateShort(subtask.due_date)}
                {overdue && ' ⚠'}
              </span>
            )}
            {subtask.owner && (
              <span className="flex items-center gap-1">
                <Avatar name={subtask.owner.full_name} size="xs" />
                <span>{subtask.owner.full_name.split(' ')[0]}</span>
              </span>
            )}
            {dependsOnTitle && (
              <span className={`flex items-center gap-0.5 ${!dependencyReady ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                <Link2 className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[9rem]">{dependsOnTitle}</span>
                {!dependencyReady && <span className="ml-0.5">⏳</span>}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
      </div>
    </div>
  );
}
