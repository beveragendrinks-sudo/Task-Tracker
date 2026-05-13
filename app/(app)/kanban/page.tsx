import Link from 'next/link';
import { Calendar, MessageSquare, Paperclip, Sparkles, Ban } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Header from '@/components/Header';
import { PriorityBadge, Avatar } from '@/components/Badges';
import { KANBAN_COLUMNS, STATUS_CONFIG, formatDateShort, isOverdue } from '@/lib/utils';

export default async function KanbanPage() {
  const supabase = createClient();

  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      entity:entities!tasks_entity_id_fkey(name),
      owner:profiles!tasks_owner_id_fkey(id, full_name)
    `)
    .order('priority', { ascending: true });

  const tasksList = tasks || [];

  return (
    <>
      <Header title="Kanban Board" subtitle="Pilotage visuel des tâches" />

      <div className="p-8">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(status => {
            const colTasks = tasksList.filter(t => t.status === status);
            return (
              <div key={status} className="bg-stone-100 rounded-xl p-3 min-w-[280px] w-[280px] shrink-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-serif text-sm font-medium text-stone-800">
                    {STATUS_CONFIG[status].kanban}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 bg-stone-200 text-stone-700 rounded-full font-medium">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 scrollbar-thin">
                  {colTasks.length === 0 && (
                    <div className="text-center py-6 text-xs text-stone-400 italic">Aucune tâche</div>
                  )}
                  {colTasks.map(t => {
                    const overdue = t.accepted_deadline && isOverdue(t.accepted_deadline) &&
                      !['approved', 'cancelled'].includes(t.status);

                    return (
                      <Link
                        key={t.id}
                        href={`/tasks/${t.id}`}
                        className={`block bg-white border border-stone-200 rounded-lg p-3 cursor-pointer hover:border-amber-700 hover:shadow-md transition-all ${
                          t.priority === 'P1' ? 'border-l-4 border-l-red-600' :
                          t.priority === 'P2' ? 'border-l-4 border-l-orange-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <PriorityBadge priority={t.priority} small />
                            {t.ai_risk_score && t.ai_risk_score > 0.6 && (
                              <Sparkles className="h-3 w-3 text-amber-600" />
                            )}
                            {t.status === 'blocked' && <Ban className="h-3 w-3 text-red-600" />}
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono">{t.reference}</div>
                        </div>

                        <h4 className="text-sm font-medium text-stone-900 leading-snug mb-2">
                          {t.title}
                        </h4>

                        <div className="text-[11px] text-stone-600 mb-2">
                          {(t as any).entity?.name}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2 text-[11px] text-stone-500">
                            {t.accepted_deadline && (
                              <div className={`flex items-center gap-0.5 ${overdue ? 'text-red-700 font-medium' : ''}`}>
                                <Calendar className="h-3 w-3" />
                                <span>{formatDateShort(t.accepted_deadline)}</span>
                              </div>
                            )}
                          </div>
                          {(t as any).owner && <Avatar name={(t as any).owner.full_name} size="xs" />}
                        </div>

                        {t.accepted_workload_percent && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1 bg-stone-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-700 rounded-full"
                                style={{ width: `${Math.min(t.accepted_workload_percent, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-stone-500 font-medium">
                              {t.accepted_workload_percent}%
                            </span>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
