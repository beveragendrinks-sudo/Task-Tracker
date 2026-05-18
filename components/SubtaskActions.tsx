'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, AlertCircle, X, Lock } from 'lucide-react';
import { getAvailableSubtaskTransitions } from '@/lib/subtask-workflow';
import type { Profile, SubtaskWithRelations, Task, TaskStatus } from '@/types/database';

interface Props {
  subtask: SubtaskWithRelations;
  parentTask: Task;
  profile: Profile;
  compact?: boolean;
  dependencyReady?: boolean;
}

export default function SubtaskActions({ subtask, parentTask, profile, compact = false, dependencyReady = true }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);
  const [showReason, setShowReason] = useState<{ to: TaskStatus; label: string } | null>(null);
  const [reason, setReason] = useState('');

  const transitions = getAvailableSubtaskTransitions(
    {
      status: subtask.status,
      owner_id: subtask.owner_id,
      created_by: subtask.created_by,
      parent_owner_id: parentTask.owner_id,
      parent_created_by: parentTask.created_by,
    },
    profile.id, profile.role
  );

  // Block "Démarrer" if dependency not yet complete
  const depBlocksStart = !dependencyReady && transitions.some(t => t.to === 'active');
  const visibleTransitions = transitions.filter(t => !(depBlocksStart && t.to === 'active'));

  const handleTransition = async (toStatus: TaskStatus, reasonText?: string) => {
    setError(null);
    setLoading(toStatus);

    const res = await fetch(`/api/subtasks/${subtask.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_status: toStatus, reason: reasonText }),
    });

    const json = await res.json();
    if (!res.ok) { setError(json.error || 'Erreur lors de la transition'); setLoading(null); return; }

    setLoading(null);
    setShowReason(null);
    setReason('');
    router.refresh();
  };

  const onClick = (toStatus: TaskStatus, label: string, requiresReason?: boolean) => {
    if (requiresReason) setShowReason({ to: toStatus, label });
    else handleTransition(toStatus);
  };

  if (transitions.length === 0 && !depBlocksStart) return null;

  return (
    <>
      <div className={compact ? 'flex flex-wrap gap-1.5 mt-1' : 'space-y-1.5'}>
        {visibleTransitions.map(t => {
          const cls =
            t.tone === 'positive' ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
          : t.tone === 'negative' ? 'bg-red-600 hover:bg-red-700 text-white'
          : 'bg-slate-700 hover:bg-slate-800 text-white';
          return (
            <button key={t.to} onClick={() => onClick(t.to, t.label, t.requiresReason)}
              disabled={loading !== null}
              className={`${compact ? 'px-2.5 py-1 text-xs' : 'w-full justify-center px-3 py-1.5 text-sm'} inline-flex items-center gap-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors ${cls}`}>
              {loading === t.to ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {t.label}
            </button>
          );
        })}
        {depBlocksStart && (
          <div className={`${compact ? 'text-xs' : 'text-sm'} flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg`}>
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>En attente de la sous-tâche dépendante</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-2.5 py-2 flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {showReason && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-serif text-lg text-slate-900">{showReason.label}</h3>
              <button onClick={() => { setShowReason(null); setReason(''); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-500 mb-3">Raison obligatoire.</p>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
                placeholder="Expliquez la raison..."
                className="input-base resize-none" autoFocus />
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 rounded-b-xl">
              <button onClick={() => { setShowReason(null); setReason(''); }} className="btn-secondary">Annuler</button>
              <button onClick={() => handleTransition(showReason.to, reason)}
                disabled={!reason.trim() || loading !== null}
                className="btn-primary">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
