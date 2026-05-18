'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, X, ChevronDown, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from './Badges';
import type { Profile, TaskPermission, SubtaskPermission, PermissionType } from '@/types/database';

interface Props {
  resourceType: 'task' | 'subtask';
  resourceId: string;
  permissions: (TaskPermission | SubtaskPermission)[];
  availableUsers: Profile[];
  canManage: boolean;
}

export default function PermissionsManager({
  resourceType, resourceId, permissions, availableUsers, canManage
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const table = resourceType === 'task' ? 'task_permissions' : 'subtask_permissions';
  const fkColumn = resourceType === 'task' ? 'task_id' : 'subtask_id';

  const addPermission = async (userId: string, type: PermissionType = 'viewer') => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single();
    if (!profile) { setLoading(false); return; }

    await supabase.from(table).insert({
      [fkColumn]: resourceId,
      user_id: userId,
      permission_type: type,
      created_by: profile.id,
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  const removePermission = async (permId: string) => {
    if (!confirm('Retirer cet utilisateur de la liste des autorisés ?')) return;
    setLoading(true);
    await supabase.from(table).delete().eq('id', permId);
    setLoading(false);
    router.refresh();
  };

  const updatePermissionType = async (permId: string, newType: PermissionType) => {
    setLoading(true);
    await supabase.from(table).update({ permission_type: newType }).eq('id', permId);
    setLoading(false);
    router.refresh();
  };

  const usersAlready = new Set(permissions.map(p => p.user_id));
  const candidates = availableUsers.filter(u => !usersAlready.has(u.id));

  return (
    <div className="bg-sap-surface border border-sap-border rounded shadow-sap-tile">
      <div className="px-4 py-2.5 border-b border-sap-border flex items-center gap-2">
        <Shield className="h-4 w-4 text-sap-text-secondary" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sap-text-secondary flex-1">
          Utilisateurs autorisés
        </h2>
        <span className="text-[10px] px-1.5 py-0.5 bg-sap-bg text-sap-text-secondary rounded font-semibold">
          {permissions.length}
        </span>
      </div>

      <div className="p-3">
        {permissions.length === 0 ? (
          <div className="text-xs text-sap-text-secondary text-center py-3">
            Seuls le créateur et le responsable ont accès. Ajoutez d'autres utilisateurs si besoin.
          </div>
        ) : (
          <div className="space-y-1.5">
            {permissions.map(p => {
              const profile = (p as any).profile as Profile | undefined;
              if (!profile) return null;
              return (
                <div key={p.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-sap-bg">
                  <Avatar name={profile.full_name} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-sap-text truncate">{profile.full_name}</div>
                    <div className="text-[11px] text-sap-text-secondary truncate">{profile.job_title}</div>
                  </div>
                  {canManage ? (
                    <>
                      <select
                        value={p.permission_type}
                        onChange={e => updatePermissionType(p.id, e.target.value as PermissionType)}
                        disabled={loading}
                        className="text-xs border border-sap-border rounded px-1 py-0.5"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                      <button
                        onClick={() => removePermission(p.id)}
                        disabled={loading}
                        className="p-0.5 hover:bg-sap-error-bg text-sap-error rounded"
                        title="Retirer">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-sap-text-secondary capitalize">{p.permission_type}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {canManage && candidates.length > 0 && (
          <div className="mt-3 pt-3 border-t border-sap-border-light">
            <button
              onClick={() => setOpen(!open)}
              className="w-full flex items-center gap-1.5 text-sm text-sap-brand hover:text-sap-brand-dark font-medium">
              <UserPlus className="h-3.5 w-3.5" />
              Ajouter un utilisateur
              <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-sap-border rounded bg-white">
                {candidates.map(u => (
                  <button
                    key={u.id}
                    onClick={() => addPermission(u.id, 'viewer')}
                    disabled={loading}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-sap-bg text-left">
                    <Avatar name={u.full_name} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-sap-text">{u.full_name}</div>
                      <div className="text-xs text-sap-text-secondary truncate">{u.job_title}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
