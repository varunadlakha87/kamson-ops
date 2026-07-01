-- Add policy_tenure and lead_source to core_insurance_cases
ALTER TABLE core_insurance_cases
  ADD COLUMN IF NOT EXISTS policy_tenure text,        -- e.g. "1 Year", "3 Years"
  ADD COLUMN IF NOT EXISTS lead_source   text;        -- "Through" / referral channel

-- Backfill lead_source from existing source column
UPDATE core_insurance_cases SET lead_source = source WHERE lead_source IS NULL AND source IS NOT NULL;

SELECT 'policy_tenure and lead_source added' AS status;
