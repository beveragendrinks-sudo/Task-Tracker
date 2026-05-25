'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Send, AlertCircle, ListChecks, Trash2 } from 'lucide-react';
import { Avatar, PriorityBadge } from './Badges';
import { PRIORITY_CONFIG, COMPLEXITY_CONFIG } from '@/lib/utils';
import PrivacyToggle from './PrivacyToggle';
import type { Profile, Entity, Department, TaskPriority, TaskComplexity } from '@/types/database';

interface Props {
  entities: Entity[];
  departments: Department[];
  users: Profile[];
  currentProfile: Profile;
}

export default function TaskForm({ entities, departments, users, currentProfile }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    entity_id: entities[0]?.id || '',
    primary_department_id: departments[0]?.id || '',
    owner_id: '',
    authorizedUsers: [] as string[],
    created_by: currentProfile.id,
    priority: 'P3' as TaskPriority,
    complexity: 'medium' as TaskComplexity,
    proposed_deadline: '',
    proposed_workload_percent: 25,
    is_private: false,
    definition_of_done: ['', '', ''],
  });

  interface SubtaskDraft {
    title: string;
    owner_id: string;
    priority: TaskPriority;
    due_date: string;
  }
  const [subtaskDrafts, setSubtaskDrafts] = useState<SubtaskDraft[]>([]);

  const SELECTED_BG: Record<TaskPriority, string> = {
    P1: 'bg-red-50',
    P2: 'bg-orange-50',
    P3: 'bg-sky-50',
    P4: 'bg-slate-50',
  };

  const SELECTED_RING: Record<TaskPriority, string> = {
    P1: 'ring-red-400',
    P2: 'ring-orange-400',
    P3: 'ring-sky-400',
    P4: 'ring-slate-400',
  };

  const SELECTED_BG_COMPLEXITY: Record<TaskComplexity, string> = {
    simple: 'bg-emerald-50',
    medium: 'bg-amber-50',
    complex: 'bg-amber-100',
    strategic: 'bg-sky-50',
  };

  const SELECTED_RING_COMPLEXITY: Record<TaskComplexity, string> = {
    simple: 'ring-emerald-200',
    medium: 'ring-amber-200',
    complex: 'ring-orange-200',
    strategic: 'ring-sky-200',
  };

  const SELECTED_BORDER_COMPLEXITY: Record<TaskComplexity, string> = {
    simple: 'border-emerald-600',
    medium: 'border-amber-700',
    complex: 'border-orange-600',
    strategic: 'border-sky-600',
  };

  const toggleAuthorized = (uid: string) => {
    if (uid === form.owner_id || uid === currentProfile.id) return;
    setForm(f => ({
      ...f,
      authorizedUsers: f.authorizedUsers.includes(uid) ? f.authorizedUsers.filter(x => x !== uid) : [...f.authorizedUsers, uid]
    }));
  };

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

    if (!form.entity_id) {
      setError("L'entité est obligatoire.");
      setSubmitting(false);
      return;
    }

    if (!form.owner_id) {
      setError('Le responsable (owner) est obligatoire.');
      setSubmitting(false);
      return;
    }

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        entity_id: form.entity_id || null,
        primary_department_id: form.primary_department_id || null,
        created_by: form.created_by,
        owner_id: form.owner_id,
        priority: form.priority,
        complexity: form.complexity,
        proposed_deadline: form.proposed_deadline || null,
        proposed_workload_percent: form.proposed_workload_percent,
        is_private: form.is_private,
        definition_of_done: dod,
        authorizedUsers: form.is_private ? form.authorizedUsers : [],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || 'Erreur lors de la création de la tâche.');
      setSubmitting(false);
      return;
    }

    const { task } = await res.json();

    // Create subtask drafts in parallel (fire-and-forget errors)
    if (subtaskDrafts.length > 0) {
      await Promise.all(
        subtaskDrafts
          .filter(s => s.title.trim() && s.owner_id)
          .map(s =>
            fetch('/api/subtasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                parent_task_id: task.id,
                title: s.title.trim(),
                owner_id: s.owner_id,
                priority: s.priority,
                due_date: s.due_date || null,
                workload_percent: null,
                is_private: form.is_private,
              }),
            })
          )
      );
    }

    router.push(`/tasks/${task.id}`);
    router.refresh();
  };

  const activeUsers = users.filter(u => u.is_active);


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

      {/* Créateur (DG uniquement) */}
      {currentProfile.role === 'general_manager' && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
          <label className="block text-sm font-medium text-amber-900 mb-1">
            Créateur de la tâche
            <span className="ml-2 text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5">DG</span>
          </label>
          <select
            value={form.created_by}
            onChange={e => setForm({ ...form, created_by: e.target.value })}
            className="w-full border border-amber-300 bg-white rounded-lg px-3 py-2 text-sm"
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.full_name}{u.id === currentProfile.id ? ' (vous)' : ''}{u.job_title ? ` — ${u.job_title}` : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-amber-700 mt-1.5">La tâche apparaîtra dans « Mes tâches créées » du collaborateur sélectionné.</p>
        </div>
      )}

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map(p => {
            const selected = form.priority === p;
            const base = 'px-3 py-2 border-2 rounded-lg text-sm transition-all duration-150 flex flex-col items-start';
            const selectedClass = `${PRIORITY_CONFIG[p].border} ${SELECTED_BG[p]} ring-2 ${SELECTED_RING[p]} ring-offset-2 ring-offset-white shadow-card-hover`;
            const normalClass = 'border-stone-200 hover:border-stone-400 bg-white';

            return (
              <button
                aria-pressed={selected}
                key={p}
                type="button"
                onClick={() => setForm({ ...form, priority: p })}
                className={`${base} ${selected ? selectedClass : normalClass}`}
              >
                <PriorityBadge priority={p} small />
                <div className={`text-xs mt-1 ${selected ? 'text-slate-700 font-medium' : 'text-stone-600'}`}>
                  {PRIORITY_CONFIG[p].label.split('—')[1]}
                </div>
              </button>
            );
          })}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(COMPLEXITY_CONFIG) as TaskComplexity[]).map(c => {
            const selectedC = form.complexity === c;
            const baseC = 'px-3 py-2 border-2 rounded-lg text-sm transition-all duration-150 flex flex-col items-start';
            const selectedClassC = `${SELECTED_BORDER_COMPLEXITY[c]} ${SELECTED_BG_COMPLEXITY[c]} ${SELECTED_RING_COMPLEXITY[c]} shadow-card-hover`;
            const normalClassC = 'border-stone-200 hover:border-stone-400 bg-white';

            return (
              <button
                aria-pressed={selectedC}
                key={c}
                type="button"
                onClick={() => setForm({ ...form, complexity: c })}
                className={`${baseC} ${selectedC ? selectedClassC : normalClassC}`}
              >
                <div className={`font-medium ${selectedC ? 'text-slate-700' : 'text-stone-700'}`}>{COMPLEXITY_CONFIG[c].label}</div>
                <div className={`text-xs mt-1 ${selectedC ? 'text-slate-600' : 'text-stone-500'}`}>×{COMPLEXITY_CONFIG[c].coef}</div>
              </button>
            );
          })}
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
      {/* Sous-tâches */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-stone-700 flex items-center gap-1.5">
            <ListChecks className="h-4 w-4 text-stone-500" />
            Sous-tâches <span className="text-stone-400 font-normal">(optionnel)</span>
          </label>
          <button
            type="button"
            onClick={() => setSubtaskDrafts(d => [...d, { title: '', owner_id: '', priority: 'P3', due_date: '' }])}
            className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium"
          >
            <Plus className="h-3 w-3" /> Ajouter une sous-tâche
          </button>
        </div>
        {subtaskDrafts.length > 0 && (
          <div className="space-y-2">
            {subtaskDrafts.map((s, i) => (
              <div key={i} className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                <input
                  type="text"
                  placeholder="Titre de la sous-tâche"
                  value={s.title}
                  onChange={e => {
                    const next = [...subtaskDrafts];
                    next[i] = { ...next[i], title: e.target.value };
                    setSubtaskDrafts(next);
                  }}
                  className="flex-1 text-sm border border-stone-300 rounded px-2 py-1 focus:border-amber-700 focus:outline-none"
                />
                <select
                  value={s.owner_id}
                  onChange={e => {
                    const next = [...subtaskDrafts];
                    next[i] = { ...next[i], owner_id: e.target.value };
                    setSubtaskDrafts(next);
                  }}
                  className="text-sm border border-stone-300 rounded px-2 py-1 max-w-[160px]"
                >
                  <option value="">— Responsable —</option>
                  {activeUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
                <select
                  value={s.priority}
                  onChange={e => {
                    const next = [...subtaskDrafts];
                    next[i] = { ...next[i], priority: e.target.value as TaskPriority };
                    setSubtaskDrafts(next);
                  }}
                  className="text-sm border border-stone-300 rounded px-2 py-1 w-16"
                >
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                </select>
                <input
                  type="date"
                  value={s.due_date}
                  onChange={e => {
                    const next = [...subtaskDrafts];
                    next[i] = { ...next[i], due_date: e.target.value };
                    setSubtaskDrafts(next);
                  }}
                  className="text-sm border border-stone-300 rounded px-2 py-1 w-36"
                />
                <button
                  type="button"
                  onClick={() => setSubtaskDrafts(d => d.filter((_, idx) => idx !== i))}
                  className="text-stone-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {subtaskDrafts.length === 0 && (
          <p className="text-xs text-stone-400">Aucune sous-tâche. Vous pourrez en ajouter après création.</p>
        )}
      </div>

      {/* PRIVACY */}
        <PrivacyToggle          value={form.is_private}
          onChange={v => setForm({...form, is_private: v})}
        />

        {/* Utilisateurs autorisés (si privacy ON) */}
        {form.is_private && (
          <div className="border border-sap-border rounded p-3 bg-sap-bg">
            <label className="block text-xs font-medium text-sap-text mb-1">
              Utilisateurs autorisés supplémentaires
            </label>
            <p className="text-xs text-sap-text-secondary mb-2">
              Par défaut, seuls vous (créateur) et le responsable ont accès. Ajoutez d'autres personnes ici si nécessaire.
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto bg-white border border-sap-border rounded">
              {activeUsers.filter(u => u.id !== form.owner_id && u.id !== currentProfile.id).map(u => (
                <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-sap-bg cursor-pointer">
                  <input type="checkbox" checked={form.authorizedUsers.includes(u.id)}
                    onChange={() => toggleAuthorized(u.id)} className="rounded text-sap-brand" />
                  <Avatar name={u.full_name} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-sap-text">{u.full_name}</div>
                    <div className="text-xs text-sap-text-secondary truncate">{u.job_title}</div>
                  </div>
                </label>
              ))}
            </div>
            {form.authorizedUsers.length > 0 && (
              <div className="mt-2 text-xs text-sap-text-secondary">
                {form.authorizedUsers.length} utilisateur(s) supplémentaire(s) auront accès.
              </div>
            )}
          </div>
        )}

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
