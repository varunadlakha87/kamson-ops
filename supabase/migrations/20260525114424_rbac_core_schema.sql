/*
  # RBAC Core Schema

  ## New Tables

  ### teams
  - Hierarchical team structure (admin_team > rm_team > agent_team)
  - Self-referential parent_team_id for nesting

  ### team_members
  - Profile-to-team junction with role_in_team (lead / member)

  ### role_permissions
  - The no-code permission matrix: role x resource x action x scope
  - Admin can edit rows from the UI without code changes

  ### document_permissions
  - Per document-type, per role: can_view, can_download, is_masked
  - Admin-configurable masking rules for PAN, Aadhaar, etc.

  ### audit_logs
  - Append-only system-wide audit trail
  - Captures actor, action, resource, old/new values as JSONB

  ### customer_access_overrides
  - Explicit access grants for restricted customers
  - Overrides team-based visibility

  ### reassignment_requests
  - Workflow table for transferring customer/loan/insurance ownership
  - Supports pending > approved/rejected flow

  ### status_configs
  - Admin-editable status lists (no-code operational changes)
  - Covers loan, insurance_case, customer, task statuses

  ### task_type_configs
  - Admin-editable task type list

  ### renewal_rules
  - Configurable renewal alert timing (days before)

  ### dashboard_widget_permissions
  - Per-role widget visibility configuration

  ## Modified Tables
  - customers: + owner_id, assigned_team_id, access_level, is_restricted
  - loans: + owner_id, assigned_team_id
  - insurance_policies: + owner_id, assigned_team_id
  - insurance_cases: + owner_id, assigned_team_id
  - documents: + owner_id, is_sensitive, access_level
  - tasks: + owner_id, assigned_team_id
  - profiles: + team_id, reports_to, employee_id, designation, joined_at
*/

-- ── teams ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL DEFAULT '',
  parent_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  team_type      text NOT NULL DEFAULT 'rm_team',
  is_active      boolean DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow all insert on teams" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on teams" ON teams FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on teams" ON teams FOR DELETE USING (true);

-- ── team_members ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_in_team text NOT NULL DEFAULT 'member',
  is_active    boolean DEFAULT true,
  joined_at    timestamptz DEFAULT now(),
  UNIQUE(team_id, profile_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on team_members" ON team_members FOR SELECT USING (true);
CREATE POLICY "Allow all insert on team_members" ON team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on team_members" ON team_members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on team_members" ON team_members FOR DELETE USING (true);

-- ── role_permissions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role       text NOT NULL,
  resource   text NOT NULL,
  action     text NOT NULL,
  scope      text NOT NULL DEFAULT 'own',
  is_allowed boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, resource, action)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on role_permissions" ON role_permissions FOR SELECT USING (true);
CREATE POLICY "Allow all insert on role_permissions" ON role_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on role_permissions" ON role_permissions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on role_permissions" ON role_permissions FOR DELETE USING (true);

-- ── document_permissions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_permissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL,
  role          text NOT NULL,
  can_view      boolean DEFAULT true,
  can_download  boolean DEFAULT true,
  is_masked     boolean DEFAULT false,
  mask_pattern  text DEFAULT '',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(document_type, role)
);

ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on document_permissions" ON document_permissions FOR SELECT USING (true);
CREATE POLICY "Allow all insert on document_permissions" ON document_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on document_permissions" ON document_permissions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on document_permissions" ON document_permissions FOR DELETE USING (true);

-- ── audit_logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      text DEFAULT '',
  actor_name    text DEFAULT '',
  actor_role    text DEFAULT '',
  action        text NOT NULL,
  resource_type text NOT NULL,
  resource_id   text DEFAULT '',
  old_values    jsonb,
  new_values    jsonb,
  ip_address    text DEFAULT '',
  session_id    text DEFAULT '',
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor    ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created  ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on audit_logs" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow all insert on audit_logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- ── customer_access_overrides ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_access_overrides (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  granted_by   text DEFAULT '',
  access_level text NOT NULL DEFAULT 'read_only',
  expires_at   timestamptz,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(customer_id, profile_id)
);

ALTER TABLE customer_access_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on customer_access_overrides" ON customer_access_overrides FOR SELECT USING (true);
CREATE POLICY "Allow all insert on customer_access_overrides" ON customer_access_overrides FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on customer_access_overrides" ON customer_access_overrides FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on customer_access_overrides" ON customer_access_overrides FOR DELETE USING (true);

-- ── reassignment_requests ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reassignment_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type   text NOT NULL,
  resource_id     uuid NOT NULL,
  from_profile_id uuid REFERENCES profiles(id),
  to_profile_id   uuid REFERENCES profiles(id),
  requested_by    text DEFAULT '',
  reason          text DEFAULT '',
  status          text DEFAULT 'pending',
  reviewed_by     text DEFAULT '',
  reviewed_at     timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE reassignment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on reassignment_requests" ON reassignment_requests FOR SELECT USING (true);
CREATE POLICY "Allow all insert on reassignment_requests" ON reassignment_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on reassignment_requests" ON reassignment_requests FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on reassignment_requests" ON reassignment_requests FOR DELETE USING (true);

-- ── status_configs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS status_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL,
  status_key    text NOT NULL,
  label         text NOT NULL,
  color         text DEFAULT 'slate',
  sort_order    integer DEFAULT 0,
  is_active     boolean DEFAULT true,
  is_terminal   boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(resource_type, status_key)
);

ALTER TABLE status_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on status_configs" ON status_configs FOR SELECT USING (true);
CREATE POLICY "Allow all insert on status_configs" ON status_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on status_configs" ON status_configs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on status_configs" ON status_configs FOR DELETE USING (true);

-- ── task_type_configs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_type_configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key    text NOT NULL UNIQUE,
  label       text NOT NULL,
  icon        text DEFAULT 'CheckSquare',
  color       text DEFAULT 'slate',
  is_active   boolean DEFAULT true,
  sort_order  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE task_type_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on task_type_configs" ON task_type_configs FOR SELECT USING (true);
CREATE POLICY "Allow all insert on task_type_configs" ON task_type_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on task_type_configs" ON task_type_configs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on task_type_configs" ON task_type_configs FOR DELETE USING (true);

-- ── renewal_rules ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS renewal_rules (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name          text NOT NULL,
  renewal_type       text NOT NULL,
  alert_days_before  integer[] DEFAULT '{30,15,7,1}',
  is_active          boolean DEFAULT true,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE renewal_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on renewal_rules" ON renewal_rules FOR SELECT USING (true);
CREATE POLICY "Allow all insert on renewal_rules" ON renewal_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on renewal_rules" ON renewal_rules FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on renewal_rules" ON renewal_rules FOR DELETE USING (true);

-- ── dashboard_widget_permissions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dashboard_widget_permissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_key text NOT NULL,
  role       text NOT NULL,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(widget_key, role)
);

ALTER TABLE dashboard_widget_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on dashboard_widget_permissions" ON dashboard_widget_permissions FOR SELECT USING (true);
CREATE POLICY "Allow all insert on dashboard_widget_permissions" ON dashboard_widget_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on dashboard_widget_permissions" ON dashboard_widget_permissions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on dashboard_widget_permissions" ON dashboard_widget_permissions FOR DELETE USING (true);

-- ── Extend existing tables ────────────────────────────────────────────────────

-- profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='team_id') THEN
    ALTER TABLE profiles ADD COLUMN team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='reports_to') THEN
    ALTER TABLE profiles ADD COLUMN reports_to uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='employee_id') THEN
    ALTER TABLE profiles ADD COLUMN employee_id text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='designation') THEN
    ALTER TABLE profiles ADD COLUMN designation text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='joined_at') THEN
    ALTER TABLE profiles ADD COLUMN joined_at date;
  END IF;
END $$;

-- customers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='owner_id') THEN
    ALTER TABLE customers ADD COLUMN owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='assigned_team_id') THEN
    ALTER TABLE customers ADD COLUMN assigned_team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='access_level') THEN
    ALTER TABLE customers ADD COLUMN access_level text DEFAULT 'standard';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='is_restricted') THEN
    ALTER TABLE customers ADD COLUMN is_restricted boolean DEFAULT false;
  END IF;
END $$;

-- loans
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loans' AND column_name='owner_id') THEN
    ALTER TABLE loans ADD COLUMN owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loans' AND column_name='assigned_team_id') THEN
    ALTER TABLE loans ADD COLUMN assigned_team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- insurance_cases
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_cases' AND column_name='owner_id') THEN
    ALTER TABLE insurance_cases ADD COLUMN owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='insurance_cases' AND column_name='assigned_team_id') THEN
    ALTER TABLE insurance_cases ADD COLUMN assigned_team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- documents
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='owner_id') THEN
    ALTER TABLE documents ADD COLUMN owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='is_sensitive') THEN
    ALTER TABLE documents ADD COLUMN is_sensitive boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='access_level') THEN
    ALTER TABLE documents ADD COLUMN access_level text DEFAULT 'standard';
  END IF;
END $$;

-- tasks
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='owner_id') THEN
    ALTER TABLE tasks ADD COLUMN owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assigned_team_id') THEN
    ALTER TABLE tasks ADD COLUMN assigned_team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Seed Data ─────────────────────────────────────────────────────────────────

-- Default role permissions
INSERT INTO role_permissions (role, resource, action, scope, is_allowed) VALUES
  -- admin: all resources, all actions, all scope
  ('admin','customers','view','all',true),
  ('admin','customers','create','all',true),
  ('admin','customers','edit','all',true),
  ('admin','customers','delete','all',true),
  ('admin','customers','reassign','all',true),
  ('admin','customers','view_sensitive','all',true),
  ('admin','loans','view','all',true),
  ('admin','loans','create','all',true),
  ('admin','loans','edit','all',true),
  ('admin','loans','delete','all',true),
  ('admin','loans','reassign','all',true),
  ('admin','loans','view_sensitive','all',true),
  ('admin','insurance_cases','view','all',true),
  ('admin','insurance_cases','create','all',true),
  ('admin','insurance_cases','edit','all',true),
  ('admin','insurance_cases','delete','all',true),
  ('admin','insurance_cases','reassign','all',true),
  ('admin','insurance_cases','view_sensitive','all',true),
  ('admin','documents','view','all',true),
  ('admin','documents','create','all',true),
  ('admin','documents','edit','all',true),
  ('admin','documents','delete','all',true),
  ('admin','documents','reassign','all',true),
  ('admin','documents','view_sensitive','all',true),
  ('admin','tasks','view','all',true),
  ('admin','tasks','create','all',true),
  ('admin','tasks','edit','all',true),
  ('admin','tasks','delete','all',true),
  ('admin','tasks','reassign','all',true),
  ('admin','tasks','view_sensitive','all',true),
  -- rm
  ('rm','customers','view','own_team',true),
  ('rm','customers','create','own',true),
  ('rm','customers','edit','own_team',true),
  ('rm','customers','delete','none',false),
  ('rm','customers','reassign','none',false),
  ('rm','customers','view_sensitive','own_team',true),
  ('rm','loans','view','own_team',true),
  ('rm','loans','create','own',true),
  ('rm','loans','edit','own_team',true),
  ('rm','loans','delete','none',false),
  ('rm','loans','reassign','none',false),
  ('rm','loans','view_sensitive','own_team',true),
  ('rm','insurance_cases','view','own_team',true),
  ('rm','insurance_cases','create','own',true),
  ('rm','insurance_cases','edit','own_team',true),
  ('rm','insurance_cases','delete','none',false),
  ('rm','insurance_cases','reassign','none',false),
  ('rm','insurance_cases','view_sensitive','own_team',true),
  ('rm','documents','view','own_team',true),
  ('rm','documents','create','own',true),
  ('rm','documents','edit','own_team',true),
  ('rm','documents','delete','none',false),
  ('rm','documents','reassign','none',false),
  ('rm','documents','view_sensitive','own_team',false),
  ('rm','tasks','view','own_team',true),
  ('rm','tasks','create','own',true),
  ('rm','tasks','edit','own_team',true),
  ('rm','tasks','delete','own',true),
  ('rm','tasks','reassign','none',false),
  ('rm','tasks','view_sensitive','none',false),
  -- operations
  ('operations','customers','view','all',true),
  ('operations','customers','create','all',true),
  ('operations','customers','edit','all',true),
  ('operations','customers','delete','none',false),
  ('operations','customers','reassign','all',true),
  ('operations','customers','view_sensitive','none',false),
  ('operations','loans','view','all',true),
  ('operations','loans','create','all',true),
  ('operations','loans','edit','all',true),
  ('operations','loans','delete','none',false),
  ('operations','loans','reassign','all',true),
  ('operations','loans','view_sensitive','none',false),
  ('operations','insurance_cases','view','all',true),
  ('operations','insurance_cases','create','all',true),
  ('operations','insurance_cases','edit','all',true),
  ('operations','insurance_cases','delete','none',false),
  ('operations','insurance_cases','reassign','all',true),
  ('operations','insurance_cases','view_sensitive','none',false),
  ('operations','documents','view','all',true),
  ('operations','documents','create','all',true),
  ('operations','documents','edit','all',true),
  ('operations','documents','delete','none',false),
  ('operations','documents','reassign','none',false),
  ('operations','documents','view_sensitive','none',false),
  ('operations','tasks','view','all',true),
  ('operations','tasks','create','all',true),
  ('operations','tasks','edit','all',true),
  ('operations','tasks','delete','none',false),
  ('operations','tasks','reassign','all',true),
  ('operations','tasks','view_sensitive','none',false),
  -- agent
  ('agent','customers','view','own',true),
  ('agent','customers','create','none',false),
  ('agent','customers','edit','none',false),
  ('agent','customers','delete','none',false),
  ('agent','customers','reassign','none',false),
  ('agent','customers','view_sensitive','none',false),
  ('agent','loans','view','own',true),
  ('agent','loans','create','none',false),
  ('agent','loans','edit','none',false),
  ('agent','loans','delete','none',false),
  ('agent','loans','reassign','none',false),
  ('agent','loans','view_sensitive','none',false),
  ('agent','insurance_cases','view','own',true),
  ('agent','insurance_cases','create','own',true),
  ('agent','insurance_cases','edit','own',true),
  ('agent','insurance_cases','delete','none',false),
  ('agent','insurance_cases','reassign','none',false),
  ('agent','insurance_cases','view_sensitive','none',false),
  ('agent','documents','view','own',true),
  ('agent','documents','create','own',true),
  ('agent','documents','edit','none',false),
  ('agent','documents','delete','none',false),
  ('agent','documents','reassign','none',false),
  ('agent','documents','view_sensitive','none',false),
  ('agent','tasks','view','own',true),
  ('agent','tasks','create','own',true),
  ('agent','tasks','edit','own',true),
  ('agent','tasks','delete','none',false),
  ('agent','tasks','reassign','none',false),
  ('agent','tasks','view_sensitive','none',false)
ON CONFLICT (role, resource, action) DO NOTHING;

-- Default document permissions
INSERT INTO document_permissions (document_type, role, can_view, can_download, is_masked) VALUES
  ('PAN Card',       'admin',      true,  true,  false),
  ('PAN Card',       'rm',         true,  true,  true),
  ('PAN Card',       'operations', true,  false, true),
  ('PAN Card',       'agent',      false, false, false),
  ('Aadhaar Card',   'admin',      true,  true,  false),
  ('Aadhaar Card',   'rm',         true,  true,  true),
  ('Aadhaar Card',   'operations', true,  false, true),
  ('Aadhaar Card',   'agent',      false, false, false),
  ('Bank Statement', 'admin',      true,  true,  false),
  ('Bank Statement', 'rm',         true,  true,  false),
  ('Bank Statement', 'operations', true,  true,  false),
  ('Bank Statement', 'agent',      false, false, false),
  ('Salary Slip',    'admin',      true,  true,  false),
  ('Salary Slip',    'rm',         true,  true,  false),
  ('Salary Slip',    'operations', true,  false, false),
  ('Salary Slip',    'agent',      false, false, false),
  ('ITR',            'admin',      true,  true,  false),
  ('ITR',            'rm',         true,  true,  false),
  ('ITR',            'operations', true,  false, false),
  ('ITR',            'agent',      false, false, false),
  ('Passport',       'admin',      true,  true,  false),
  ('Passport',       'rm',         true,  true,  true),
  ('Passport',       'operations', true,  false, true),
  ('Passport',       'agent',      false, false, false),
  ('Voter ID',       'admin',      true,  true,  false),
  ('Voter ID',       'rm',         true,  true,  true),
  ('Voter ID',       'operations', true,  false, true),
  ('Voter ID',       'agent',      false, false, false)
ON CONFLICT (document_type, role) DO NOTHING;

-- Default status configs
INSERT INTO status_configs (resource_type, status_key, label, color, sort_order, is_terminal) VALUES
  ('loan','lead','Lead','slate',0,false),
  ('loan','logged_in','Logged In','blue',1,false),
  ('loan','documents_pending','Docs Pending','amber',2,false),
  ('loan','approved','Approved','cyan',3,false),
  ('loan','sanctioned','Sanctioned','indigo',4,false),
  ('loan','disbursed','Disbursed','emerald',5,true),
  ('loan','rejected','Rejected','red',6,true),
  ('loan','closed','Closed','slate',7,true),
  ('insurance_case','Lead Generated','Lead Generated','slate',0,false),
  ('insurance_case','Quote Requested','Quote Requested','blue',1,false),
  ('insurance_case','Quote Received','Quote Received','cyan',2,false),
  ('insurance_case','Customer Discussion','Customer Discussion','amber',3,false),
  ('insurance_case','Documents Pending','Documents Pending','orange',4,false),
  ('insurance_case','Under Process','Under Process','violet',5,false),
  ('insurance_case','Policy Issued','Policy Issued','emerald',6,true),
  ('insurance_case','Rejected','Rejected','red',7,true),
  ('insurance_case','Closed','Closed','slate',8,true),
  ('customer','active','Active','emerald',0,false),
  ('customer','follow_up_pending','Follow-up Pending','amber',1,false),
  ('customer','renewal_due','Renewal Due','orange',2,false),
  ('customer','closed','Closed','slate',3,true),
  ('task','pending','Pending','amber',0,false),
  ('task','in_progress','In Progress','blue',1,false),
  ('task','completed','Completed','emerald',2,true),
  ('task','overdue','Overdue','red',3,false)
ON CONFLICT (resource_type, status_key) DO NOTHING;

-- Default task type configs
INSERT INTO task_type_configs (type_key, label, icon, color, sort_order) VALUES
  ('customer_call',       'Customer Call',       'Phone',         'blue',   0),
  ('document_collection', 'Document Collection', 'FileText',      'amber',  1),
  ('insurance_renewal',   'Insurance Renewal',   'RefreshCw',     'emerald',2),
  ('emi_followup',        'EMI Follow-up',       'IndianRupee',   'orange', 3),
  ('site_visit',          'Site Visit',          'MapPin',        'teal',   4),
  ('quote_sharing',       'Quote Sharing',       'Send',          'cyan',   5),
  ('other',               'Other',               'MoreHorizontal','slate',  6)
ON CONFLICT (type_key) DO NOTHING;

-- Default renewal rules
INSERT INTO renewal_rules (rule_name, renewal_type, alert_days_before) VALUES
  ('Insurance Renewal Alert',  'insurance',    '{30,15,7,1}'),
  ('EMI Due Reminder',         'emi',          '{3,1}'),
  ('FD Maturity Alert',        'fd_maturity',  '{30,15,7}'),
  ('Policy Expiry Alert',      'policy_expiry','{60,30,15,7}')
ON CONFLICT DO NOTHING;

-- Default dashboard widget permissions
INSERT INTO dashboard_widget_permissions (widget_key, role, is_visible) VALUES
  ('kpi_overview',     'admin',      true),
  ('kpi_overview',     'rm',         true),
  ('kpi_overview',     'operations', true),
  ('kpi_overview',     'agent',      false),
  ('insurance_month',  'admin',      true),
  ('insurance_month',  'rm',         true),
  ('insurance_month',  'operations', true),
  ('insurance_month',  'agent',      true),
  ('loans_month',      'admin',      true),
  ('loans_month',      'rm',         true),
  ('loans_month',      'operations', true),
  ('loans_month',      'agent',      false),
  ('renewals_due',     'admin',      true),
  ('renewals_due',     'rm',         true),
  ('renewals_due',     'operations', true),
  ('renewals_due',     'agent',      true),
  ('recent_activity',  'admin',      true),
  ('recent_activity',  'rm',         true),
  ('recent_activity',  'operations', true),
  ('recent_activity',  'agent',      false),
  ('team_leaderboard', 'admin',      true),
  ('team_leaderboard', 'rm',         true),
  ('team_leaderboard', 'operations', false),
  ('team_leaderboard', 'agent',      false)
ON CONFLICT (widget_key, role) DO NOTHING;
