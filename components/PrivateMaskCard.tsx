import { Lock } from 'lucide-react';
import { PriorityBadge, StatusBadge } from './Badges';
import { formatDateShort } from '@/lib/utils';
import type { TaskPriority, TaskStatus } from '@/types/database';

interface Props {
  variant?: 'task' | 'subtask';
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string | null;
}

export default function PrivateMaskCard({ variant = 'task', priority, status, due_date }: Props) {
  const label = variant === 'task' ? 'Tâche privée' : 'Sous-tâche privée';
  return (
    <div className="border border-sap-border bg-sap-bg rounded p-3 flex items-center gap-3">
      <Lock className="h-5 w-5 text-sap-text-secondary shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-sap-text">{label}</div>
        <div className="text-xs text-sap-text-secondary mt-0.5">Contenu non accessible</div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {priority && <PriorityBadge priority={priority} small />}
        {status && <StatusBadge status={status} />}
        {due_date && <span className="text-xs text-sap-text-secondary">{formatDateShort(due_date)}</span>}
      </div>
    </div>
  );
}
