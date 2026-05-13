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
  negotiationReason?: string | null;
  negotiationFrom?: string | null;
}

export default function TaskActions({ task, profile, negotiationReason, negotiationFrom }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReason, setShowReason] = useState<{ to: TaskStatus; label: string } | null>(null);
  const [reason, setReason] = useState('');
  const [showRefusal, setShowRefusal] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');

  const transitions = getAvailableTransitions(
    { status: task.status, owner_id: task.owner_id, created_by: task.created_by },
    profile.id,
    profile.role
  );

  const handleTransition = async (toStatus: TaskStatus, label: string, reasonText?: string) => {
    setError(null);
    setLoading(toStatus);

    // Vérifier DoD localement pour feedback rapide
    if (toStatus === 'closed_by_owner') {
      const dod = (task.definition_of_done as any[]) || [];
      const undone = dod.filter(d => !d.done);
      if (undone.length > 0) {
        setError(`Impossible de clôturer : ${undone.length} critère(s) DoD non rempli(s).`);
        setLoading(null);
        return;
      }
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_status: toStatus, reason: reasonText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Erreur lors de la transition');
        setLoading(null);
        return;
      }

      setLoading(null);
      setShowReason(null);
      setReason('');
      router.refresh();
    } catch (err) {
      setError('Erreur réseau');
      setLoading(null);
    }
  };

  const onClick = (toStatus: TaskStatus, label: string, requiresReason?: boolean) => {
    if (requiresReason) {
      setShowReason({ to: toStatus, label });
    } else {
      handleTransition(toStatus, label);
    }
  };

  const handleRefusal = async () => {
    setError(null);
    setLoading('refuse');

    if (!task.owner_id) {
      setError("Aucun responsable à notifier.");
      setLoading(null);
      return;
    }

    // Insérer dans l'historique (sans changer de statut)
    const { error: histError } = await supabase.from('task_status_history').insert({
      task_id: task.id,
      from_status: task.status,
      to_status: task.status,
      changed_by: profile.id,
      reason: refusalReason,
    });

    if (histError) {
      setError(histError.message);
      setLoading(null);
      return;
    }

    // Notifier le responsable
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: task.owner_id,
      type: 'change_requested',
      title: `Modification refusée : ${task.title}`,
      message: refusalReason || 'Modification refusée',
      task_id: task.id,
      related_user_id: profile.id,
    });

    if (notifError) {
      setError(notifError.message);
      setLoading(null);
      return;
    }

    setShowRefusal(false);
    setRefusalReason('');
    setLoading(null);
    router.refresh();
  };

  // Filtrer les transitions affichées pour éviter les doublons sous la bannière de négociation
  const visibleTransitions = transitions.filter(t => {
    if (task.status === 'negotiation' && profile.id === task.created_by) {
      return !['assigned', 'cancelled'].includes(t.to);
    }
    return true;
  });

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

      {/* Si en négociation, afficher le message et actions claires pour le créateur */}
      {task.status === 'negotiation' && profile.id === task.created_by && negotiationReason && (
        <div className="mb-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-sm text-stone-700 mb-2">
              <span className="font-medium">{negotiationFrom || 'Responsable'}</span>
              <span className="text-stone-600"> a demandé une modification :</span>
            </div>
            <div className="text-sm text-stone-800 whitespace-pre-wrap mb-3">{negotiationReason || ''}</div>
            <div className="flex gap-2">
              {transitions.find(t => t.to === 'assigned') && (
                <button
                  onClick={() => onClick('assigned', transitions.find(t => t.to === 'assigned')!.label, transitions.find(t => t.to === 'assigned')!.requiresReason)}
                  disabled={loading !== null}
                  className="px-3 py-2 bg-emerald-700 text-white rounded-lg text-sm"
                >
                  Accepter
                </button>
              )}
              <button
                onClick={() => setShowRefusal(true)}
                disabled={loading !== null}
                className="px-3 py-2 bg-stone-800 text-white rounded-lg text-sm"
              >
                Refuser
              </button>
              {transitions.find(t => t.to === 'cancelled') && (
                <button
                  onClick={() => onClick('cancelled', transitions.find(t => t.to === 'cancelled')!.label, transitions.find(t => t.to === 'cancelled')!.requiresReason)}
                  disabled={loading !== null}
                  className="px-3 py-2 bg-red-700 text-white rounded-lg text-sm"
                >
                  Annuler la tâche
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {visibleTransitions.map(t => {
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

      {/* Modal refus de modification */}
      {showRefusal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-serif text-lg mb-2">Refuser la modification</h3>
            <p className="text-sm text-stone-500 mb-3">Expliquez pourquoi vous refusez la modification (sera envoyé au responsable).</p>
            <textarea
              value={refusalReason}
              onChange={e => setRefusalReason(e.target.value)}
              rows={4}
              placeholder="Expliquez votre décision..."
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowRefusal(false); setRefusalReason(''); }}
                className="px-4 py-2 text-sm text-stone-700"
              >
                Annuler
              </button>
              <button
                onClick={handleRefusal}
                disabled={!refusalReason.trim() || loading !== null}
                className="px-4 py-2 bg-stone-900 text-white text-sm rounded-lg hover:bg-stone-800 disabled:opacity-50"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
