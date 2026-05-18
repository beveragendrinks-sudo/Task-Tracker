'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, AlertCircle, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PriorityBadge } from './Badges';
import PrivacyToggle from './PrivacyToggle';
import { PRIORITY_CONFIG } from '@/lib/utils';
import type { Profile, TaskPriority, Task } from '@/types/database';

interface Props {
  parentTask: Task;
  users: Profile[];
  currentProfile: Profile;
  onClose: () => void;
  onCreated?: () => void;
}

export default function SubtaskForm({ parentTask, users, currentProfile, onClose, onCreated }: Props) {
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
    is_private: parentTask.is_private,  // hérite par défaut
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (!form.title.trim()) { setError('Titre obligatoire'); setSubmitting(false); return; }
    if (!form.owner_id) { setError('Responsable obligatoire'); setSubmitting(false); return; }

    const { data: subtask, error: err } = await supabase
      .from('task_subtasks')
      .insert({
        parent_task_id: parentTask.id,
        title: form.title,
        description: form.description,
        owner_id: form.owner_id,
        created_by: currentProfile.id,
        status: 'draft',
        priority: form.priority,
        due_date: form.due_date || null,
        workload_percent: form.workload_percent,
        is_private: form.is_private,
      })
      .select()
      .single();

    if (err) { setError(err.message); setSubmitting(false); return; }

    // Notification owner sous-tâche
    await supabase.from('notifications').insert({
      user_id: form.owner_id,
      type: 'task_assigned',
      title: `Nouvelle sous-tâche : ${form.title}`,
      message: `${currentProfile.full_name} vous a assigné une sous-tâche dans "${parentTask.title}".`,
      task_id: parentTask.id,
      email_required: ['P1','P2'].includes(form.priority),
    });

    // Audit
    await supabase.from('audit_log').insert({
      user_id: currentProfile.id,
      user_role: currentProfile.role,
      action: 'subtask.create',
      object_type: 'subtask',
      object_id: subtask.id,
      new_value: { title: form.title, is_private: form.is_private },
    });

    setSubmitting(false);
    onCreated?.();
    onClose();
    router.refresh();
  };

  const activeUsers = users.filter(u => u.is_active);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded shadow-sap-card max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="border-b border-sap-border px-5 py-3 sticky top-0 bg-white flex items-center justify-between">
          <h3 className="text-lg font-light text-sap-text">Nouvelle sous-tâche</h3>
          <button onClick={onClose} className="p-1 hover:bg-sap-bg rounded">
            <X className="h-4 w-4 text-sap-text-secondary" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="text-xs text-sap-text-secondary bg-sap-bg rounded px-2 py-1.5">
            Dans la tâche : <strong className="text-sap-text">{parentTask.title}</strong>
          </div>

          <div>
            <label className="block text-xs font-medium text-sap-text mb-1">
              Titre <span className="text-sap-error">*</span>
            </label>
            <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              placeholder="Ex : Valider le BAT avec le fournisseur"
              className="w-full border border-sap-border rounded px-3 py-1.5 text-sm focus:border-sap-brand focus:outline-none focus:ring-1 focus:ring-sap-brand" />
          </div>

          <div>
            <label className="block text-xs font-medium text-sap-text mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              rows={3} placeholder="Détails, contexte, livrables..."
              className="w-full border border-sap-border rounded px-3 py-1.5 text-sm focus:border-sap-brand focus:outline-none focus:ring-1 focus:ring-sap-brand" />
          </div>

          <div>
            <label className="block text-xs font-medium text-sap-text mb-1">
              Responsable <span className="text-sap-error">*</span>
            </label>
            <select required value={form.owner_id} onChange={e => setForm({...form, owner_id: e.target.value})}
              className="w-full border border-sap-border rounded px-2 py-1.5 text-sm bg-white">
              <option value="">— Sélectionner —</option>
              {activeUsers.map(u => <option key={u.id} value={u.id}>{u.full_name} — {u.job_title}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-sap-text mb-1.5">Priorité</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map(p => (
                <button key={p} type="button" onClick={() => setForm({...form, priority: p})}
                  className={`px-2 py-1.5 border rounded text-sm ${
                    form.priority === p ? 'border-sap-brand bg-sap-brand-light' : 'border-sap-border hover:border-sap-text-secondary bg-white'
                  }`}>
                  <PriorityBadge priority={p} small />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-sap-text mb-1">Date limite</label>
              <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})}
                className="w-full border border-sap-border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-sap-text mb-1">Charge (%)</label>
              <div className="flex items-center gap-2">
                <input type="range" min="5" max="50" value={form.workload_percent}
                  onChange={e => setForm({...form, workload_percent: +e.target.value})}
                  className="flex-1 accent-sap-brand" />
                <span className="text-sm tabular-nums w-10 text-right">{form.workload_percent}%</span>
              </div>
            </div>
          </div>

          <PrivacyToggle
            value={form.is_private}
            onChange={v => setForm({...form, is_private: v})}
            label="Sous-tâche privée"
            description="Seul le créateur et le responsable verront le contenu. Ajoutez d'autres utilisateurs après création si besoin."
          />

          {parentTask.is_private && !form.is_private && (
            <div className="text-xs text-sap-warning bg-sap-warning-bg border border-sap-warning/30 rounded px-2 py-1.5">
              ⚠ La tâche parente est privée. Décocher rend cette sous-tâche visible à plus d'utilisateurs.
            </div>
          )}

          {error && (
            <div className="bg-sap-error-bg border border-sap-error/30 text-sap-error text-sm rounded px-3 py-2 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}
        </form>

        <div className="border-t border-sap-border bg-sap-bg px-5 py-3 flex justify-end gap-2 sticky bottom-0">
          <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm text-sap-text hover:bg-sap-border-light rounded">Annuler</button>
          <button onClick={submit} disabled={submitting}
            className="bg-sap-brand hover:bg-sap-brand-dark text-white px-4 py-1.5 rounded text-sm font-medium disabled:opacity-50 flex items-center gap-1.5">
            <Send className="h-4 w-4" /> {submitting ? 'Envoi...' : 'Créer la sous-tâche'}
          </button>
        </div>
      </div>
    </div>
  );
}
