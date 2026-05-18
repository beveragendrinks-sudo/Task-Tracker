'use client';

import { useState } from 'react';
import { Plus, ListChecks } from 'lucide-react';
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
  const [showForm, setShowForm] = useState(false);

  const total = subtasks.length;
  const completed = subtasks.filter(s => s.status === 'approved').length;
  const blocked = subtasks.filter(s => s.status === 'blocked').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-sap-surface border border-sap-border rounded shadow-sap-tile">
      <div className="px-4 py-2.5 border-b border-sap-border flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-sap-text-secondary" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sap-text-secondary flex-1">
          Sous-tâches
        </h2>
        <span className="text-[10px] px-1.5 py-0.5 bg-sap-bg text-sap-text-secondary rounded font-semibold">
          {total}
        </span>
        {canCreate && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-2 py-0.5 bg-sap-brand hover:bg-sap-brand-dark text-white text-xs rounded">
            <Plus className="h-3 w-3" /> Ajouter
          </button>
        )}
      </div>

      {total > 0 && (
        <div className="px-4 py-3 border-b border-sap-border-light">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 h-2 bg-sap-bg rounded overflow-hidden">
              <div className={`h-full ${pct === 100 ? 'bg-sap-success' : 'bg-sap-brand'}`}
                style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-sap-text-secondary tabular-nums">
              {completed}/{total} ({pct}%)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-sap-text-secondary">
            <span><strong className="text-sap-success">{completed}</strong> terminées</span>
            {blocked > 0 && <span className="text-sap-error"><strong>{blocked}</strong> bloquées</span>}
          </div>
        </div>
      )}

      <div className="p-3 space-y-2">
        {total === 0 ? (
          <div className="text-center py-6 text-sm text-sap-text-secondary">
            Aucune sous-tâche.
            {canCreate && (
              <button onClick={() => setShowForm(true)}
                className="block mx-auto mt-2 text-sap-brand hover:text-sap-brand-dark text-sm font-medium">
                + Créer la première sous-tâche
              </button>
            )}
          </div>
        ) : (
          subtasks.map(s => (
            <div key={s.id}>
              <SubtaskCard subtask={s} />
              {s.is_authorized !== false && (
                <div className="mt-1 pl-2">
                  <SubtaskActions subtask={s} parentTask={parentTask} profile={currentProfile} compact />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showForm && (
        <SubtaskForm
          parentTask={parentTask}
          users={users}
          currentProfile={currentProfile}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
