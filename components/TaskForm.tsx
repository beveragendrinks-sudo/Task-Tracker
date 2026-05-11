'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Send, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PriorityBadge } from './Badges';
import { PRIORITY_CONFIG, COMPLEXITY_CONFIG } from '@/lib/utils';
import type { Profile, Entity, Department, TaskPriority, TaskComplexity } from '@/types/database';

interface Props {
  entities: Entity[];
  departments: Department[];
  users: Profile[];
  currentProfile: Profile;
}

export default function TaskForm({ entities, departments, users, currentProfile }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    entity_id: entities[0]?.id || '',
    primary_department_id: departments[0]?.id || '',
    owner_id: '',
    priority: 'P3' as TaskPriority,
    complexity: 'medium' as TaskComplexity,
    proposed_deadline: '',
    proposed_workload_percent: 25,
    definition_of_done: ['', '', ''],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const dod = form.definition_of_done
      .filter(d => d.trim())
      .map(label => ({ label, done: false }));

    if (dod.length === 0) {
      setError('La Definition of Done est obligatoire (au moins un critère).');
      setSubmitting(false);
      return;
    }

    if (!form.owner_id) {
      setError('Le responsable (owner) est obligatoire.');
      setSubmitting(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert({
        title: form.title,
        description: form.description,
        entity_id: form.entity_id,
        primary_department_id: form.primary_department_id,
        created_by: currentProfile.id,
        owner_id: form.owner_id,
        priority: form.priority,
        complexity: form.complexity,
        status: 'assigned',
        proposed_deadline: form.proposed_deadline || null,
        proposed_workload_percent: form.proposed_workload_percent,
        definition_of_done: dod,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Notification au owner
    await supabase.from('notifications').insert({
      user_id: form.owner_id,
      type: 'task_to_accept',
      title: `Nouvelle tâche à accepter : ${form.title}`,
      message: `${currentProfile.full_name} vous a assigné une tâche.`,
      task_id: data.id,
      related_user_id: currentProfile.id,
    });

    router.push(`/tasks/${data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl bg-white border border-stone-200 rounded-xl p-6 space-y-5">
      {/* Titre */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Titre <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          required
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="Ex : Lancer la nouvelle campagne marketing Q2"
          className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:border-amber-700 focus:ring-1 focus:ring-amber-700 focus:outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Description détaillée <span className="text-red-600">*</span>
        </label>
        <textarea
          required
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          rows={4}
          placeholder="Contexte, objectifs, périmètre, livrables attendus..."
          className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:border-amber-700 focus:ring-1 focus:ring-amber-700 focus:outline-none"
        />
      </div>

      {/* Entité + Département */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Entité</label>
          <select
            value={form.entity_id}
            onChange={e => setForm({ ...form, entity_id: e.target.value })}
            className="w-full border border-stone-300 rounded-lg px-3 py-2"
          >
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Département</label>
          <select
            value={form.primary_department_id}
            onChange={e => setForm({ ...form, primary_department_id: e.target.value })}
            className="w-full border border-stone-300 rounded-lg px-3 py-2"
          >
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Owner */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Responsable (Owner) <span className="text-red-600">*</span>
        </label>
        <select
          required
          value={form.owner_id}
          onChange={e => setForm({ ...form, owner_id: e.target.value })}
          className="w-full border border-stone-300 rounded-lg px-3 py-2"
        >
          <option value="">— Sélectionner —</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.full_name} {u.job_title && `— ${u.job_title}`}
            </option>
          ))}
        </select>
      </div>

      {/* Priorité */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">Priorité</label>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setForm({ ...form, priority: p })}
              className={`px-3 py-2 border-2 rounded-lg text-sm transition-colors ${
                form.priority === p ? `${PRIORITY_CONFIG[p].border} bg-stone-50` : 'border-stone-200 hover:border-stone-400'
              }`}
            >
              <PriorityBadge priority={p} small />
              <div className="text-xs mt-1 text-stone-600">{PRIORITY_CONFIG[p].label.split('—')[1]}</div>
            </button>
          ))}
        </div>
        {currentProfile.role !== 'general_manager' && form.priority === 'P1' && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            ⓘ Seule la DG peut créer des P1 — sera abaissée à P2 automatiquement
          </p>
        )}
      </div>

      {/* Complexité */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">Complexité</label>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(COMPLEXITY_CONFIG) as TaskComplexity[]).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setForm({ ...form, complexity: c })}
              className={`px-3 py-2 border-2 rounded-lg text-sm transition-colors ${
                form.complexity === c ? 'border-amber-700 bg-amber-50' : 'border-stone-200 hover:border-stone-400'
              }`}
            >
              <div className="font-medium">{COMPLEXITY_CONFIG[c].label}</div>
              <div className="text-xs text-stone-500 mt-0.5">×{COMPLEXITY_CONFIG[c].coef}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Deadline + Charge */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Deadline proposée</label>
          <input
            type="date"
            value={form.proposed_deadline}
            onChange={e => setForm({ ...form, proposed_deadline: e.target.value })}
            className="w-full border border-stone-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Charge proposée (%)</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="5"
              max="100"
              value={form.proposed_workload_percent}
              onChange={e => setForm({ ...form, proposed_workload_percent: +e.target.value })}
              className="flex-1"
            />
            <span className="text-lg font-serif tabular-nums w-12 text-right">
              {form.proposed_workload_percent}%
            </span>
          </div>
        </div>
      </div>

      {/* DoD */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-2">
          Definition of Done <span className="text-red-600">*</span>
        </label>
        <p className="text-xs text-stone-500 mb-3">
          Liste claire des conditions à remplir pour considérer la tâche comme terminée.
        </p>
        <div className="space-y-2">
          {form.definition_of_done.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={d}
                placeholder={`Critère ${i + 1}`}
                onChange={e => {
                  const newDod = [...form.definition_of_done];
                  newDod[i] = e.target.value;
                  setForm({ ...form, definition_of_done: newDod });
                }}
                className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm"
              />
              {form.definition_of_done.length > 1 && (
                <button
                  type="button"
                  onClick={() => setForm({
                    ...form,
                    definition_of_done: form.definition_of_done.filter((_, idx) => idx !== i)
                  })}
                >
                  <X className="h-4 w-4 text-stone-400 hover:text-red-600" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setForm({ ...form, definition_of_done: [...form.definition_of_done, ''] })}
            className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Ajouter un critère
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 text-sm text-stone-700 hover:text-stone-900"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Envoi...' : 'Envoyer pour acceptation'}
        </button>
      </div>
    </form>
  );
}
