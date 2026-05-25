// ===========================================================
// Types TypeScript des tables de la base
// Pour génération automatique : npx supabase gen types typescript --project-id <id>
// ===========================================================

export type UserRole =
  | 'general_manager' | 'admin' | 'head_of_department'
  | 'manager' | 'task_owner' | 'contributor';

export type TaskPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type TaskComplexity = 'simple' | 'medium' | 'complex' | 'strategic';

export type TaskStatus =
  | 'draft'|'assigned'|'negotiation'|'accepted'|'active'
  | 'on_hold'|'blocked'
  | 'closed_by_owner'|'rejected_closure'|'approved'|'cancelled';

export type MilestoneStatus = 'pending' | 'in_progress' | 'done' | 'overdue' | 'cancelled';

export type BlockerType =
  | 'awaiting_validation' | 'awaiting_document' | 'awaiting_supplier'
  | 'awaiting_information' | 'priority_conflict' | 'resource_lack'
  | 'technical_issue' | 'financial_issue' | 'legal_issue' | 'other';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type PermissionType = 'viewer'|'editor'|'owner';

export interface Profile {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  job_title: string | null;
  entity_id: string | null;
  department_id: string | null;
  manager_id: string | null;
  capacity_percent: number;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Entity {
  id: string;
  name: string;
  description: string | null;
  is_group_level: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoDItem {
  label: string;
  done: boolean;
  proof_url?: string;
}

export interface Task {
  id: string;
  reference: string;
  title: string;
  description: string;
  entity_id: string;
  primary_department_id: string | null;
  created_by: string;
  owner_id: string | null;
  priority: TaskPriority;
  complexity: TaskComplexity;
  status: TaskStatus;
  proposed_deadline: string | null;
  accepted_deadline: string | null;
  start_date_planned: string | null;
  start_date_actual: string | null;
  closed_by_owner_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  proposed_workload_percent: number | null;
  accepted_workload_percent: number | null;
  workload_start_date: string | null;
  workload_end_date: string | null;
  definition_of_done: DoDItem[];
  rejection_reason: string | null;
  cancellation_reason: string | null;
  closure_proof_url: string | null;
  ai_risk_score: number | null;
  ai_summary: string | null;
  ai_suggestions: any;
  is_locked: boolean;
  is_private: boolean;
  is_authorized?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskWithRelations extends Task {
  entity?: Entity;
  primary_department?: Department;
  creator?: Profile;
  owner?: Profile;
  permissions?: TaskPermission[];
  subtasks?: Subtask[];
}

export interface Subtask {
  id: string;
  parent_task_id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  created_by: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  workload_percent: number | null;
  is_private: boolean;
  is_authorized?: boolean;
  accepted_at: string | null;
  closed_at: string | null;
  approved_at: string | null;
  cancelled_at: string | null;
  rejection_reason: string | null;
  completed_at: string | null;
  depends_on_subtask_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface SubtaskWithRelations extends Subtask {
  owner?: Profile;
  creator?: Profile;
  permissions?: SubtaskPermission[];
}

export interface TaskPermission {
  id: string;
  task_id: string;
  user_id: string;
  permission_type: PermissionType;
  created_by: string | null;
  created_at: string;
  profile?: Profile;
}

export interface SubtaskPermission {
  id: string;
  subtask_id: string;
  user_id: string;
  permission_type: PermissionType;
  created_by: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Milestone {
  id: string;
  task_id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  due_date: string;
  status: MilestoneStatus;
  proof_required: boolean;
  proof_url: string | null;
  completed_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Blocker {
  id: string;
  task_id: string;
  blocker_type: BlockerType;
  blocked_by_user_id: string | null;
  blocked_by_department_id: string | null;
  description: string;
  impact: string | null;
  action_required: string;
  escalation_required: boolean;
  escalation_level: number;
  started_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  status: 'open' | 'escalated' | 'resolved' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  task_id: string | null;
  related_user_id: string | null;
  is_read: boolean;
  read_at: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  created_at: string;
}

export interface AIAlert {
  id: string;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  related_task_id: string | null;
  related_user_id: string | null;
  related_department_id: string | null;
  related_entity_id: string | null;
  recommendations: any;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  created_at: string;
}
export interface SentEmail {
  id: string; trigger_type: string;
  to_email: string; to_user_id: string | null;
  subject: string; body: string;
  task_id: string | null;
  sent_at: string; status: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_role: UserRole | null;
  action: string;
  object_type: 'task'|'subtask'|'comment'|'attachment'|'permission'|'exception';
  object_id: string | null;
  old_value: any;
  new_value: any;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}