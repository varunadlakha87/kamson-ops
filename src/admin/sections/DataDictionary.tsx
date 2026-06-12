import { useState } from 'react';
import { Search, Database, Lock, Settings, Users, GitBranch, Workflow, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';

type TableCategory = 'core' | 'master' | 'config' | 'security' | 'org' | 'workflow';

interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  description: string;
  sensitive?: boolean;
  businessKey?: boolean;
}

interface TableDef {
  tableName: string;
  displayName: string;
  category: TableCategory;
  prefix: string;
  purpose: string;
  adminControlled: boolean;
  hasRefId: boolean;
  rowCount?: string;
  columns: ColumnDef[];
}

const CATEGORY_META: Record<TableCategory, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType; description: string }> = {
  core:     { label: 'Core',     color: 'text-blue-700',    bgColor: 'bg-blue-50',    borderColor: 'border-blue-200',    icon: Database,  description: 'Operational business data — customers, loans, insurance, tasks' },
  master:   { label: 'Master',   color: 'text-violet-700',  bgColor: 'bg-violet-50',  borderColor: 'border-violet-200',  icon: Users,     description: 'Master records — users, profiles, reference identities' },
  config:   { label: 'Config',   color: 'text-amber-700',   bgColor: 'bg-amber-50',   borderColor: 'border-amber-200',   icon: Settings,  description: 'Admin-controlled configuration — products, statuses, rules' },
  security: { label: 'Security', color: 'text-red-700',     bgColor: 'bg-red-50',     borderColor: 'border-red-200',     icon: Lock,      description: 'Permissions, access control, and audit trail' },
  org:      { label: 'Org',      color: 'text-teal-700',    bgColor: 'bg-teal-50',    borderColor: 'border-teal-200',    icon: GitBranch, description: 'Organisational structure — teams and membership' },
  workflow: { label: 'Workflow',  color: 'text-orange-700',  bgColor: 'bg-orange-50',  borderColor: 'border-orange-200',  icon: Workflow,  description: 'Process and workflow tables — reassignments, approvals' },
};

const TABLES: TableDef[] = [
  // ── core_ ────────────────────────────────────────────────────────────────────
  {
    tableName: 'core_customers', displayName: 'Customers', category: 'core', prefix: 'CUS-',
    purpose: 'Central customer master — holds all personal details, KYC data, and relationship assignments.',
    adminControlled: false, hasRefId: true,
    columns: [
      { name: 'id',               type: 'uuid',      nullable: false, description: 'Internal primary key (not exposed in UI)' },
      { name: 'ref_id',           type: 'text',      nullable: false, description: 'Business reference ID e.g. CUS-0001', businessKey: true },
      { name: 'full_name',        type: 'text',      nullable: false, description: 'Customer full name' },
      { name: 'mobile',           type: 'text',      nullable: false, description: 'Primary mobile number' },
      { name: 'alternate_mobile', type: 'text',      nullable: true,  description: 'Alternate contact number' },
      { name: 'email',            type: 'text',      nullable: true,  description: 'Email address' },
      { name: 'pan',              type: 'text',      nullable: true,  description: 'PAN card number', sensitive: true },
      { name: 'aadhaar',          type: 'text',      nullable: true,  description: 'Aadhaar number', sensitive: true },
      { name: 'date_of_birth',    type: 'date',      nullable: true,  description: 'Date of birth' },
      { name: 'address',          type: 'text',      nullable: true,  description: 'Residential address' },
      { name: 'occupation',       type: 'text',      nullable: true,  description: 'Employment / occupation type' },
      { name: 'status',           type: 'enum',      nullable: false, description: 'active | follow_up_pending | closed | renewal_due' },
      { name: 'assigned_rm_id',   type: 'uuid → master_users', nullable: true, description: 'RM assigned to this customer' },
      { name: 'owner_id',         type: 'uuid → master_users', nullable: true, description: 'Primary ownership for RBAC scoping' },
      { name: 'assigned_team_id', type: 'uuid → org_teams',    nullable: true, description: 'Team visibility scope' },
      { name: 'access_level',     type: 'text',      nullable: false, description: 'standard | restricted | confidential' },
      { name: 'is_restricted',    type: 'boolean',   nullable: false, description: 'Quick flag for restricted access override' },
      { name: 'notes',            type: 'text',      nullable: true,  description: 'Free-form notes' },
      { name: 'created_by',       type: 'uuid → master_users', nullable: true, description: 'User who created this record' },
      { name: 'active',           type: 'boolean',   nullable: false, description: 'Soft-delete flag' },
      { name: 'created_at',       type: 'timestamptz', nullable: false, description: 'Record creation timestamp' },
      { name: 'updated_at',       type: 'timestamptz', nullable: false, description: 'Last update timestamp' },
    ],
  },
  {
    tableName: 'core_loans', displayName: 'Loans', category: 'core', prefix: 'LOAN-YYYY-',
    purpose: 'All loan cases — from lead stage through disbursal. Linked to customers.',
    adminControlled: false, hasRefId: true,
    columns: [
      { name: 'id',                  type: 'uuid',      nullable: false, description: 'Internal primary key' },
      { name: 'ref_id',              type: 'text',      nullable: false, description: 'Business reference e.g. LOAN-2026-0012', businessKey: true },
      { name: 'case_number',         type: 'text',      nullable: true,  description: 'Bank-assigned case number (external)' },
      { name: 'customer_id',         type: 'uuid → core_customers', nullable: false, description: 'Linked customer' },
      { name: 'loan_type',           type: 'text',      nullable: false, description: 'Home Loan | Personal Loan | etc.' },
      { name: 'bank_nbfc',           type: 'text',      nullable: false, description: 'Lender name (from config_banks_nbfc)' },
      { name: 'loan_amount',         type: 'numeric',   nullable: false, description: 'Sanctioned/applied loan amount in INR' },
      { name: 'emi_amount',          type: 'numeric',   nullable: true,  description: 'Monthly EMI amount' },
      { name: 'roi',                 type: 'numeric',   nullable: true,  description: 'Rate of interest (% p.a.)' },
      { name: 'tenure_months',       type: 'integer',   nullable: true,  description: 'Loan tenure in months' },
      { name: 'login_date',          type: 'date',      nullable: true,  description: 'Date application was logged with bank' },
      { name: 'disbursal_date',      type: 'date',      nullable: true,  description: 'Date of loan disbursal' },
      { name: 'loan_account_number', type: 'text',      nullable: true,  description: 'Bank loan account number', sensitive: true },
      { name: 'status',              type: 'enum',      nullable: false, description: 'lead → disbursed → closed pipeline stage' },
      { name: 'assigned_rm_id',      type: 'uuid → master_users', nullable: true, description: 'Responsible RM' },
      { name: 'active',              type: 'boolean',   nullable: false, description: 'Soft-delete flag' },
    ],
  },
  {
    tableName: 'core_insurance_cases', displayName: 'Insurance Cases', category: 'core', prefix: 'INS-YYYY-',
    purpose: 'Insurance case pipeline — from lead to policy issuance. Tracks premiums and commissions.',
    adminControlled: false, hasRefId: true,
    columns: [
      { name: 'id',                       type: 'uuid',    nullable: false, description: 'Internal primary key' },
      { name: 'ref_id',                   type: 'text',    nullable: false, description: 'Business reference e.g. INS-2026-0045', businessKey: true },
      { name: 'customer_id',              type: 'uuid → core_customers', nullable: true, description: 'Linked customer (nullable for walk-ins)' },
      { name: 'customer_name',            type: 'text',    nullable: false, description: 'Denormalised customer name for display' },
      { name: 'case_number',              type: 'text',    nullable: true,  description: 'Insurer-assigned case number' },
      { name: 'policy_type',              type: 'text',    nullable: false, description: 'Term Life | Health | Motor | etc.' },
      { name: 'insurance_partner',        type: 'enum',    nullable: false, description: 'Insurance company partner' },
      { name: 'premium_amount',           type: 'numeric', nullable: true,  description: 'Annual premium in INR' },
      { name: 'expected_commission',      type: 'numeric', nullable: true,  description: 'Expected commission amount' },
      { name: 'actual_commission',        type: 'numeric', nullable: true,  description: 'Actual commission received' },
      { name: 'commission_received',      type: 'boolean', nullable: false, description: 'Commission payment flag' },
      { name: 'case_status',              type: 'text',    nullable: false, description: 'Pipeline stage (Lead Generated → Policy Issued)' },
      { name: 'rm_id',                    type: 'uuid → master_users', nullable: true, description: 'Responsible RM' },
      { name: 'active',                   type: 'boolean', nullable: false, description: 'Soft-delete flag' },
    ],
  },
  {
    tableName: 'core_insurance_policies', displayName: 'Insurance Policies', category: 'core', prefix: 'POL-YYYY-',
    purpose: 'Issued insurance policies with renewal tracking. Linked to customers.',
    adminControlled: false, hasRefId: true,
    columns: [
      { name: 'id',                 type: 'uuid',    nullable: false, description: 'Internal primary key' },
      { name: 'ref_id',             type: 'text',    nullable: false, description: 'Business reference e.g. POL-2026-0010', businessKey: true },
      { name: 'customer_id',        type: 'uuid → core_customers', nullable: false, description: 'Policy holder' },
      { name: 'policy_type',        type: 'text',    nullable: false, description: 'Policy category' },
      { name: 'insurance_company',  type: 'text',    nullable: false, description: 'Issuing insurer name' },
      { name: 'policy_number',      type: 'text',    nullable: true,  description: 'Policy number (insurer-issued)' },
      { name: 'premium_amount',     type: 'numeric', nullable: true,  description: 'Annual premium' },
      { name: 'sum_assured',        type: 'numeric', nullable: true,  description: 'Sum assured / coverage amount' },
      { name: 'renewal_date',       type: 'date',    nullable: true,  description: 'Next renewal due date' },
      { name: 'status',             type: 'enum',    nullable: false, description: 'active | renewal_due | expired | closed' },
    ],
  },
  {
    tableName: 'core_documents', displayName: 'Documents', category: 'core', prefix: 'DOC-',
    purpose: 'File uploads linked to customers, loans, or insurance cases. Supports masking and access levels.',
    adminControlled: false, hasRefId: true,
    columns: [
      { name: 'id',               type: 'uuid',  nullable: false, description: 'Internal primary key' },
      { name: 'ref_id',           type: 'text',  nullable: false, description: 'Business reference e.g. DOC-0042', businessKey: true },
      { name: 'customer_id',      type: 'uuid → core_customers',       nullable: false, description: 'Document owner (customer)' },
      { name: 'loan_id',          type: 'uuid → core_loans',           nullable: true,  description: 'Linked loan case' },
      { name: 'insurance_case_id',type: 'uuid → core_insurance_cases', nullable: true,  description: 'Linked insurance case' },
      { name: 'document_name',    type: 'text',  nullable: false, description: 'Human-readable file name' },
      { name: 'document_type',    type: 'text',  nullable: false, description: 'PAN Card | Aadhaar Card | Bank Statement | etc.' },
      { name: 'category',         type: 'enum',  nullable: false, description: 'kyc | loan | insurance | property | other' },
      { name: 'file_url',         type: 'text',  nullable: false, description: 'Storage URL' },
      { name: 'is_sensitive',     type: 'boolean', nullable: false, description: 'Triggers masking checks via security_document_permissions' },
      { name: 'access_level',     type: 'text',  nullable: false, description: 'standard | restricted | confidential' },
    ],
  },
  {
    tableName: 'core_tasks', displayName: 'Tasks', category: 'core', prefix: 'TASK-',
    purpose: 'CRM tasks assigned to RMs and agents — follow-ups, document collection, renewals.',
    adminControlled: false, hasRefId: true,
    columns: [
      { name: 'ref_id',       type: 'text',  nullable: false, description: 'Business reference e.g. TASK-0021', businessKey: true },
      { name: 'customer_id',  type: 'uuid → core_customers', nullable: true, description: 'Linked customer (optional)' },
      { name: 'task_type',    type: 'enum',  nullable: false, description: 'Type key from config_task_types' },
      { name: 'title',        type: 'text',  nullable: false, description: 'Task title' },
      { name: 'due_date',     type: 'timestamptz', nullable: true, description: 'Due date and time' },
      { name: 'status',       type: 'enum',  nullable: false, description: 'pending | in_progress | completed | overdue' },
      { name: 'assigned_to',  type: 'uuid → master_users', nullable: true, description: 'Responsible user' },
    ],
  },
  {
    tableName: 'core_activities', displayName: 'Activity Log', category: 'core', prefix: 'ACT-',
    purpose: 'Customer-scoped activity feed — records all actions taken on a customer record.',
    adminControlled: false, hasRefId: true,
    columns: [
      { name: 'ref_id',         type: 'text',  nullable: false, description: 'Business reference', businessKey: true },
      { name: 'customer_id',    type: 'uuid → core_customers', nullable: true, description: 'Related customer' },
      { name: 'activity_type',  type: 'text',  nullable: false, description: 'loan_created | policy_created | note_added | etc.' },
      { name: 'description',    type: 'text',  nullable: false, description: 'Human-readable activity description' },
      { name: 'performed_by',   type: 'uuid → master_users', nullable: true, description: 'User who performed the action' },
    ],
  },
  {
    tableName: 'core_renewals', displayName: 'Renewals', category: 'core', prefix: 'REN-',
    purpose: 'Renewal reminders for insurance policies, EMIs, FD maturities. Drives the Renewals dashboard.',
    adminControlled: false, hasRefId: true,
    columns: [
      { name: 'ref_id',        type: 'text', nullable: false, description: 'Business reference', businessKey: true },
      { name: 'customer_id',   type: 'uuid → core_customers', nullable: false, description: 'Related customer' },
      { name: 'renewal_type',  type: 'enum', nullable: false, description: 'insurance | emi | fd_maturity | policy_expiry' },
      { name: 'renewal_date',  type: 'date', nullable: false, description: 'Due date for renewal action' },
      { name: 'amount',        type: 'numeric', nullable: true, description: 'Premium / amount due' },
      { name: 'status',        type: 'text', nullable: false, description: 'pending | completed | snoozed' },
    ],
  },
  // ── master_ ───────────────────────────────────────────────────────────────────
  {
    tableName: 'master_users', displayName: 'Users (Profiles)', category: 'master', prefix: 'USR-',
    purpose: 'System users — linked to Supabase Auth. Holds roles, designations, and team assignments.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'id',          type: 'uuid (auth.users FK)', nullable: false, description: 'Auth identity — matches Supabase Auth user ID' },
      { name: 'full_name',   type: 'text',    nullable: false, description: 'Display name' },
      { name: 'mobile',      type: 'text',    nullable: true,  description: 'Mobile number' },
      { name: 'role',        type: 'enum',    nullable: false, description: 'admin | rm | operations | agent' },
      { name: 'employee_id', type: 'text',    nullable: true,  description: 'HR employee identifier' },
      { name: 'designation', type: 'text',    nullable: true,  description: 'Job title / designation' },
      { name: 'team_id',     type: 'uuid → org_teams', nullable: true, description: 'Primary team (denormalised)' },
      { name: 'reports_to',  type: 'uuid → master_users', nullable: true, description: 'Manager reference' },
      { name: 'is_active',   type: 'boolean', nullable: false, description: 'Account active flag' },
    ],
  },
  // ── config_ ───────────────────────────────────────────────────────────────────
  {
    tableName: 'config_rm_profiles', displayName: 'RM Profiles', category: 'config', prefix: '—',
    purpose: 'Pre-registered RM profiles for partner onboarding. Standalone — not linked to auth.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'full_name',    type: 'text', nullable: false, description: 'RM full name' },
      { name: 'mobile',       type: 'text', nullable: false, description: 'Mobile number' },
      { name: 'email',        type: 'text', nullable: true,  description: 'Email address' },
      { name: 'designation',  type: 'text', nullable: true,  description: 'Designation' },
      { name: 'is_active',    type: 'boolean', nullable: false, description: 'Active status' },
    ],
  },
  {
    tableName: 'config_loan_products', displayName: 'Loan Products', category: 'config', prefix: '—',
    purpose: 'Admin-managed list of loan product types available in the system.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'name',        type: 'text',    nullable: false, description: 'Product name e.g. Home Loan' },
      { name: 'description', type: 'text',    nullable: true,  description: 'Description / eligibility notes' },
      { name: 'is_active',   type: 'boolean', nullable: false, description: 'Show/hide in dropdowns' },
    ],
  },
  {
    tableName: 'config_insurance_products', displayName: 'Insurance Products', category: 'config', prefix: '—',
    purpose: 'Admin-managed list of insurance products and their partner mapping.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'name',        type: 'text', nullable: false, description: 'Product name' },
      { name: 'partner',     type: 'text', nullable: false, description: 'Insurer / partner name' },
      { name: 'description', type: 'text', nullable: true,  description: 'Product description' },
      { name: 'is_active',   type: 'boolean', nullable: false, description: 'Active flag' },
    ],
  },
  {
    tableName: 'config_banks_nbfc', displayName: 'Banks & NBFCs', category: 'config', prefix: '—',
    purpose: 'Reference list of banks and NBFCs used in loan cases.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'name',      type: 'text', nullable: false, description: 'Institution name' },
      { name: 'type',      type: 'text', nullable: false, description: 'bank | nbfc' },
      { name: 'is_active', type: 'boolean', nullable: false, description: 'Active flag' },
    ],
  },
  {
    tableName: 'config_statuses', displayName: 'Status Configurations', category: 'config', prefix: '—',
    purpose: 'Admin-editable status lists for loans, insurance cases, customers, and tasks. No code deploy needed.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'resource_type', type: 'text',    nullable: false, description: 'loan | insurance_case | customer | task' },
      { name: 'status_key',    type: 'text',    nullable: false, description: 'Machine key e.g. logged_in' },
      { name: 'label',         type: 'text',    nullable: false, description: 'Display label e.g. Logged In' },
      { name: 'color',         type: 'text',    nullable: false, description: 'Tailwind color name for badge styling' },
      { name: 'sort_order',    type: 'integer', nullable: false, description: 'Display order in dropdowns' },
      { name: 'is_terminal',   type: 'boolean', nullable: false, description: 'Cannot transition away from this status' },
    ],
  },
  {
    tableName: 'config_task_types', displayName: 'Task Types', category: 'config', prefix: '—',
    purpose: 'Admin-editable task type catalogue. Controls what task types appear in creation forms.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'type_key', type: 'text', nullable: false, description: 'Machine key e.g. customer_call' },
      { name: 'label',    type: 'text', nullable: false, description: 'Display label' },
      { name: 'icon',     type: 'text', nullable: false, description: 'Lucide icon name' },
      { name: 'color',    type: 'text', nullable: false, description: 'Badge color' },
    ],
  },
  {
    tableName: 'config_renewal_rules', displayName: 'Renewal Rules', category: 'config', prefix: '—',
    purpose: 'Admin-configurable alert timing for renewal notifications.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'rule_name',          type: 'text',      nullable: false, description: 'Rule name for display' },
      { name: 'renewal_type',       type: 'text',      nullable: false, description: 'insurance | emi | fd_maturity | policy_expiry' },
      { name: 'alert_days_before',  type: 'integer[]', nullable: false, description: 'Array of days before due date to alert, e.g. {30,15,7,1}' },
    ],
  },
  {
    tableName: 'config_dashboard_widgets', displayName: 'Dashboard Widgets', category: 'config', prefix: '—',
    purpose: 'Per-role widget visibility for the dashboard. Admin controls which role sees what.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'widget_key', type: 'text',    nullable: false, description: 'Widget identifier e.g. kpi_overview' },
      { name: 'role',       type: 'text',    nullable: false, description: 'Role this entry applies to' },
      { name: 'is_visible', type: 'boolean', nullable: false, description: 'Toggle widget visibility for this role' },
    ],
  },
  // ── org_ ─────────────────────────────────────────────────────────────────────
  {
    tableName: 'org_teams', displayName: 'Teams', category: 'org', prefix: '—',
    purpose: 'Hierarchical team structure. Drives team-scoped data visibility in RBAC.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'name',           type: 'text',    nullable: false, description: 'Team name' },
      { name: 'parent_team_id', type: 'uuid → org_teams', nullable: true, description: 'Parent team (self-referential for nesting)' },
      { name: 'team_type',      type: 'text',    nullable: false, description: 'admin_team | rm_team | agent_team' },
      { name: 'is_active',      type: 'boolean', nullable: false, description: 'Active flag' },
    ],
  },
  {
    tableName: 'org_team_members', displayName: 'Team Members', category: 'org', prefix: '—',
    purpose: 'Junction table linking users to teams with their role within the team.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'team_id',      type: 'uuid → org_teams',    nullable: false, description: 'Team reference' },
      { name: 'profile_id',   type: 'uuid → master_users', nullable: false, description: 'User reference' },
      { name: 'role_in_team', type: 'text',    nullable: false, description: 'lead | member' },
      { name: 'is_active',    type: 'boolean', nullable: false, description: 'Membership active flag' },
    ],
  },
  // ── security_ ────────────────────────────────────────────────────────────────
  {
    tableName: 'security_role_permissions', displayName: 'Role Permissions', category: 'security', prefix: '—',
    purpose: 'The RBAC permission matrix. Admin configures what each role can do on each resource, with scope control.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'role',       type: 'text',    nullable: false, description: 'admin | rm | operations | agent' },
      { name: 'resource',   type: 'text',    nullable: false, description: 'customers | loans | insurance_cases | documents | tasks | renewals' },
      { name: 'action',     type: 'text',    nullable: false, description: 'view | create | edit | delete | reassign | view_sensitive' },
      { name: 'scope',      type: 'text',    nullable: false, description: 'all | own_team | own | none' },
      { name: 'is_allowed', type: 'boolean', nullable: false, description: 'Master toggle — false overrides scope' },
    ],
  },
  {
    tableName: 'security_document_permissions', displayName: 'Document Permissions', category: 'security', prefix: '—',
    purpose: 'Per document-type, per role access and masking configuration.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'document_type', type: 'text',    nullable: false, description: 'PAN Card | Aadhaar Card | Bank Statement | etc.' },
      { name: 'role',          type: 'text',    nullable: false, description: 'Role this entry applies to' },
      { name: 'can_view',      type: 'boolean', nullable: false, description: 'Can this role view the document/field' },
      { name: 'can_download',  type: 'boolean', nullable: false, description: 'Can this role download the document' },
      { name: 'is_masked',     type: 'boolean', nullable: false, description: 'Show masked value (e.g. AB•••••XY) by default' },
    ],
  },
  {
    tableName: 'security_audit_logs', displayName: 'Audit Logs', category: 'security', prefix: '—',
    purpose: 'Append-only system-wide audit trail. Records every write and every sensitive field reveal.',
    adminControlled: false, hasRefId: false,
    columns: [
      { name: 'actor_id',      type: 'text',  nullable: false, description: 'User who performed the action' },
      { name: 'actor_name',    type: 'text',  nullable: false, description: 'Denormalised actor name for log readability' },
      { name: 'actor_role',    type: 'text',  nullable: false, description: 'Role at time of action' },
      { name: 'action',        type: 'text',  nullable: false, description: 'create | update | delete | view_sensitive | reassign | export' },
      { name: 'resource_type', type: 'text',  nullable: false, description: 'Table / resource acted on' },
      { name: 'resource_id',   type: 'text',  nullable: true,  description: 'ID of the affected record' },
      { name: 'old_values',    type: 'jsonb', nullable: true,  description: 'State before change' },
      { name: 'new_values',    type: 'jsonb', nullable: true,  description: 'State after change' },
      { name: 'created_at',    type: 'timestamptz', nullable: false, description: 'Timestamp of event (append-only)' },
    ],
  },
  {
    tableName: 'security_access_overrides', displayName: 'Access Overrides', category: 'security', prefix: '—',
    purpose: 'Explicit access grants for restricted customers — overrides normal team-based visibility.',
    adminControlled: true, hasRefId: false,
    columns: [
      { name: 'customer_id',  type: 'uuid → core_customers', nullable: false, description: 'Restricted customer' },
      { name: 'profile_id',   type: 'uuid → master_users',   nullable: false, description: 'User being granted access' },
      { name: 'access_level', type: 'text', nullable: false, description: 'full | read_only | masked' },
      { name: 'expires_at',   type: 'timestamptz', nullable: true, description: 'Expiry (NULL = permanent)' },
    ],
  },
  // ── workflow_ ─────────────────────────────────────────────────────────────────
  {
    tableName: 'workflow_reassignments', displayName: 'Reassignment Requests', category: 'workflow', prefix: '—',
    purpose: 'Workflow records for customer/loan/insurance ownership transfers. Supports pending → approved/rejected flow.',
    adminControlled: false, hasRefId: false,
    columns: [
      { name: 'resource_type',    type: 'text', nullable: false, description: 'customer | loan | insurance_case' },
      { name: 'resource_id',      type: 'uuid', nullable: false, description: 'ID of the record being transferred' },
      { name: 'from_profile_id',  type: 'uuid → master_users', nullable: true, description: 'Current owner' },
      { name: 'to_profile_id',    type: 'uuid → master_users', nullable: true, description: 'New owner' },
      { name: 'reason',           type: 'text', nullable: true,  description: 'Reason for reassignment' },
      { name: 'status',           type: 'text', nullable: false, description: 'pending | approved | rejected' },
      { name: 'reviewed_by',      type: 'text', nullable: true,  description: 'Admin who approved/rejected' },
    ],
  },
];

const TYPE_COLORS: Record<string, string> = {
  'uuid': 'text-slate-400',
  'text': 'text-blue-600',
  'boolean': 'text-emerald-600',
  'numeric': 'text-amber-600',
  'integer': 'text-amber-600',
  'date': 'text-violet-600',
  'timestamptz': 'text-violet-600',
  'jsonb': 'text-orange-600',
  'enum': 'text-teal-600',
  'integer[]': 'text-amber-600',
};

function typeBadgeColor(type: string): string {
  const base = type.split(' ')[0].split('(')[0];
  return TYPE_COLORS[base] ?? 'text-slate-500';
}

export default function DataDictionary() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<TableCategory | ''>('');
  const [filterAdmin, setFilterAdmin] = useState<'all' | 'admin' | 'system'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(name: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(filtered.map(t => t.tableName)));
  }
  function collapseAll() {
    setExpanded(new Set());
  }

  const filtered = TABLES.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.tableName.includes(q) || t.displayName.toLowerCase().includes(q) || t.purpose.toLowerCase().includes(q);
    const matchCat = !filterCategory || t.category === filterCategory;
    const matchAdmin = filterAdmin === 'all' || (filterAdmin === 'admin' ? t.adminControlled : !t.adminControlled);
    return matchSearch && matchCat && matchAdmin;
  });

  const categoryCounts = Object.keys(CATEGORY_META).reduce((acc, cat) => ({
    ...acc,
    [cat]: TABLES.filter(t => t.category === cat).length,
  }), {} as Record<string, number>);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Data Dictionary</h2>
          </div>
          <p className="text-xs text-slate-500">Schema reference — {TABLES.length} tables across 6 domain categories. Business ref IDs eliminate UUID exposure in the UI.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">Expand All</button>
          <button onClick={collapseAll} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">Collapse All</button>
        </div>
      </div>

      {/* Category summary tiles */}
      <div className="grid grid-cols-6 gap-2">
        {(Object.entries(CATEGORY_META) as [TableCategory, typeof CATEGORY_META[TableCategory]][]).map(([cat, meta]) => {
          const Icon = meta.icon;
          const active = filterCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(active ? '' : cat)}
              className={`p-3 rounded-xl border text-left transition-all ${active ? `${meta.bgColor} ${meta.borderColor} shadow-md` : 'bg-white border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${active ? meta.color : 'text-slate-400'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? meta.color : 'text-slate-500'}`}>{meta.label}</span>
              </div>
              <p className="text-xl font-bold text-slate-800">{categoryCounts[cat]}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">tables</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tables, columns, purpose..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(['all', 'admin', 'system'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterAdmin(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filterAdmin === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {f === 'admin' ? 'Admin-controlled' : f === 'system' ? 'System-managed' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">No tables match your filters</div>
        )}
        {filtered.map(table => {
          const meta = CATEGORY_META[table.category];
          const Icon = meta.icon;
          const isExpanded = expanded.has(table.tableName);

          return (
            <div key={table.tableName} className={`bg-white rounded-2xl border transition-all ${isExpanded ? `${meta.borderColor}` : 'border-slate-200'} overflow-hidden`}>
              {/* Table header */}
              <button
                onClick={() => toggleExpand(table.tableName)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}

                <div className={`p-1.5 rounded-lg ${meta.bgColor} flex-shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-slate-800">{table.tableName}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.bgColor} ${meta.color}`}>{meta.label}</span>
                    {table.adminControlled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Admin-controlled</span>
                    )}
                    {table.hasRefId && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Ref ID: {table.prefix}…</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{table.purpose}</p>
                </div>

                <div className="text-xs text-slate-400 flex-shrink-0 text-right">
                  <p>{table.columns.length} columns</p>
                  <p>{table.displayName}</p>
                </div>
              </button>

              {/* Column list */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {/* Purpose banner */}
                  <div className={`px-5 py-3 ${meta.bgColor} border-b ${meta.borderColor}`}>
                    <p className="text-xs text-slate-600">{table.purpose}</p>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-5 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide w-48">Column</th>
                        <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide w-52">Type</th>
                        <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Description</th>
                        <th className="px-4 py-2 w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {table.columns.map(col => (
                        <tr key={col.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs text-slate-700 font-semibold">{col.name}</span>
                              {!col.nullable && <span className="text-[9px] text-red-400 font-bold">*</span>}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`font-mono text-xs ${typeBadgeColor(col.type)}`}>{col.type}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">{col.description}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1 justify-end">
                              {col.businessKey && <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full">REF</span>}
                              {col.sensitive && <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">PII</span>}
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
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-slate-400 border-t border-slate-100 pt-4">
        <span className="text-red-400 font-bold">*</span> Required field
        <span className="bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full text-[9px]">REF</span> Business reference key
        <span className="bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full text-[9px]">PII</span> Personally Identifiable / Sensitive data
        <span className="font-mono text-amber-600 text-xs">numeric</span> Currency/financial field
      </div>
    </div>
  );
}
