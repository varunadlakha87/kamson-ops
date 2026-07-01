import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// ── Table name constants ───────────────────────────────────────────────────────
export const T = {
  CUSTOMERS:           'core_customers',
  CUSTOMER_TAGS:       'core_customer_tags',
  LOANS:               'core_loans',
  INSURANCE_POLICIES:  'core_insurance_policies',
  INSURANCE_CASES:     'core_insurance_cases',
  INSURANCE_QUOTES:    'core_insurance_quotes',
  DOCUMENTS:           'core_documents',
  TASKS:               'core_tasks',
  ACTIVITIES:          'core_activities',
  RENEWALS:            'core_renewals',
  COMMISSIONS:         'core_commissions',
  USERS:               'master_users',
  RM_PROFILES:         'config_rm_profiles',
  LOAN_PRODUCTS:       'config_loan_products',
  INSURANCE_PRODUCTS:  'config_insurance_products',
  BANKS_NBFC:          'config_banks_nbfc',
  STATUSES:            'config_statuses',
  TASK_TYPES:          'config_task_types',
  RENEWAL_RULES:       'config_renewal_rules',
  DASHBOARD_WIDGETS:   'config_dashboard_widgets',
  TEAMS:               'org_teams',
  TEAM_MEMBERS:        'org_team_members',
  ROLE_PERMISSIONS:    'security_role_permissions',
  DOC_PERMISSIONS:     'security_document_permissions',
  AUDIT_LOGS:          'security_audit_logs',
  ACCESS_OVERRIDES:    'security_access_overrides',
  REASSIGNMENTS:       'workflow_reassignments',
} as const;

// ── Enums ─────────────────────────────────────────────────────────────────────
export type UserRole         = 'admin' | 'rm' | 'operations' | 'agent';
export type CustomerStatus   = 'active' | 'follow_up_pending' | 'closed' | 'renewal_due';
export type LoanStatus       = 'lead' | 'logged_in' | 'documents_pending' | 'approved' | 'sanctioned' | 'disbursed' | 'rejected' | 'closed';
export type InsuranceStatus  = 'active' | 'renewal_due' | 'expired' | 'claim_initiated' | 'closed';
export type TaskStatus       = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type TaskType         = 'customer_call' | 'document_collection' | 'insurance_renewal' | 'emi_followup' | 'site_visit' | 'quote_sharing' | 'other';
export type DocumentCategory = 'kyc' | 'loan' | 'insurance' | 'property' | 'other';

// ── Interfaces ────────────────────────────────────────────────────────────────
export interface Profile {
  id: string; full_name: string; mobile: string; role: UserRole;
  avatar_url: string; is_active: boolean; employee_id?: string;
  designation?: string; team_id?: string | null; reports_to?: string | null;
  joined_at?: string | null; created_at: string; updated_at: string;
}
export interface Customer {
  id: string; ref_id: string; customer_code: string; full_name: string; mobile: string;
  alternate_mobile: string; email: string; pan: string; aadhaar: string;
  date_of_birth: string | null; address: string; occupation: string;
  status: CustomerStatus; assigned_rm_id: string | null;
  assigned_agent_id: string | null; owner_id: string | null;
  assigned_team_id: string | null; access_level: string;
  is_restricted: boolean; notes: string; created_by: string | null;
  created_at: string; updated_at: string; active: boolean;
  assigned_rm?: Profile; tags?: CustomerTag[];
}
export interface CustomerTag { id: string; customer_id: string; tag: string; created_at: string; }
export interface Loan {
  id: string; ref_id: string; case_number: string | null; customer_id: string | null;
  loan_type: string; bank_nbfc: string; loan_amount: number; emi_amount: number;
  roi: number; tenure_months: number; login_date: string | null;
  disbursal_date: string | null; loan_account_number: string; status: LoanStatus;
  assigned_rm_id: string | null; owner_id: string | null; assigned_team_id: string | null;
  notes: string; created_by: string | null; created_at: string; updated_at: string;
  active: boolean; customer?: Customer;
}
export interface InsurancePolicy {
  id: string; ref_id: string; customer_id: string; policy_type: string;
  insurance_company: string; policy_number: string; premium_amount: number;
  sum_assured: number; policy_start_date: string | null; renewal_date: string | null;
  nominee_name: string; status: InsuranceStatus; assigned_rm_id: string | null;
  owner_id: string | null; notes: string; created_by: string | null;
  created_at: string; updated_at: string; active: boolean;
  // MIS fields
  vehicle_number: string; vehicle_model: string; proposal_number: string;
  lead_date: string | null; is_renewal: boolean; insurance_category: string;
  channel: string; od_amount: number; tp_amount: number;
  payout_percentage: number; payout_amount: number; cashback_amount: number;
  profitable_amount: number; payout_status: string; payment_mode: string;
  payment_reference: string; chq_reported_date: string | null;
  customer?: Customer;
}
export interface Document {
  id: string; ref_id: string; customer_id: string; loan_id: string | null;
  policy_id: string | null; insurance_case_id: string | null; document_name: string;
  document_type: string; category: DocumentCategory; file_url: string;
  file_size: number; mime_type: string; uploaded_by: string | null;
  owner_id: string | null; is_sensitive: boolean; access_level: string;
  created_at: string; updated_at: string; active: boolean;
  customer?: Customer; uploader?: Profile;
}
export interface Task {
  id: string; ref_id: string; customer_id: string | null; task_type: TaskType;
  title: string; description: string; due_date: string | null; status: TaskStatus;
  assigned_to: string | null; created_by: string | null; completed_at: string | null;
  owner_id: string | null; assigned_team_id: string | null; created_at: string;
  updated_at: string; active: boolean; customer?: Customer; assignee?: Profile;
}
export interface Activity {
  id: string; ref_id: string; customer_id: string | null; loan_id: string | null;
  policy_id: string | null; activity_type: string; description: string;
  performed_by: string | null; created_at: string; performer?: Profile;
}
export interface InsuranceCase {
  id: string; insurance_code: string; ref_id: string;
  customer_id: string | null; customer_name: string; mobile: string;
  insurance_type: string | null; policy_type: string | null;
  insurance_company: string | null; business_type: string;
  vehicle_number: string | null; vehicle_model: string | null;
  current_stage: string; case_status: string;
  selected_quote_id: string | null;
  contact_person: string | null; relation: string | null;
  policy_mobile: string | null; policy_email: string | null;
  policy_number: string | null; policy_start_date: string | null;
  policy_end_date: string | null; policy_issue_date: string | null;
  payment_mode: string | null; payment_reference: string | null;
  cheque_reported_date: string | null;
  payout_status: string; actual_payout_amount: number | null;
  payout_received_date: string | null; cashback_amount: number;
  profit_amount: number | null;
  od_amount: number; tp_amount: number; premium_amount: number;
  expected_commission: number;
  rm_id: string | null; assigned_agent_id: string | null;
  insurance_done_by: string | null; owner_id: string | null;
  assigned_team_id: string | null; created_by: string | null;
  remarks: string | null; active: boolean;
  created_at: string; updated_at: string;
  rm?: Profile; customer?: Customer;
}
export interface InsuranceQuote {
  id: string; case_id: string;
  insurance_company: string; proposal_number: string | null;
  premium_od: number; premium_tp: number; total_premium: number;
  payout_percent: number; expected_payout_amount: number;
  is_selected: boolean; quote_date: string;
  remarks: string | null; created_by: string | null;
  created_at: string; updated_at: string;
}

export interface Renewal {
  id: string; ref_id: string; customer_id: string; policy_id: string | null;
  renewal_type: string; title: string; renewal_date: string; amount: number;
  status: string; notes: string; created_at: string; updated_at: string;
  active: boolean; customer?: Customer; policy?: InsurancePolicy;
}
