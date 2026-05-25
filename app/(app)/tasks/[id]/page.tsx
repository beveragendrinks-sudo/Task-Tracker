import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Calendar, User, Building2, Briefcase, AlertTriangle, Sparkles, CheckSquare, Lock } from 'lucide-react';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Header from '@/components/Header';
import { PriorityBadge, StatusBadge, Avatar } from '@/components/Badges';
import TaskActions from '@/components/TaskActions';
import DoD from '@/components/DoD';
import SubtaskList from '@/components/SubtaskList';
import PrivateBadge from '@/components/PrivateBadge';
import PermissionsManager from '@/components/PermissionsManager';
import { formatDate, formatDateShort, isOverdue, daysFromNow } from '@/lib/utils';
import Link from 'next/link';

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = createClient();

  const { data: task } = await supabase
    .from('tasks')
    .select(`
      *,
      entity:entities!tasks_entity_id_fkey(*),
      department:departments!tasks_primary_department_id_fkey(*),
      creator:profiles!tasks_created_by_fkey(*),
      owner:profiles!tasks_owner_id_fkey(*)
    `)
    .eq('id', params.id)
    .single();

  if (!task) notFound();

  // Charger l'historique
  const { data: history } = await supabase
    .from('task_status_history')
    .select('*, changed_by_profile:profiles!task_status_history_changed_by_fkey(full_name)')
    .eq('task_id', params.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Charger les commentaires
  const { data: comments } = await supabase
    .from('task_comments')
    .select('*, author:profiles!task_comments_author_id_fkey(full_name)')
    .eq('task_id', params.id)
    .order('created_at', { ascending: false });

  // Marquer les notifications liées à cette tâche comme lues pour l'utilisateur courant
  try {
    const { error: notifError } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('task_id', params.id)
      .eq('user_id', profile.id)
      .eq('is_read', false);
    if (notifError) {
      console.error('Erreur en marquant notifications lues:', notifError.message || notifError);
    }
  } catch (e) {
    console.error('Erreur en marquant notifications lues:', e);
  }

  const overdue = task.accepted_deadline && isOverdue(task.accepted_deadline);

  // Extraire le dernier message de négociation (si présent)
  const negotiationEntry = (history || []).find((h: any) => h.to_status === 'negotiation');
  const negotiationReason = negotiationEntry?.reason || null;
  const negotiationFrom = (negotiationEntry as any)?.changed_by_profile?.full_name || null;

  // Charger les permissions explicites (tâche privée) — admin client pour bypass RLS
  const adminForPerms = createAdminClient();
  const { data: taskPerms } = task.is_private
    ? await adminForPerms
        .from('task_permissions')
        .select('*, profile:profiles!task_permissions_user_id_fkey(id, full_name, job_title)')
        .eq('task_id', task.id)
    : { data: [] as any[] };

  // Sécurité : si tâche privée et user non autorisé → redirect
  // (Normalement RLS bloque, donc task serait null. Sécurité supplémentaire.)
  const isAuthorized =
    !task.is_private ||
    task.created_by === profile.id ||
    task.owner_id === profile.id ||
    (taskPerms || []).some((p: any) => p.user_id === profile.id);

  if (!isAuthorized) {
    return (
      <>
        <div className="bg-sap-surface border-b border-sap-border px-6 py-4">
          <Link href="/dashboard" className="text-xs text-sap-text-secondary hover:text-sap-brand inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3 w-3" /> Retour
          </Link>
        </div>
        <div className="p-6">
          <div className="max-w-md mx-auto bg-sap-surface border border-sap-border rounded shadow-sap-tile p-8 text-center">
            <Lock className="h-12 w-12 text-sap-text-secondary mx-auto mb-3" />
            <h2 className="text-lg font-light text-sap-text mb-1">Tâche privée</h2>
            <p className="text-sm text-sap-text-secondary">Contenu non accessible. Demandez l'accès au créateur ou à l'owner.</p>
          </div>
        </div>
      </>
    );
  }

  const { data: users } = await supabase.from('profiles').select('*').eq('is_active', true);

  // Sous-tâches — admin client pour éviter tout blocage RLS
  // (l'autorisation est déjà vérifiée ci-dessus via isAuthorized)
  const admin = adminForPerms;
  const { data: subtasks } = await admin
    .from('task_subtasks')
    .select('*')
    .eq('parent_task_id', task.id)
    .order('position', { ascending: true });

  // Enrichir avec le profil owner
  const ownerIds = [...new Set((subtasks || []).map((s: any) => s.owner_id).filter(Boolean))];
  const { data: ownerProfiles } = ownerIds.length
    ? await admin.from('profiles').select('id, full_name, job_title').in('id', ownerIds)
    : { data: [] };
  const ownerMap = Object.fromEntries((ownerProfiles || []).map((p: any) => [p.id, p]));
  const subtasksWithOwner = (subtasks || []).map((s: any) => ({
    ...s,
    owner: ownerMap[s.owner_id] ?? null,
  }));

  const dod = (task.definition_of_done as any[]) || [];
  const days = daysFromNow(task.accepted_deadline || task.proposed_deadline);
  const isOwner = task.owner_id === profile.id;
  const canManagePerms = task.created_by === profile.id || task.owner_id === profile.id || ['general_manager','admin'].includes(profile.role);
  const canCreateSubtask = task.created_by === profile.id || task.owner_id === profile.id || ['general_manager','admin'].includes(profile.role);

  return (
    <>
      <Header title={task.title} subtitle={task.reference} />

      <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Statut */}
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status} />
              {task.is_private && <PrivateBadge />}
                {overdue && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded font-medium">
                  ⚠ {Math.abs(daysFromNow(task.accepted_deadline)!)}j de retard
                </span>
              )}
            </div>

            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Description</h3>
            <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
          </div>

          {/* Definition of Done */}
          {task.definition_of_done && (task.definition_of_done as any[]).length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
                Definition of Done
              </h3>
              <DoD taskId={task.id} initial={task.definition_of_done as any[]} />
            </div>
          )}

          {/* Sous-tâches */}
          <SubtaskList
            parentTask={task as any}
            subtasks={subtasksWithOwner as any}
            users={(users || []) as any}
            currentProfile={profile as any}
            canCreate={canCreateSubtask}
          />

          {/* Audit trail */}
          {history && history.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
                Historique
              </h3>
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="text-sm py-2 border-l-2 border-stone-200 pl-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{(h as any).changed_by_profile?.full_name || 'Système'}</span>
                      <span className="text-stone-600">a passé le statut de</span>
                      <span className="text-xs px-1.5 py-0.5 bg-stone-100 rounded">{h.from_status || 'créé'}</span>
                      <span>→</span>
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-medium">
                        {h.to_status}
                      </span>
                      <span className="text-xs text-stone-400 ml-auto">{formatDateShort(h.created_at)}</span>
                    </div>
                    {(h as any).reason && (
                      <div className="mt-2 text-sm text-stone-600 pl-1">{(h as any).reason}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar droite — Actions et infos */}
        <div className="space-y-6">
          <TaskActions task={task} profile={profile} negotiationReason={negotiationReason} negotiationFrom={negotiationFrom} />

          {/* Métadonnées */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Entité</div>
              <div>{(task as any).entity?.name || '—'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Département</div>
              <div>{(task as any).department?.name || '—'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Créateur</div>
              <div className="flex items-center gap-2">
                <Avatar name={(task as any).creator?.full_name || '?'} size="xs" />
                <span>{(task as any).creator?.full_name}</span>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Responsable</div>
              {(task as any).owner ? (
                <div className="flex items-center gap-2">
                  <Avatar name={(task as any).owner.full_name} size="xs" />
                  <span>{(task as any).owner.full_name}</span>
                </div>
              ) : (
                <span className="text-stone-400">Non assigné</span>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Deadline acceptée</div>
              <div className={`flex items-center gap-1.5 ${overdue ? 'text-red-700 font-medium' : ''}`}>
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(task.accepted_deadline) || (
                  <span className="text-stone-400 italic">Non négociée</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Charge</div>
              <div>
                {task.accepted_workload_percent
                  ? `${task.accepted_workload_percent}%`
                  : <span className="text-stone-400 italic">Non négociée</span>
                }
              </div>
            </div>
            {task.ai_risk_score && (
              <div>
                <div className="text-xs uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-700" />
                  Risque IA
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        task.ai_risk_score > 0.6 ? 'bg-red-500' :
                        task.ai_risk_score > 0.3 ? 'bg-orange-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${task.ai_risk_score * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums">{Math.round(task.ai_risk_score * 100)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
                {/* Permissions (si tâche privée) */}
          {task.is_private && (
            <PermissionsManager
              resourceType="task"
              resourceId={task.id}
              permissions={(taskPerms || []) as any}
              availableUsers={(users || []) as any}
              canManage={canManagePerms}
            />
          )}

          {task.rejection_reason && (
            <div className="bg-sap-error-bg border border-sap-error/30 rounded p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-sap-error mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-sap-error">Raison du rejet</div>
                  <div className="text-sm text-sap-text mt-1">{task.rejection_reason}</div>
                </div>
              </div>
            </div>
          )}
    </>
  );
}
