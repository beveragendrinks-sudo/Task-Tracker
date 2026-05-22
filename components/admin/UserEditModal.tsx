'use client';

import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import type { Profile, Entity, Department } from '@/types/database';
import { roleLabel } from '@/lib/utils';

const ROLES = [
  { value: 'general_manager',   label: 'Direction Générale' },
  { value: 'admin',             label: 'Administrateur' },
  { value: 'head_of_department',label: 'Chef d\'Entité' },
  { value: 'manager',           label: 'Manager' },
  { value: 'collaborator',        label: 'Collaborateur' },
];

interface Props {
  user: Profile & { department?: { id: string; name: string } | null; entity?: { id: string; name: string } | null };
  entities: Entity[];
  departments: Department[];
  onUpdated: () => void;
}

export default function UserEditModal({ user, entities, departments, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    role: user.role,
    entity_id: user.entity_id || '',
    department_id: user.department_id || '',
    job_title: user.job_title || '',
    is_active: user.is_active,
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        entity_id: form.entity_id || null,
        department_id: form.department_id || null,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }
    setOpen(false);
    onUpdated();
  };

  return (
    <>
      <button onClick={() => setOpen(true)} title="Modifier"
        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg">
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-stone-200">
              <div>
                <h2 className="font-serif text-lg text-stone-900">{user.full_name}</h2>
                <p className="text-xs text-stone-500">{user.email}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Rôle</label>
                <select value={form.role} onChange={e => set('role', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Poste</label>
                <input value={form.job_title} onChange={e => set('job_title', e.target.value)}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Entité</label>
                  <select value={form.entity_id} onChange={e => set('entity_id', e.target.value)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600">
                    <option value="">— Non assignée</option>
                    {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Département</label>
                  <select value={form.department_id} onChange={e => set('department_id', e.target.value)}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600">
                    <option value="">— Non assigné</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id={`active-${user.id}`} checked={form.is_active}
                  onChange={e => set('is_active', e.target.checked)}
                  className="h-4 w-4 accent-amber-700" />
                <label htmlFor={`active-${user.id}`} className="text-sm text-stone-700">Compte actif</label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900">Annuler</button>
                <button type="submit" disabled={loading}
                  className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-700 disabled:opacity-50">
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
