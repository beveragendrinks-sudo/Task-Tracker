'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ListChecks, Link2, Pencil, X, Check, Loader2 } from 'lucide-react';
import SubtaskCard from './SubtaskCard';
import SubtaskActions from './SubtaskActions';
import SubtaskForm from './SubtaskForm';
import type { SubtaskWithRelations, Task, Profile } from '@/types/database';

interface Props {
  parentTask: Task;
  subtasks: SubtaskWithRelations[];
  users: Profile[];
  currentProfile: Profile;
  canCreate: boolean;
}

export default function SubtaskList({ parentTask, subtasks, users, currentProfile, canCreate }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingDep, setEditingDep] = useState<string | null>(null); // subtask id being edited
  const [depValue, setDepValue]     = useState<string>('');          // selected depends_on id
  const [depLoading, setDepLoading] = useState(false);

  const openDepEdit = (s: SubtaskWithRelations) => {
    setDepValue(s.depends_on_subtask_id ?? '');
    setEditingDep(s.id);
  };

  const saveDep = async (subtaskId: string) => {
    setDepLoading(true);
    await fetch(`/api/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depends_on_subtask_id: depValue || null }),
    });
    setDepLoading(false);
    setEditingDep(null);
    router.refresh();
  };

  // Lookup map for dependency resolution
  const subtaskById = Object.fromEntries(subtasks.map(s => [s.id, s]));

  const total = subtasks.length;
  const completed = subtasks.filter(s => s.status === 'approved').length;
  const blocked = subtasks.filter(s => s.status === 'blocked').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-card">
      <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-stone-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex-1">
          Sous-tâches
        </h2>
        <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded-full font-semibold">
          {total}
        </span>
        {canCreate && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg transition-colors">
            <Plus className="h-3 w-3" /> Ajouter
          </button>
        )}
      </div>

      {total > 0 && (
        <div className="px-4 py-3 border-b border-stone-100">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-stone-500 tabular-nums">{completed}/{total} ({pct}%)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-stone-500">
            <span><strong className="text-emerald-600">{completed}</strong> terminées</span>
            {blocked > 0 && <span><strong className="text-red-600">{blocked}</strong> bloquées</span>}
          </div>
        </div>
      )}

      <div className="p-3 space-y-2">
        {total === 0 ? (
          <div className="text-center py-8 text-sm text-stone-400">
            Aucune sous-tâche.
            {canCreate && (
              <button onClick={() => setShowForm(true)}
                className="block mx-auto mt-2 text-amber-600 hover:text-amber-700 text-sm font-medium">
                + Créer la première sous-tâche
              </button>
            )}
          </div>
        ) : (
          subtasks.map(s => {
            const dep = s.depends_on_subtask_id ? subtaskById[s.depends_on_subtask_id] : null;
            const dependsOnTitle = dep?.title ?? null;
            const dependencyReady = !dep || ['approved', 'closed_by_owner'].includes(dep.status);
            const siblings = subtasks.filter(o => o.id !== s.id);
            return (
            <div key={s.id} className="space-y-1">
              <SubtaskCard subtask={s} dependsOnTitle={dependsOnTitle} dependencyReady={dependencyReady} />

              {/* Dependency editor */}
              {canCreate && (
                <div className="pl-2">
                  {editingDep === s.id ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={depValue}
                        onChange={e => setDepValue(e.target.value)}
                        className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400">
                        <option value="">— Aucune dépendance —</option>
                        {siblings.map(o => (
                          <option key={o.id} value={o.id}>{o.title}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => saveDep(s.id)}
                        disabled={depLoading}
                        className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
                        {depLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => setEditingDep(null)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openDepEdit(s)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-600 transition-colors">
                      <Link2 className="h-3 w-3" />
                      {dep
                        ? <span>Dépend de : <span className="font-medium">{dep.title}</span> <Pencil className="inline h-2.5 w-2.5" /></span>
                        : <span>Ajouter une dépendance</span>}
                    </button>
                  )}
                </div>
              )}

              {/* Actions */}
              {s.is_authorized !== false && (
                <div className="pl-2">
                  <SubtaskActions subtask={s} parentTask={parentTask} profile={currentProfile} compact
                    dependencyReady={dependencyReady} />
                </div>
              )}
            </div>
            );
          })
        )}
      </div>

      {showForm && (
        <SubtaskForm
          parentTask={parentTask}
          users={users}
          siblings={subtasks}
          currentProfile={currentProfile}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
