-- Add mobile column to core_insurance_cases (used for quick Call/WhatsApp from case card)
ALTER TABLE core_insurance_cases
  ADD COLUMN IF NOT EXISTS mobile text;

-- Backfill from linked customer where available
UPDATE core_insurance_cases ic
SET mobile = c.mobile
FROM core_customers c
WHERE ic.customer_id = c.id AND ic.mobile IS NULL;

SELECT 'mobile column added to core_insurance_cases' AS status;
