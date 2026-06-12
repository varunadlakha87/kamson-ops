/*
  # Schema Refactor: Categorized Table Prefixes + Business Reference IDs + Metadata

  ## Summary
  Renames all 26 tables using domain-specific prefixes for business clarity:
  - core_    → operational business tables (customers, loans, insurance, tasks, etc.)
  - master_  → user/profile master data
  - config_  → admin-controlled configuration tables
  - security_→ permissions and audit tables
  - org_     → organizational/team structure
  - workflow_→ process/workflow tables

  ## Rename Map
  | Old Name                     | New Name                          |
  |------------------------------|-----------------------------------|
  | profiles                     | master_users                      |
  | customers                    | core_customers                    |
  | customer_tags                | core_customer_tags                |
  | loans                        | core_loans                        |
  | insurance_policies           | core_insurance_policies           |
  | insurance_cases              | core_insurance_cases              |
  | documents                    | core_documents                    |
  | tasks                        | core_tasks                        |
  | activities                   | core_activities                   |
  | renewals                     | core_renewals                     |
  | commissions                  | core_commissions                  |
  | rm_users                     | config_rm_profiles                |
  | loan_products                | config_loan_products              |
  | insurance_products           | config_insurance_products         |
  | banks_nbfc                   | config_banks_nbfc                 |
  | teams                        | org_teams                         |
  | team_members                 | org_team_members                  |
  | role_permissions             | security_role_permissions         |
  | document_permissions         | security_document_permissions     |
  | audit_logs                   | security_audit_logs               |
  | customer_access_overrides    | security_access_overrides         |
  | reassignment_requests        | workflow_reassignments            |
  | status_configs               | config_statuses                   |
  | task_type_configs            | config_task_types                 |
  | renewal_rules                | config_renewal_rules              |
  | dashboard_widget_permissions | config_dashboard_widgets          |

  ## New columns added to all core_ tables:
  - ref_id (text, unique, human-friendly e.g. CUS-0001)
  - updated_by (text)
  - active (boolean DEFAULT true)

  ## New sequences for ref_id auto-generation
*/

-- ── Step 1: Rename tables ─────────────────────────────────────────────────────

ALTER TABLE IF EXISTS profiles                   RENAME TO master_users;
ALTER TABLE IF EXISTS customers                  RENAME TO core_customers;
ALTER TABLE IF EXISTS customer_tags              RENAME TO core_customer_tags;
ALTER TABLE IF EXISTS loans                      RENAME TO core_loans;
ALTER TABLE IF EXISTS insurance_policies         RENAME TO core_insurance_policies;
ALTER TABLE IF EXISTS insurance_cases            RENAME TO core_insurance_cases;
ALTER TABLE IF EXISTS documents                  RENAME TO core_documents;
ALTER TABLE IF EXISTS tasks                      RENAME TO core_tasks;
ALTER TABLE IF EXISTS activities                 RENAME TO core_activities;
ALTER TABLE IF EXISTS renewals                   RENAME TO core_renewals;
ALTER TABLE IF EXISTS commissions                RENAME TO core_commissions;
ALTER TABLE IF EXISTS rm_users                   RENAME TO config_rm_profiles;
ALTER TABLE IF EXISTS loan_products              RENAME TO config_loan_products;
ALTER TABLE IF EXISTS insurance_products         RENAME TO config_insurance_products;
ALTER TABLE IF EXISTS banks_nbfc                 RENAME TO config_banks_nbfc;
ALTER TABLE IF EXISTS teams                      RENAME TO org_teams;
ALTER TABLE IF EXISTS team_members               RENAME TO org_team_members;
ALTER TABLE IF EXISTS role_permissions           RENAME TO security_role_permissions;
ALTER TABLE IF EXISTS document_permissions       RENAME TO security_document_permissions;
ALTER TABLE IF EXISTS audit_logs                 RENAME TO security_audit_logs;
ALTER TABLE IF EXISTS customer_access_overrides  RENAME TO security_access_overrides;
ALTER TABLE IF EXISTS reassignment_requests      RENAME TO workflow_reassignments;
ALTER TABLE IF EXISTS status_configs             RENAME TO config_statuses;
ALTER TABLE IF EXISTS task_type_configs          RENAME TO config_task_types;
ALTER TABLE IF EXISTS renewal_rules              RENAME TO config_renewal_rules;
ALTER TABLE IF EXISTS dashboard_widget_permissions RENAME TO config_dashboard_widgets;

-- ── Step 2: Sequences for ref_id generation ───────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS seq_customer_ref  START 1;
CREATE SEQUENCE IF NOT EXISTS seq_loan_ref      START 1;
CREATE SEQUENCE IF NOT EXISTS seq_insurance_ref START 1;
CREATE SEQUENCE IF NOT EXISTS seq_task_ref      START 1;
CREATE SEQUENCE IF NOT EXISTS seq_document_ref  START 1;
CREATE SEQUENCE IF NOT EXISTS seq_activity_ref  START 1;
CREATE SEQUENCE IF NOT EXISTS seq_renewal_ref   START 1;

-- ── Step 3: Add ref_id + metadata to core tables ──────────────────────────────

-- core_customers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_customers' AND column_name='ref_id') THEN
    ALTER TABLE core_customers
      ADD COLUMN ref_id  text UNIQUE,
      ADD COLUMN updated_by text DEFAULT '',
      ADD COLUMN active boolean DEFAULT true;
    UPDATE core_customers SET ref_id = 'CUS-' || LPAD(nextval('seq_customer_ref')::text, 4, '0') WHERE ref_id IS NULL;
    ALTER TABLE core_customers ALTER COLUMN ref_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_core_customers_ref_id ON core_customers(ref_id);
  END IF;
END $$;

-- core_loans
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_loans' AND column_name='ref_id') THEN
    ALTER TABLE core_loans
      ADD COLUMN ref_id  text UNIQUE,
      ADD COLUMN updated_by text DEFAULT '',
      ADD COLUMN active boolean DEFAULT true;
    UPDATE core_loans SET ref_id = 'LOAN-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('seq_loan_ref')::text, 4, '0') WHERE ref_id IS NULL;
    ALTER TABLE core_loans ALTER COLUMN ref_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_core_loans_ref_id ON core_loans(ref_id);
  END IF;
END $$;

-- core_insurance_cases
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_cases' AND column_name='ref_id') THEN
    ALTER TABLE core_insurance_cases
      ADD COLUMN ref_id  text UNIQUE,
      ADD COLUMN updated_by text DEFAULT '',
      ADD COLUMN active boolean DEFAULT true;
    UPDATE core_insurance_cases SET ref_id = 'INS-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('seq_insurance_ref')::text, 4, '0') WHERE ref_id IS NULL;
    ALTER TABLE core_insurance_cases ALTER COLUMN ref_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_core_insurance_cases_ref_id ON core_insurance_cases(ref_id);
  END IF;
END $$;

-- core_insurance_policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='ref_id') THEN
    ALTER TABLE core_insurance_policies
      ADD COLUMN ref_id  text UNIQUE,
      ADD COLUMN updated_by text DEFAULT '',
      ADD COLUMN active boolean DEFAULT true;
    UPDATE core_insurance_policies SET ref_id = 'POL-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('seq_insurance_ref')::text, 4, '0') WHERE ref_id IS NULL;
    ALTER TABLE core_insurance_policies ALTER COLUMN ref_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_core_insurance_policies_ref_id ON core_insurance_policies(ref_id);
  END IF;
END $$;

-- core_tasks
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_tasks' AND column_name='ref_id') THEN
    ALTER TABLE core_tasks
      ADD COLUMN ref_id  text UNIQUE,
      ADD COLUMN updated_by text DEFAULT '',
      ADD COLUMN active boolean DEFAULT true;
    UPDATE core_tasks SET ref_id = 'TASK-' || LPAD(nextval('seq_task_ref')::text, 4, '0') WHERE ref_id IS NULL;
    ALTER TABLE core_tasks ALTER COLUMN ref_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_core_tasks_ref_id ON core_tasks(ref_id);
  END IF;
END $$;

-- core_documents
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_documents' AND column_name='ref_id') THEN
    ALTER TABLE core_documents
      ADD COLUMN ref_id  text UNIQUE,
      ADD COLUMN updated_by text DEFAULT '',
      ADD COLUMN active boolean DEFAULT true;
    UPDATE core_documents SET ref_id = 'DOC-' || LPAD(nextval('seq_document_ref')::text, 4, '0') WHERE ref_id IS NULL;
    ALTER TABLE core_documents ALTER COLUMN ref_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_core_documents_ref_id ON core_documents(ref_id);
  END IF;
END $$;

-- core_activities
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_activities' AND column_name='ref_id') THEN
    ALTER TABLE core_activities
      ADD COLUMN ref_id text UNIQUE,
      ADD COLUMN active boolean DEFAULT true;
    UPDATE core_activities SET ref_id = 'ACT-' || LPAD(nextval('seq_activity_ref')::text, 4, '0') WHERE ref_id IS NULL;
    ALTER TABLE core_activities ALTER COLUMN ref_id SET NOT NULL;
  END IF;
END $$;

-- core_renewals
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_renewals' AND column_name='ref_id') THEN
    ALTER TABLE core_renewals
      ADD COLUMN ref_id text UNIQUE,
      ADD COLUMN updated_by text DEFAULT '',
      ADD COLUMN active boolean DEFAULT true;
    UPDATE core_renewals SET ref_id = 'REN-' || LPAD(nextval('seq_renewal_ref')::text, 4, '0') WHERE ref_id IS NULL;
    ALTER TABLE core_renewals ALTER COLUMN ref_id SET NOT NULL;
  END IF;
END $$;

-- master_users (profiles) - add missing metadata
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='master_users' AND column_name='updated_by') THEN
    ALTER TABLE master_users ADD COLUMN updated_by text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='master_users' AND column_name='active') THEN
    ALTER TABLE master_users ADD COLUMN active boolean DEFAULT true;
  END IF;
END $$;

-- ── Step 4: DB functions for auto-generating ref_ids on insert ────────────────

CREATE OR REPLACE FUNCTION generate_customer_ref_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
    NEW.ref_id := 'CUS-' || LPAD(nextval('seq_customer_ref')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_loan_ref_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
    NEW.ref_id := 'LOAN-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('seq_loan_ref')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_insurance_case_ref_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
    NEW.ref_id := 'INS-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('seq_insurance_ref')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_task_ref_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
    NEW.ref_id := 'TASK-' || LPAD(nextval('seq_task_ref')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_document_ref_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
    NEW.ref_id := 'DOC-' || LPAD(nextval('seq_document_ref')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_ref_id   ON core_customers;
DROP TRIGGER IF EXISTS trg_loan_ref_id       ON core_loans;
DROP TRIGGER IF EXISTS trg_ins_case_ref_id   ON core_insurance_cases;
DROP TRIGGER IF EXISTS trg_task_ref_id       ON core_tasks;
DROP TRIGGER IF EXISTS trg_document_ref_id   ON core_documents;

CREATE TRIGGER trg_customer_ref_id
  BEFORE INSERT ON core_customers
  FOR EACH ROW EXECUTE FUNCTION generate_customer_ref_id();

CREATE TRIGGER trg_loan_ref_id
  BEFORE INSERT ON core_loans
  FOR EACH ROW EXECUTE FUNCTION generate_loan_ref_id();

CREATE TRIGGER trg_ins_case_ref_id
  BEFORE INSERT ON core_insurance_cases
  FOR EACH ROW EXECUTE FUNCTION generate_insurance_case_ref_id();

CREATE TRIGGER trg_task_ref_id
  BEFORE INSERT ON core_tasks
  FOR EACH ROW EXECUTE FUNCTION generate_task_ref_id();

CREATE TRIGGER trg_document_ref_id
  BEFORE INSERT ON core_documents
  FOR EACH ROW EXECUTE FUNCTION generate_document_ref_id();

-- ── Step 5: RLS policies for new table names ──────────────────────────────────

-- master_users
ALTER TABLE master_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all select on profiles"  ON master_users;
DROP POLICY IF EXISTS "Allow all insert on profiles"  ON master_users;
DROP POLICY IF EXISTS "Allow all update on profiles"  ON master_users;
DROP POLICY IF EXISTS "Allow all delete on profiles"  ON master_users;
CREATE POLICY "Allow all select on master_users" ON master_users FOR SELECT USING (true);
CREATE POLICY "Allow all insert on master_users" ON master_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on master_users" ON master_users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on master_users" ON master_users FOR DELETE USING (true);

-- core_customers
ALTER TABLE core_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on core_customers" ON core_customers FOR SELECT USING (true);
CREATE POLICY "Allow all insert on core_customers" ON core_customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on core_customers" ON core_customers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on core_customers" ON core_customers FOR DELETE USING (true);

-- core_customer_tags
ALTER TABLE core_customer_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on core_customer_tags" ON core_customer_tags FOR SELECT USING (true);
CREATE POLICY "Allow all insert on core_customer_tags" ON core_customer_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on core_customer_tags" ON core_customer_tags FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on core_customer_tags" ON core_customer_tags FOR DELETE USING (true);

-- core_loans
ALTER TABLE core_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on core_loans" ON core_loans FOR SELECT USING (true);
CREATE POLICY "Allow all insert on core_loans" ON core_loans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on core_loans" ON core_loans FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on core_loans" ON core_loans FOR DELETE USING (true);

-- core_insurance_policies
ALTER TABLE core_insurance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on core_insurance_policies" ON core_insurance_policies FOR SELECT USING (true);
CREATE POLICY "Allow all insert on core_insurance_policies" ON core_insurance_policies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on core_insurance_policies" ON core_insurance_policies FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on core_insurance_policies" ON core_insurance_policies FOR DELETE USING (true);

-- core_insurance_cases
ALTER TABLE core_insurance_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on core_insurance_cases" ON core_insurance_cases FOR SELECT USING (true);
CREATE POLICY "Allow all insert on core_insurance_cases" ON core_insurance_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on core_insurance_cases" ON core_insurance_cases FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on core_insurance_cases" ON core_insurance_cases FOR DELETE USING (true);

-- core_documents
ALTER TABLE core_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on core_documents" ON core_documents FOR SELECT USING (true);
CREATE POLICY "Allow all insert on core_documents" ON core_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on core_documents" ON core_documents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on core_documents" ON core_documents FOR DELETE USING (true);

-- core_tasks
ALTER TABLE core_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on core_tasks" ON core_tasks FOR SELECT USING (true);
CREATE POLICY "Allow all insert on core_tasks" ON core_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on core_tasks" ON core_tasks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on core_tasks" ON core_tasks FOR DELETE USING (true);

-- core_activities
ALTER TABLE core_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on core_activities" ON core_activities FOR SELECT USING (true);
CREATE POLICY "Allow all insert on core_activities" ON core_activities FOR INSERT WITH CHECK (true);

-- core_renewals
ALTER TABLE core_renewals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on core_renewals" ON core_renewals FOR SELECT USING (true);
CREATE POLICY "Allow all insert on core_renewals" ON core_renewals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on core_renewals" ON core_renewals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on core_renewals" ON core_renewals FOR DELETE USING (true);

-- core_commissions
ALTER TABLE core_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on core_commissions" ON core_commissions FOR SELECT USING (true);
CREATE POLICY "Allow all insert on core_commissions" ON core_commissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on core_commissions" ON core_commissions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on core_commissions" ON core_commissions FOR DELETE USING (true);

-- config tables
ALTER TABLE config_rm_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on config_rm_profiles" ON config_rm_profiles FOR SELECT USING (true);
CREATE POLICY "Allow all insert on config_rm_profiles" ON config_rm_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on config_rm_profiles" ON config_rm_profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on config_rm_profiles" ON config_rm_profiles FOR DELETE USING (true);

ALTER TABLE config_loan_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on config_loan_products" ON config_loan_products FOR SELECT USING (true);
CREATE POLICY "Allow all insert on config_loan_products" ON config_loan_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on config_loan_products" ON config_loan_products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on config_loan_products" ON config_loan_products FOR DELETE USING (true);

ALTER TABLE config_insurance_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on config_insurance_products" ON config_insurance_products FOR SELECT USING (true);
CREATE POLICY "Allow all insert on config_insurance_products" ON config_insurance_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on config_insurance_products" ON config_insurance_products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on config_insurance_products" ON config_insurance_products FOR DELETE USING (true);

ALTER TABLE config_banks_nbfc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on config_banks_nbfc" ON config_banks_nbfc FOR SELECT USING (true);
CREATE POLICY "Allow all insert on config_banks_nbfc" ON config_banks_nbfc FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on config_banks_nbfc" ON config_banks_nbfc FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on config_banks_nbfc" ON config_banks_nbfc FOR DELETE USING (true);

ALTER TABLE config_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on config_statuses" ON config_statuses FOR SELECT USING (true);
CREATE POLICY "Allow all insert on config_statuses" ON config_statuses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on config_statuses" ON config_statuses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on config_statuses" ON config_statuses FOR DELETE USING (true);

ALTER TABLE config_task_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on config_task_types" ON config_task_types FOR SELECT USING (true);
CREATE POLICY "Allow all insert on config_task_types" ON config_task_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on config_task_types" ON config_task_types FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on config_task_types" ON config_task_types FOR DELETE USING (true);

ALTER TABLE config_renewal_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on config_renewal_rules" ON config_renewal_rules FOR SELECT USING (true);
CREATE POLICY "Allow all insert on config_renewal_rules" ON config_renewal_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on config_renewal_rules" ON config_renewal_rules FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on config_renewal_rules" ON config_renewal_rules FOR DELETE USING (true);

ALTER TABLE config_dashboard_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on config_dashboard_widgets" ON config_dashboard_widgets FOR SELECT USING (true);
CREATE POLICY "Allow all insert on config_dashboard_widgets" ON config_dashboard_widgets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on config_dashboard_widgets" ON config_dashboard_widgets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on config_dashboard_widgets" ON config_dashboard_widgets FOR DELETE USING (true);

-- org tables
ALTER TABLE org_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on org_teams" ON org_teams FOR SELECT USING (true);
CREATE POLICY "Allow all insert on org_teams" ON org_teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on org_teams" ON org_teams FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on org_teams" ON org_teams FOR DELETE USING (true);

ALTER TABLE org_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on org_team_members" ON org_team_members FOR SELECT USING (true);
CREATE POLICY "Allow all insert on org_team_members" ON org_team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on org_team_members" ON org_team_members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on org_team_members" ON org_team_members FOR DELETE USING (true);

-- security tables
ALTER TABLE security_role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on security_role_permissions" ON security_role_permissions FOR SELECT USING (true);
CREATE POLICY "Allow all insert on security_role_permissions" ON security_role_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on security_role_permissions" ON security_role_permissions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on security_role_permissions" ON security_role_permissions FOR DELETE USING (true);

ALTER TABLE security_document_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on security_document_permissions" ON security_document_permissions FOR SELECT USING (true);
CREATE POLICY "Allow all insert on security_document_permissions" ON security_document_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on security_document_permissions" ON security_document_permissions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on security_document_permissions" ON security_document_permissions FOR DELETE USING (true);

ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on security_audit_logs" ON security_audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow all insert on security_audit_logs" ON security_audit_logs FOR INSERT WITH CHECK (true);

ALTER TABLE security_access_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on security_access_overrides" ON security_access_overrides FOR SELECT USING (true);
CREATE POLICY "Allow all insert on security_access_overrides" ON security_access_overrides FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on security_access_overrides" ON security_access_overrides FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on security_access_overrides" ON security_access_overrides FOR DELETE USING (true);

-- workflow tables
ALTER TABLE workflow_reassignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select on workflow_reassignments" ON workflow_reassignments FOR SELECT USING (true);
CREATE POLICY "Allow all insert on workflow_reassignments" ON workflow_reassignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on workflow_reassignments" ON workflow_reassignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on workflow_reassignments" ON workflow_reassignments FOR DELETE USING (true);
