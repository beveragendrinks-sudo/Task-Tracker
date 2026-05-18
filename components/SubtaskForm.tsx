'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertCircle, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PriorityBadge } from './Badges';
import PrivacyToggle from './PrivacyToggle';
import { PRIORITY_CONFIG } from '@/lib/utils';
import type { Profile, TaskPriority, Task, SubtaskWithRelations } from '@/types/database';

interface Props {
  parentTask: Task;
  users: Profile[];
  siblings: SubtaskWithRelations[];
  currentProfile: Profile;
  onClose: () => void;
  onCreated?: () => void;
}

export default function SubtaskForm({ parentTask, users, siblings, currentProfile, onClose, onCreated }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string|null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    owner_id: '',
    priority: 'P3' as TaskPriority,
    due_date: '',
    workload_percent: 10,
    is_private: parentTask.is_private,
    depends_on_subtask_id: '',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!form.title.trim()) { setError('Titre obligatoire'); setSubmitting(false); return; }
    if (!form.owner_id) { setError('Responsable obligatoire'); setSubmitting(false); return; }

    const res = await fetch('/api/subtasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent_task_id: parentTask.id,
        title: form.title,
        description: form.description,
        owner_id: form.owner_id,
        priority: form.priority,
        due_date: form.due_date || null,
        workload_percent: form.workload_percent,
        is_private: form.is_private,
        depends_on_subtask_id: form.depends_on_subtask_id || null,
      }),
    });

    const json = await res.json();
    if (!res.ok) { setError(json.error || 'Erreur lors de la création'); setSubmitting(false); return; }

    // Fire-and-forget: notification + audit (non-bloquants)
    supabase.from('notifications').insert({
      user_id: form.owner_id,
      type: 'task_assigned',
      title: `Nouvelle sous-tâche : ${form.title}`,
      message: `${currentProfile.full_name} vous a assigné une sous-tâche dans "${parentTask.title}".`,
      task_id: parentTask.id,
    });
    supabase.from('audit_log').insert({
      user_id: currentProfile.id,
      user_role: currentProfile.role,
      action: 'subtask.create',
      object_type: 'subtask',
      object_id: json.subtask?.id,
      new_value: { title: form.title, is_private: form.is_private },
    });

    setSubmitting(false);
    onCreated?.();
    onClose();
    router.refresh();
  };

  const activeUsers = users.filter(u => u.is_active);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-serif text-lg text-slate-900">Nouvelle sous-tâche</h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">dans : {parentTask.title}</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form — scrollable body + pinned footer */}
        <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Titre <span className="text-red-500">*</span>
              </label>
              <input type="text" required value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Ex : Valider le BAT avec le fournisseur"
                className="input-base" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={3} placeholder="Détails, contexte, livrables..."
                className="input-base resize-none" />
            </div>

            {/* Responsable */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Responsable <span className="text-red-500">*</span>
              </label>
              <select required value={form.owner_id}
                onChange={e => setForm({ ...form, owner_id: e.target.value })}
                className="input-base">
                <option value="">— Sélectionner —</option>
                {activeUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}{u.job_title ? ` — ${u.job_title}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Priorité */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Priorité</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map(p => (
                  <button key={p} type="button" onClick={() => setForm({ ...form, priority: p })}
                    className={`px-3 py-2 border-2 rounded-lg transition-all ${
                      form.priority === p
                        ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300 ring-offset-1'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}>
                    <PriorityBadge priority={p} small />
                  </button>
                ))}
              </div>
            </div>

            {/* Date + Charge */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date limite</label>
                <input type="date" value={form.due_date}
                  onChange={e => setForm({ ...form, due_date: e.target.value })}
                  className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Charge (%)</label>
                <div className="flex items-center gap-2 pt-1.5">
                  <input type="range" min="5" max="50" value={form.workload_percent}
                    onChange={e => setForm({ ...form, workload_percent: +e.target.value })}
                    className="flex-1 accent-amber-600" />
                  <span className="text-sm font-mono tabular-nums w-10 text-right">{form.workload_percent}%</span>
                </div>
              </div>
            </div>

            {/* Dépendance */}
            {siblings.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dépend de</label>
                <select value={form.depends_on_subtask_id}
                  onChange={e => setForm({ ...form, depends_on_subtask_id: e.target.value })}
                  className="input-base">
                  <option value="">— Aucune dépendance —</option>
                  {siblings.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Cette sous-tâche ne pourra démarrer que si la dépendance est terminée.</p>
              </div>
            )}

            {/* Privacy */}
            <PrivacyToggle
              value={form.is_private}
              onChange={v => setForm({ ...form, is_private: v })}
              label="Sous-tâche privée"
              description="Seul le créateur et le responsable verront le contenu." />

            {parentTask.is_private && !form.is_private && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠ La tâche parente est privée. Décocher rend cette sous-tâche visible à plus d'utilisateurs.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer — pinned, always visible */}
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0 rounded-b-2xl sm:rounded-b-xl">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-1.5">
              <Send className="h-4 w-4" />
              {submitting ? 'Envoi...' : 'Créer la sous-tâche'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
