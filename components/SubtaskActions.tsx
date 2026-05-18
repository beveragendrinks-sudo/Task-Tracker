'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAvailableSubtaskTransitions } from '@/lib/subtask-workflow';
import type { Profile, Subtask, Task, TaskStatus } from '@/types/database';

interface Props {
  subtask: Subtask;
  parentTask: Task;
  profile: Profile;
  compact?: boolean;
}

export default function SubtaskActions({ subtask, parentTask, profile, compact = false }: Props) {
  const router = useRouter();
  const supabase = createClient();
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

  const handleTransition = async (toStatus: TaskStatus, reasonText?: string) => {
    setError(null);
    setLoading(toStatus);

    const updates: any = { status: toStatus };
    if (toStatus === 'accepted')        updates.accepted_at = new Date().toISOString();
    if (toStatus === 'closed_by_owner') updates.closed_at = new Date().toISOString();
    if (toStatus === 'approved')        { updates.approved_at = new Date().toISOString(); updates.completed_at = new Date().toISOString(); }
    if (toStatus === 'rejected_closure') updates.rejection_reason = reasonText;
    if (toStatus === 'cancelled')       updates.cancelled_at = new Date().toISOString();

    const { error: err } = await supabase.from('task_subtasks').update(updates).eq('id', subtask.id);
    if (err) { setError(err.message); setLoading(null); return; }

    if (reasonText) {
      await supabase.from('subtask_status_history').insert({
        subtask_id: subtask.id, from_status: subtask.status, to_status: toStatus,
        changed_by: profile.id, reason: reasonText,
      });
    }

    await supabase.from('audit_log').insert({
      user_id: profile.id,
      user_role: profile.role,
      action: `subtask.transition.${toStatus}`,
      object_type: 'subtask',
      object_id: subtask.id,
      old_value: { status: subtask.status },
      new_value: { status: toStatus },
      reason: reasonText,
    });

    setLoading(null);
    setShowReason(null);
    setReason('');
    router.refresh();
  };

  const onClick = (toStatus: TaskStatus, label: string, requiresReason?: boolean) => {
    if (requiresReason) setShowReason({ to: toStatus, label });
    else handleTransition(toStatus);
  };

  if (transitions.length === 0) return null;

  return (
    <>
      <div className={compact ? 'flex flex-wrap gap-1' : 'space-y-1.5'}>
        {transitions.map(t => {
          const bgCls = t.tone === 'positive' ? 'bg-sap-success hover:bg-sap-success/90'
                     : t.tone === 'negative' ? 'bg-sap-error hover:bg-sap-error/90'
                     : 'bg-sap-shell hover:bg-sap-shell-dark';
          return (
            <button key={t.to} onClick={() => onClick(t.to, t.label, t.requiresReason)}
              disabled={loading !== null}
              className={`${compact ? 'px-2 py-1 text-xs' : 'w-full justify-center px-3 py-1.5 text-sm'} flex items-center gap-1.5 rounded font-medium text-white disabled:opacity-50 ${bgCls}`}>
              {loading === t.to ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-2 bg-sap-error-bg border border-sap-error/30 text-sap-error text-xs rounded px-2 py-1.5 flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {showReason && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-sap-card max-w-md w-full">
            <div className="border-b border-sap-border px-5 py-3">
              <h3 className="text-lg font-light text-sap-text">{showReason.label}</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-sap-text-secondary mb-3">Raison obligatoire.</p>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="Expliquez..."
                className="w-full border border-sap-border rounded px-2 py-1.5 text-sm" autoFocus />
            </div>
            <div className="border-t border-sap-border bg-sap-bg px-5 py-3 flex justify-end gap-2">
              <button onClick={() => { setShowReason(null); setReason(''); }} className="px-3 py-1.5 text-sm text-sap-text hover:bg-sap-border-light rounded">Annuler</button>
              <button onClick={() => handleTransition(showReason.to, reason)} disabled={!reason.trim() || loading !== null}
                className="px-3 py-1.5 bg-sap-brand text-white text-sm rounded hover:bg-sap-brand-dark disabled:opacity-50">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
