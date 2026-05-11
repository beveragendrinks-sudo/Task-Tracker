'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAvailableTransitions } from '@/lib/workflow';
import type { Task, Profile, TaskStatus } from '@/types/database';

interface Props {
  task: Task;
  profile: Profile;
}

export default function TaskActions({ task, profile }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReason, setShowReason] = useState<{ to: TaskStatus; label: string } | null>(null);
  const [reason, setReason] = useState('');

  const transitions = getAvailableTransitions(
    { status: task.status, owner_id: task.owner_id, created_by: task.created_by },
    profile.id,
    profile.role
  );

  const handleTransition = async (toStatus: TaskStatus, label: string, reasonText?: string) => {
    setError(null);
    setLoading(toStatus);

    // Vérifier DoD si nécessaire (closed_by_owner)
    if (toStatus === 'closed_by_owner') {
      const dod = (task.definition_of_done as any[]) || [];
      const undone = dod.filter(d => !d.done);
      if (undone.length > 0) {
        setError(`Impossible de clôturer : ${undone.length} critère(s) DoD non rempli(s).`);
        setLoading(null);
        return;
      }
    }

    // Préparer les updates
    const updates: any = { status: toStatus };

    if (toStatus === 'accepted') {
      updates.accepted_deadline = task.proposed_deadline;
      updates.accepted_workload_percent = task.proposed_workload_percent;
      updates.workload_start_date = new Date().toISOString().split('T')[0];
      if (task.proposed_deadline) {
        updates.workload_end_date = task.proposed_deadline.split('T')[0];
      }
    }
    if (toStatus === 'active' && !task.start_date_actual) {
      updates.start_date_actual = new Date().toISOString();
    }
    if (toStatus === 'closed_by_owner') {
      updates.closed_by_owner_at = new Date().toISOString();
    }
    if (toStatus === 'approved') {
      updates.approved_at = new Date().toISOString();
    }
    if (toStatus === 'rejected_closure') {
      updates.rejected_at = new Date().toISOString();
      updates.rejection_reason = reasonText;
    }
    if (toStatus === 'cancelled') {
      updates.cancelled_at = new Date().toISOString();
      updates.cancellation_reason = reasonText;
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', task.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(null);
      return;
    }

    // Audit log avec raison
    if (reasonText) {
      await supabase.from('task_status_history').insert({
        task_id: task.id,
        from_status: task.status,
        to_status: toStatus,
        changed_by: profile.id,
        reason: reasonText,
      });
    }

    // Notification au créateur ou owner selon transition
    const notifMap: Record<string, { user: string; type: string; title: string }> = {
      accepted:        { user: task.created_by,     type: 'deadline_accepted',  title: `Tâche acceptée : ${task.title}` },
      negotiation:     { user: task.created_by,     type: 'change_requested',   title: `Modification demandée : ${task.title}` },
      active:          { user: task.created_by,     type: 'task_activated',     title: `Tâche démarrée : ${task.title}` },
      blocked:         { user: task.created_by,     type: 'task_blocked',       title: `Tâche bloquée : ${task.title}` },
      closed_by_owner: { user: task.created_by,     type: 'task_closed',        title: `À approuver : ${task.title}` },
      approved:        { user: task.owner_id || '', type: 'closure_approved',   title: `Clôture approuvée : ${task.title}` },
      rejected_closure:{ user: task.owner_id || '', type: 'closure_rejected',   title: `Clôture rejetée : ${task.title}` },
    };

    const n = notifMap[toStatus];
    if (n && n.user) {
      await supabase.from('notifications').insert({
        user_id: n.user,
        type: n.type,
        title: n.title,
        message: reasonText ? `Raison : ${reasonText}` : 'Action sans commentaire.',
        task_id: task.id,
        related_user_id: profile.id,
      });
    }

    setLoading(null);
    setShowReason(null);
    setReason('');
    router.refresh();
  };

  const onClick = (toStatus: TaskStatus, label: string, requiresReason?: boolean) => {
    if (requiresReason) {
      setShowReason({ to: toStatus, label });
    } else {
      handleTransition(toStatus, label);
    }
  };

  if (transitions.length === 0) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-sm text-stone-500 text-center">
        Aucune action disponible
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">Actions</h3>

      <div className="space-y-2">
        {transitions.map(t => {
          const isPositive = ['accepted', 'active', 'approved', 'closed_by_owner'].includes(t.to);
          const isNegative = ['rejected_closure', 'cancelled', 'blocked'].includes(t.to);

          return (
            <button
              key={t.to}
              onClick={() => onClick(t.to, t.label, t.requiresReason)}
              disabled={loading !== null}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                isPositive
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : isNegative
                  ? 'bg-red-700 text-white hover:bg-red-800'
                  : 'bg-stone-800 text-white hover:bg-stone-900'
              }`}
            >
              <span className="flex items-center gap-2">
                {loading === t.to ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded p-2 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Modal raison */}
      {showReason && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-serif text-lg mb-2">{showReason.label}</h3>
            <p className="text-sm text-stone-500 mb-3">Une raison est requise pour cette action.</p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              placeholder="Expliquez la raison..."
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowReason(null); setReason(''); }}
                className="px-4 py-2 text-sm text-stone-700"
              >
                Annuler
              </button>
              <button
                onClick={() => handleTransition(showReason.to, showReason.label, reason)}
                disabled={!reason.trim() || loading !== null}
                className="px-4 py-2 bg-stone-900 text-white text-sm rounded-lg hover:bg-stone-800 disabled:opacity-50"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
