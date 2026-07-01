-- Add insurance_company to core_insurance_cases
-- Original table uses insurance_partner; code uses insurance_company
ALTER TABLE core_insurance_cases
  ADD COLUMN IF NOT EXISTS insurance_company text;

UPDATE core_insurance_cases
SET insurance_company = insurance_partner
WHERE insurance_company IS NULL AND insurance_partner IS NOT NULL;

-- cashback_amount used in payout profit calculations
ALTER TABLE core_insurance_cases
  ADD COLUMN IF NOT EXISTS cashback_amount numeric(12,2);

SELECT 'Migration 5 complete' AS status;
