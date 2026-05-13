'use client';

import { useState } from 'react';
import { UserPlus, X, Eye, EyeOff } from 'lucide-react';
import type { Entity, Department } from '@/types/database';

const ROLES = [
  { value: 'general_manager',   label: 'Direction Générale' },
  { value: 'admin',             label: 'Administrateur' },
  { value: 'head_of_department',label: 'Chef de Département' },
  { value: 'manager',           label: 'Manager' },
  { value: 'collaborator',        label: 'Collaborateur' },
];

interface Props {
  entities: Entity[];
  departments: Department[];
  onCreated: () => void;
}

export default function UserForm({ entities, departments, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'task_owner',
    entity_id: '',
    department_id: '',
    job_title: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch('/api/admin/users', {
      method: 'POST',
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
    setForm({ full_name: '', email: '', password: '', role: 'task_owner', entity_id: '', department_id: '', job_title: '' });
    onCreated();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-700"
      >
        <UserPlus className="h-4 w-4" />
        Nouvel utilisateur
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-5 border-b border-stone-200">
              <h2 className="font-serif text-lg text-stone-900">Créer un utilisateur</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Nom complet *</label>
                  <input value={form.full_name} onChange={e => set('full_name', e.target.value)} required
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">Poste</label>
                  <input value={form.job_title} onChange={e => set('job_title', e.target.value)} placeholder="Ex: Directeur Financier"
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600" />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Mot de passe initial *</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                    required minLength={8}
                    className="w-full border border-stone-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600" />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    className="absolute right-2 top-2 text-stone-400 hover:text-stone-700">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-stone-400 mt-1">Minimum 8 caractères. L'utilisateur pourra le changer.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Rôle *</label>
                <select value={form.role} onChange={e => set('role', e.target.value)} required
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
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

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-stone-600 hover:text-stone-900">Annuler</button>
                <button type="submit" disabled={loading}
                  className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-700 disabled:opacity-50">
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
