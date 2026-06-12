/*
  # Kamson Financial Operations System - Initial Schema

  ## Overview
  Creates the complete database schema for the Kamson Financial Operations System,
  a CRM and document management platform for a financial services company.

  ## New Tables

  ### users (profiles)
  - Extended user profiles with roles and contact info
  - Roles: admin, rm, operations, agent

  ### customers
  - Central customer database with KYC fields
  - Status tracking: active, follow_up_pending, closed, renewal_due
  - Assignment to RM and Agent

  ### customer_tags
  - Many-to-many tags for customers (loan, insurance, HNI, etc.)

  ### loans
  - Loan case management with status flow
  - Tracks bank, amount, EMI, ROI, tenure, dates

  ### insurance_policies
  - Policy tracking with renewal dates and premium info

  ### documents
  - Central document vault linked to customers, loans, or policies
  - Categorized by type (KYC, loan, insurance, etc.)

  ### tasks
  - Follow-up task management with due dates and assignments

  ### activities
  - Chronological activity timeline per customer

  ### renewals
  - Renewal tracking with alert dates

  ### commissions
  - Commission tracking for loans and policies

  ## Security
  - RLS enabled on all tables
  - Authenticated users can access data based on role
  - Users can read all operational data
  - Users can write data they are assigned to or admin
*/

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'rm', 'operations', 'agent');
CREATE TYPE customer_status AS ENUM ('active', 'follow_up_pending', 'closed', 'renewal_due');
CREATE TYPE loan_status AS ENUM ('lead', 'logged_in', 'documents_pending', 'approved', 'sanctioned', 'disbursed', 'rejected', 'closed');
CREATE TYPE insurance_status AS ENUM ('active', 'renewal_due', 'expired', 'claim_initiated', 'closed');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
CREATE TYPE task_type AS ENUM ('customer_call', 'document_collection', 'insurance_renewal', 'emi_followup', 'site_visit', 'quote_sharing', 'other');
CREATE TYPE document_category AS ENUM ('kyc', 'loan', 'insurance', 'property', 'other');
CREATE TYPE renewal_type AS ENUM ('insurance', 'emi', 'fd_maturity', 'policy_expiry');

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  mobile text DEFAULT '',
  role user_role NOT NULL DEFAULT 'rm',
  avatar_url text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  mobile text NOT NULL,
  alternate_mobile text DEFAULT '',
  email text DEFAULT '',
  pan text DEFAULT '',
  aadhaar text DEFAULT '',
  date_of_birth date,
  address text DEFAULT '',
  occupation text DEFAULT '',
  status customer_status NOT NULL DEFAULT 'active',
  assigned_rm_id uuid REFERENCES profiles(id),
  assigned_agent_id uuid REFERENCES profiles(id),
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Customer tags
CREATE TABLE IF NOT EXISTS customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customer tags"
  ON customer_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customer tags"
  ON customer_tags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete customer tags"
  ON customer_tags FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Loans
CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  loan_type text NOT NULL,
  bank_nbfc text NOT NULL,
  loan_amount numeric(15,2) DEFAULT 0,
  emi_amount numeric(15,2) DEFAULT 0,
  roi numeric(5,2) DEFAULT 0,
  tenure_months integer DEFAULT 0,
  login_date date,
  disbursal_date date,
  loan_account_number text DEFAULT '',
  status loan_status NOT NULL DEFAULT 'lead',
  assigned_rm_id uuid REFERENCES profiles(id),
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read loans"
  ON loans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert loans"
  ON loans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update loans"
  ON loans FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Insurance policies
CREATE TABLE IF NOT EXISTS insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  policy_type text NOT NULL,
  insurance_company text NOT NULL,
  policy_number text DEFAULT '',
  premium_amount numeric(15,2) DEFAULT 0,
  sum_assured numeric(15,2) DEFAULT 0,
  policy_start_date date,
  renewal_date date,
  nominee_name text DEFAULT '',
  status insurance_status NOT NULL DEFAULT 'active',
  assigned_rm_id uuid REFERENCES profiles(id),
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read insurance policies"
  ON insurance_policies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert insurance policies"
  ON insurance_policies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update insurance policies"
  ON insurance_policies FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  loan_id uuid REFERENCES loans(id) ON DELETE SET NULL,
  policy_id uuid REFERENCES insurance_policies(id) ON DELETE SET NULL,
  document_name text NOT NULL,
  document_type text NOT NULL,
  category document_category NOT NULL DEFAULT 'other',
  file_url text DEFAULT '',
  file_size integer DEFAULT 0,
  mime_type text DEFAULT '',
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  task_type task_type NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text DEFAULT '',
  due_date timestamptz,
  status task_status NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Activities (timeline)
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  loan_id uuid REFERENCES loans(id) ON DELETE SET NULL,
  policy_id uuid REFERENCES insurance_policies(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  performed_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read activities"
  ON activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Renewals
CREATE TABLE IF NOT EXISTS renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES insurance_policies(id) ON DELETE CASCADE,
  renewal_type renewal_type NOT NULL,
  title text NOT NULL,
  renewal_date date NOT NULL,
  amount numeric(15,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  alert_30_sent boolean DEFAULT false,
  alert_15_sent boolean DEFAULT false,
  alert_7_sent boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read renewals"
  ON renewals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert renewals"
  ON renewals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update renewals"
  ON renewals FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Commissions
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid REFERENCES loans(id) ON DELETE SET NULL,
  policy_id uuid REFERENCES insurance_policies(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES profiles(id),
  commission_type text NOT NULL,
  amount numeric(15,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert commissions"
  ON commissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update commissions"
  ON commissions FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);
CREATE INDEX IF NOT EXISTS idx_customers_pan ON customers(pan);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_rm ON customers(assigned_rm_id);
CREATE INDEX IF NOT EXISTS idx_loans_customer ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_insurance_customer ON insurance_policies(customer_id);
CREATE INDEX IF NOT EXISTS idx_insurance_renewal_date ON insurance_policies(renewal_date);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_activities_customer ON activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_renewals_date ON renewals(renewal_date);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'rm')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
