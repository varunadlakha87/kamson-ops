-- Add OD, TP, and cashback fields to core_insurance_cases
ALTER TABLE core_insurance_cases
  ADD COLUMN IF NOT EXISTS od_amount      numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tp_amount      numeric(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_amount numeric(15,2) DEFAULT 0;

-- Backfill: derive OD/TP from premium_amount where possible
-- premium_amount = (od + tp) * 1.18, so od+tp = premium/1.18
-- Without split data we leave od=0, tp=0 — user can fill manually
-- But set premium_amount as a computed column alias for display if needed
COMMENT ON COLUMN core_insurance_cases.od_amount IS 'Own Damage premium component';
COMMENT ON COLUMN core_insurance_cases.tp_amount IS 'Third Party premium component';
COMMENT ON COLUMN core_insurance_cases.cashback_amount IS 'Cashback amount given to customer';
