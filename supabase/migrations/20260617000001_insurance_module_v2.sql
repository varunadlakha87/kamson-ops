-- ═══════════════════════════════════════════════════════════════════════════
-- Insurance Module v2 — new columns, quotes table, insurance_code auto-gen
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wroofywjkfqglbsnnovo/sql/new
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add new columns to core_insurance_cases
ALTER TABLE core_insurance_cases
  ADD COLUMN IF NOT EXISTS insurance_code       text,
  ADD COLUMN IF NOT EXISTS insurance_type       text,
  ADD COLUMN IF NOT EXISTS current_stage        text DEFAULT 'Lead',
  ADD COLUMN IF NOT EXISTS contact_person       text,
  ADD COLUMN IF NOT EXISTS relation             text,
  ADD COLUMN IF NOT EXISTS policy_mobile        text,
  ADD COLUMN IF NOT EXISTS policy_email         text,
  ADD COLUMN IF NOT EXISTS insurance_done_by    uuid REFERENCES master_users(id),
  ADD COLUMN IF NOT EXISTS updated_by           uuid REFERENCES master_users(id),
  ADD COLUMN IF NOT EXISTS payout_status        text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS actual_payout_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS payout_received_date date,
  ADD COLUMN IF NOT EXISTS profit_amount        numeric(12,2),
  ADD COLUMN IF NOT EXISTS cheque_reported_date date,
  ADD COLUMN IF NOT EXISTS selected_quote_id    uuid; -- FK constraint added below after quotes table

-- 2. Add insurance_case_id to core_activities
ALTER TABLE core_activities
  ADD COLUMN IF NOT EXISTS insurance_case_id uuid REFERENCES core_insurance_cases(id);

-- 3. Insurance code auto-gen sequence and trigger
CREATE SEQUENCE IF NOT EXISTS seq_insurance_code START 1;

CREATE OR REPLACE FUNCTION fn_generate_insurance_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.insurance_code IS NULL OR NEW.insurance_code = '' THEN
    NEW.insurance_code := 'INS' || LPAD(NEXTVAL('seq_insurance_code')::TEXT, 8, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_insurance_code ON core_insurance_cases;
CREATE TRIGGER trg_generate_insurance_code
  BEFORE INSERT ON core_insurance_cases
  FOR EACH ROW EXECUTE FUNCTION fn_generate_insurance_code();

-- 4. Backfill insurance_code for existing records
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM core_insurance_cases
    WHERE insurance_code IS NULL OR insurance_code = ''
    ORDER BY created_at
  LOOP
    UPDATE core_insurance_cases
    SET insurance_code = 'INS' || LPAD(NEXTVAL('seq_insurance_code')::TEXT, 8, '0')
    WHERE id = r.id;
  END LOOP;
END $$;

-- 5. Backfill insurance_type from policy_type
UPDATE core_insurance_cases
SET insurance_type = policy_type
WHERE insurance_type IS NULL AND policy_type IS NOT NULL;

-- 6. Backfill current_stage from case_status
UPDATE core_insurance_cases
SET current_stage = CASE
  WHEN case_status = 'Policy Issued'                                                              THEN 'Policy'
  WHEN case_status IN ('Quote Requested','Quote Received','Customer Discussion','Documents Pending','Under Process') THEN 'Quote'
  WHEN case_status IN ('Closed','Rejected')                                                       THEN 'Closed'
  ELSE 'Lead'
END
WHERE current_stage IS NULL OR current_stage = '';

-- 7. Enforce insurance_code NOT NULL and unique
UPDATE core_insurance_cases
SET insurance_code = 'INS' || LPAD(NEXTVAL('seq_insurance_code')::TEXT, 8, '0')
WHERE insurance_code IS NULL;

ALTER TABLE core_insurance_cases ALTER COLUMN insurance_code SET NOT NULL;
ALTER TABLE core_insurance_cases DROP CONSTRAINT IF EXISTS uq_insurance_code;
ALTER TABLE core_insurance_cases ADD CONSTRAINT uq_insurance_code UNIQUE (insurance_code);

-- 8. Create core_insurance_quotes
CREATE TABLE IF NOT EXISTS core_insurance_quotes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                uuid NOT NULL REFERENCES core_insurance_cases(id) ON DELETE CASCADE,
  insurance_company      text NOT NULL,
  proposal_number        text,
  premium_od             numeric(12,2) DEFAULT 0,
  premium_tp             numeric(12,2) DEFAULT 0,
  total_premium          numeric(12,2) DEFAULT 0,
  payout_percent         numeric(6,2)  DEFAULT 0,
  expected_payout_amount numeric(12,2) DEFAULT 0,
  is_selected            boolean       DEFAULT false,
  quote_date             date          DEFAULT CURRENT_DATE,
  remarks                text,
  created_by             uuid REFERENCES master_users(id),
  created_at             timestamptz   DEFAULT now(),
  updated_at             timestamptz   DEFAULT now()
);

ALTER TABLE core_insurance_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quotes_select" ON core_insurance_quotes;
DROP POLICY IF EXISTS "quotes_insert" ON core_insurance_quotes;
DROP POLICY IF EXISTS "quotes_update" ON core_insurance_quotes;
DROP POLICY IF EXISTS "quotes_delete" ON core_insurance_quotes;
CREATE POLICY "quotes_select" ON core_insurance_quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "quotes_insert" ON core_insurance_quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "quotes_update" ON core_insurance_quotes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "quotes_delete" ON core_insurance_quotes FOR DELETE TO authenticated USING (true);

-- 9. Add FK from cases.selected_quote_id → quotes
ALTER TABLE core_insurance_cases
  DROP CONSTRAINT IF EXISTS fk_selected_quote;
ALTER TABLE core_insurance_cases
  ADD CONSTRAINT fk_selected_quote
  FOREIGN KEY (selected_quote_id) REFERENCES core_insurance_quotes(id);

SELECT 'Insurance Module v2 migration complete ✓' AS status;
