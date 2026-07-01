-- Architecture fix: DB columns must remain nullable for all stage-specific fields.
-- Only application/UI logic enforces stage-gate required fields.

-- Fix core_insurance_quotes: insurance_company was NOT NULL — make nullable
ALTER TABLE core_insurance_quotes ALTER COLUMN insurance_company DROP NOT NULL;

-- Ensure all stage-specific columns on core_insurance_cases are nullable (safety pass)
ALTER TABLE core_insurance_cases ALTER COLUMN insurance_company   DROP NOT NULL;
ALTER TABLE core_insurance_cases ALTER COLUMN policy_number       DROP NOT NULL;
ALTER TABLE core_insurance_cases ALTER COLUMN policy_start_date   DROP NOT NULL;
ALTER TABLE core_insurance_cases ALTER COLUMN policy_end_date     DROP NOT NULL;
ALTER TABLE core_insurance_cases ALTER COLUMN payout_status       DROP NOT NULL;
ALTER TABLE core_insurance_cases ALTER COLUMN actual_payout_amount DROP NOT NULL;
ALTER TABLE core_insurance_cases ALTER COLUMN payout_received_date DROP NOT NULL;

-- core_insurance_quotes: all quote fields nullable
ALTER TABLE core_insurance_quotes ALTER COLUMN proposal_number    DROP NOT NULL;
ALTER TABLE core_insurance_quotes ALTER COLUMN premium_od         DROP NOT NULL;
ALTER TABLE core_insurance_quotes ALTER COLUMN premium_tp         DROP NOT NULL;
ALTER TABLE core_insurance_quotes ALTER COLUMN total_premium      DROP NOT NULL;
ALTER TABLE core_insurance_quotes ALTER COLUMN payout_percent     DROP NOT NULL;
ALTER TABLE core_insurance_quotes ALTER COLUMN expected_payout_amount DROP NOT NULL;

-- Add FK constraint from core_insurance_cases.customer_id → core_customers.id
-- so PostgREST can resolve the relationship for embedded selects.
ALTER TABLE core_insurance_cases
  DROP CONSTRAINT IF EXISTS core_insurance_cases_customer_id_fkey;

ALTER TABLE core_insurance_cases
  ADD CONSTRAINT core_insurance_cases_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES core_customers(id) ON DELETE SET NULL;
