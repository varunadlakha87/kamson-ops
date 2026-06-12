/*
  # Insurance Case Pipeline

  ## Summary
  Creates the insurance_cases table to track the full lifecycle of every insurance
  case from lead generation through policy issuance and commission receipt.

  ## New Tables
  - `insurance_cases`
    - id: UUID primary key
    - customer_id: FK to customers (optional, for linking to existing customers)
    - customer_name: Text (denormalized for quick display)
    - policy_type: Text (Life, Health, Motor, etc.)
    - insurance_partner: Enum (HDFC ERGO, Tata AIG, Cateye, etc.)
    - rm_id: FK to profiles (relationship manager)
    - assigned_agent_id: FK to profiles (agent)
    - premium_amount: Numeric
    - expected_commission: Numeric
    - actual_commission: Numeric
    - commission_received: Boolean
    - commission_received_date: Date
    - quote_date: Date
    - policy_issue_date: Date
    - renewal_date: Date
    - case_status: Enum (pipeline stages)
    - rejection_reason: Text
    - remarks: Text
    - created_by: FK to profiles
    - created_at, updated_at: Timestamps

  ## New Enums
  - `insurance_partner_type`: HDFC ERGO, Tata AIG, Cateye, ICICI Lombard, Star Health, Other
  - `insurance_case_status`: Lead Generated, Quote Requested, Quote Received, Customer Discussion,
    Documents Pending, Under Process, Policy Issued, Rejected, Closed

  ## Security
  - RLS enabled with open policies (matching existing pattern)
*/

CREATE TYPE insurance_partner_type AS ENUM (
  'HDFC ERGO',
  'Tata AIG',
  'Cateye',
  'ICICI Lombard',
  'Star Health',
  'Other'
);

CREATE TYPE insurance_case_status AS ENUM (
  'Lead Generated',
  'Quote Requested',
  'Quote Received',
  'Customer Discussion',
  'Documents Pending',
  'Under Process',
  'Policy Issued',
  'Rejected',
  'Closed'
);

CREATE TABLE IF NOT EXISTS insurance_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT '',
  policy_type text NOT NULL DEFAULT '',
  insurance_partner insurance_partner_type NOT NULL,
  rm_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_agent_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  premium_amount numeric(12,2) DEFAULT 0,
  expected_commission numeric(12,2) DEFAULT 0,
  actual_commission numeric(12,2) DEFAULT 0,
  commission_received boolean DEFAULT false,
  commission_received_date date,
  quote_date date,
  policy_issue_date date,
  renewal_date date,
  case_status insurance_case_status NOT NULL DEFAULT 'Lead Generated',
  rejection_reason text DEFAULT '',
  remarks text DEFAULT '',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE insurance_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all select on insurance_cases" ON insurance_cases FOR SELECT USING (true);
CREATE POLICY "Allow all insert on insurance_cases" ON insurance_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on insurance_cases" ON insurance_cases FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on insurance_cases" ON insurance_cases FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS insurance_cases_customer_id_idx ON insurance_cases(customer_id);
CREATE INDEX IF NOT EXISTS insurance_cases_rm_id_idx ON insurance_cases(rm_id);
CREATE INDEX IF NOT EXISTS insurance_cases_case_status_idx ON insurance_cases(case_status);
CREATE INDEX IF NOT EXISTS insurance_cases_insurance_partner_idx ON insurance_cases(insurance_partner);
CREATE INDEX IF NOT EXISTS insurance_cases_created_at_idx ON insurance_cases(created_at);
