import Link from 'next/link';
import { Lock, Calendar, ChevronRight } from 'lucide-react';
import { Avatar, PriorityBadge } from './Badges';
import { SUBTASK_STATUS_LABEL } from '@/lib/subtask-workflow';
import { STATUS_CONFIG, formatDateShort, isOverdue, cn } from '@/lib/utils';
import type { SubtaskWithRelations } from '@/types/database';

export default function SubtaskCard({ subtask }: { subtask: SubtaskWithRelations }) {
  const masked = subtask.is_private && subtask.is_authorized === false;
  const overdue = subtask.due_date && isOverdue(subtask.due_date) && !['approved','cancelled'].includes(subtask.status);
  const statusLabel = SUBTASK_STATUS_LABEL[subtask.status] || STATUS_CONFIG[subtask.status].label;

  if (masked) {
    return (
      <div className="border border-sap-border bg-sap-bg rounded p-2.5 flex items-center gap-2">
        <Lock className="h-4 w-4 text-sap-text-secondary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-sap-text-secondary italic">Sous-tâche privée</div>
          <div className="text-[11px] text-sap-text-secondary">Contenu non accessible</div>
        </div>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-sm', STATUS_CONFIG[subtask.status].cls)}>{statusLabel}</span>
      </div>
    );
  }

  return (
    <div className="border border-sap-border bg-white rounded p-2.5 hover:shadow-sap-hover transition-shadow">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <PriorityBadge priority={subtask.priority} small />
            {subtask.is_private && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[10px] bg-sap-shell text-white rounded-sm">
                <Lock className="h-2.5 w-2.5" /> Privée
              </span>
            )}
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-sm font-medium', STATUS_CONFIG[subtask.status].cls)}>
              {statusLabel}
            </span>
          </div>
          <div className="text-sm font-medium text-sap-text leading-tight">{subtask.title}</div>
          {subtask.description && (
            <div className="text-xs text-sap-text-secondary mt-1 line-clamp-2">{subtask.description}</div>
          )}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-sap-text-secondary">
            {subtask.due_date && (
              <span className={`flex items-center gap-0.5 ${overdue ? 'text-sap-error font-medium' : ''}`}>
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
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-sap-text-secondary mt-0.5" />
      </div>
    </div>
  );
}
