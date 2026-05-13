'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Avatar } from '@/components/Badges';
import UserForm from '@/components/admin/UserForm';
import UserEditModal from '@/components/admin/UserEditModal';
import { roleLabel } from '@/lib/utils';
import type { Entity, Department, Profile } from '@/types/database';

type UserWithRelations = Profile & {
  department?: { id: string; name: string } | null;
  entity?: { id: string; name: string } | null;
};

interface Props {
  entities: Entity[];
  departments: Department[];
}

const ROLE_COLOR: Record<string, string> = {
  general_manager:    'bg-red-100 text-red-800',
  admin:              'bg-purple-100 text-purple-800',
  head_of_department: 'bg-orange-100 text-orange-800',
  manager:            'bg-blue-100 text-blue-800',
  collaborator:        'bg-yellow-100 text-yellow-800', 
};

export default function UsersAdminClient({ entities, departments }: Props) {
  const [users, setUsers] = useState<UserWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (user: UserWithRelations) => {
    if (!confirm(`Supprimer ${user.full_name} ? Cette action est irréversible.`)) return;
    setDeletingId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    const data = await res.json();
    setDeletingId(null);
    if (!res.ok) { alert(data.error); return; }
    fetchUsers();
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error || `Erreur ${res.status}`);
      } else {
        setUsers(data.users || []);
      }
    } catch (e) {
      setFetchError('Impossible de contacter le serveur');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-stone-200">
        <div>
          <h3 className="font-serif text-lg text-stone-900">Utilisateurs</h3>
          <p className="text-xs text-stone-500 mt-0.5">{users.length} collaborateur{users.length > 1 ? 's' : ''}</p>
        </div>
        <UserForm entities={entities} departments={departments} onCreated={fetchUsers} />
      </div>

      {fetchError && (
        <div className="mx-5 mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {fetchError}
        </div>
      )}

      {loading ? (
        <div className="p-10 text-center text-sm text-stone-400">Chargement...</div>
      ) : users.length === 0 && !fetchError ? (
        <div className="p-10 text-center text-sm text-stone-400">Aucun utilisateur</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500">
                <th className="px-5 py-3 text-left font-medium">Profiles</th>
                <th className="px-5 py-3 text-left font-medium">Rôle</th>
                <th className="px-5 py-3 text-left font-medium">Poste</th>
                <th className="px-5 py-3 text-left font-medium">Entité</th>
                <th className="px-5 py-3 text-left font-medium">Département</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.full_name} size="sm" />
                      <div className="min-w-0">
                        <div className="font-medium text-stone-900 truncate">{user.full_name}</div>
                        <div className="text-xs text-stone-400 truncate">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ROLE_COLOR[user.role] || 'bg-stone-100 text-stone-700'}`}>
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-stone-600 text-xs">
                    {user.job_title || <span className="text-stone-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-stone-600 text-xs">
                    {(user as any).entity?.name || <span className="text-stone-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-stone-600 text-xs">
                    {(user as any).department?.name || <span className="text-stone-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-500'}`}>
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <UserEditModal user={user} entities={entities} departments={departments} onUpdated={fetchUsers} />
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                        title="Supprimer"
                        className="p-1.5 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
