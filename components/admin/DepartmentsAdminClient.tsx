'use client';

import { useEffect, useState, useCallback } from 'react';
import { GitBranch, Plus, Pencil, X, Check, Trash2 } from 'lucide-react';
import type { Department } from '@/types/database';

export default function DepartmentsAdminClient() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Supprimer le département « ${dept.name} » ? Cette action est irréversible.`)) return;
    setDeletingId(dept.id);
    const res = await fetch(`/api/admin/departments/${dept.id}`, { method: 'DELETE' });
    const data = await res.json();
    setDeletingId(null);
    if (!res.ok) { setError(data.error); return; }
    fetchDepartments();
  };

  const [newForm, setNewForm] = useState({ name: '', description: '' });
  const [editForm, setEditForm] = useState({ name: '', description: '', is_active: true });

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/departments');
    if (res.ok) {
      const data = await res.json();
      setDepartments(data.departments || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch('/api/admin/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    setShowForm(false);
    setNewForm({ name: '', description: '' });
    fetchDepartments();
  };

  const startEdit = (dept: Department) => {
    setEditingId(dept.id);
    setEditForm({ name: dept.name, description: dept.description || '', is_active: dept.is_active });
  };

  const handleEdit = async (id: string) => {
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/admin/departments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    setEditingId(null);
    fetchDepartments();
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-stone-200">
        <div>
          <h3 className="font-serif text-lg text-stone-900">Départements</h3>
          <p className="text-xs text-stone-500 mt-0.5">{departments.length} départements</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-700">
          <Plus className="h-4 w-4" />
          Nouveau département
        </button>
      </div>

      {error && <div className="mx-5 mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      {/* Formulaire création */}
      {showForm && (
        <div className="p-5 border-b border-stone-200 bg-stone-50">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Nom *</label>
                <input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Description</label>
                <input value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="px-4 py-1.5 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-700 disabled:opacity-50">
                {saving ? 'Création...' : 'Créer'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-1.5 text-sm text-stone-600 hover:text-stone-900">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-10 text-center text-sm text-stone-400">Chargement...</div>
      ) : departments.length === 0 ? (
        <div className="p-10 text-center text-sm text-stone-400">Aucun département</div>
      ) : (
        <div className="divide-y divide-stone-100">
          {departments.map(dept => (
            <div key={dept.id} className="flex items-center gap-4 px-5 py-3 hover:bg-stone-50">
              <div className="p-2 rounded-lg bg-stone-100 shrink-0">
                <GitBranch className="h-4 w-4 text-stone-600" />
              </div>

              {editingId === dept.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="border border-stone-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 w-44" />
                  <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Description" className="border border-stone-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 flex-1" />
                  <label className="flex items-center gap-1 text-xs text-stone-600">
                    <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))} className="h-3 w-3 accent-amber-700" />
                    Actif
                  </label>
                  <button onClick={() => handleEdit(dept.id)} disabled={saving} className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 text-stone-400 hover:bg-stone-100 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-stone-900">{dept.name}</span>
                      {!dept.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-500">Inactif</span>}
                    </div>
                    {dept.description && <div className="text-xs text-stone-500">{dept.description}</div>}
                  </div>
                  <button onClick={() => startEdit(dept)} className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(dept)} disabled={deletingId === dept.id}
                    title="Supprimer" className="p-1.5 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
