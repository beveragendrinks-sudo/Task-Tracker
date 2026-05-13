import { PRIORITY_CONFIG, STATUS_CONFIG, getInitials } from '@/lib/utils';
import type { TaskPriority, TaskStatus } from '@/types/database';

export function Avatar({ name, size = 'sm' }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base'
  };
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-semibold ring-2 ring-white shrink-0 shadow-sm`}>
      {getInitials(name)}
    </div>
  );
}

export function PriorityBadge({ priority, small }: { priority: TaskPriority; small?: boolean }) {
  return (
    <span className={`inline-flex items-center font-bold tracking-wide ${
      small ? 'px-1.5 py-0.5 text-[10px] rounded' : 'px-2 py-0.5 text-xs rounded-md'
    } ${PRIORITY_CONFIG[priority].color}`}>
      {priority}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${
      STATUS_CONFIG[status].color
    }`}>
      {STATUS_CONFIG[status].label}
    </span>
  );
}
