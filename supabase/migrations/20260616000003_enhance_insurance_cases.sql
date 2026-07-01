/*
  # Enhance core_insurance_cases for full insurance workflow

  Adds columns needed for the redesigned insurance form:
  - business_type: Fresh / Renewal
  - source: how the lead came in (Direct, Reference, etc.)
  - vehicle_make, vehicle_reg_year: motor insurance details
  - policy_number, policy_start_date, policy_end_date, proposal_number: lifecycle
  - payment_mode: Online / Cheque / Cash
  - active: soft-delete flag (matches pattern in other tables)
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_cases' AND column_name='business_type') THEN
    ALTER TABLE core_insurance_cases ADD COLUMN business_type text DEFAULT 'fresh';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_cases' AND column_name='source') THEN
    ALTER TABLE core_insurance_cases ADD COLUMN source text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_cases' AND column_name='vehicle_make') THEN
    ALTER TABLE core_insurance_cases ADD COLUMN vehicle_make text DEFAULT '';
  END IF;

  -- vehicle_model (vehicle_number was added earlier — this is the model name)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_cases' AND column_name='vehicle_model') THEN
    ALTER TABLE core_insurance_cases ADD COLUMN vehicle_model text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_cases' AND column_name='vehicle_reg_year') THEN
    ALTER TABLE core_insurance_cases ADD COLUMN vehicle_reg_year integer;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_cases' AND column_name='payment_mode') THEN
    ALTER TABLE core_insurance_cases ADD COLUMN payment_mode text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_cases' AND column_name='proposal_number') THEN
    ALTER TABLE core_insurance_cases ADD COLUMN proposal_number text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_cases' AND column_name='policy_number') THEN
    ALTER TABLE core_insurance_cases ADD COLUMN policy_number text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_cases' AND column_name='policy_start_date') THEN
    ALTER TABLE core_insurance_cases ADD COLUMN policy_start_date date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_cases' AND column_name='policy_end_date') THEN
    ALTER TABLE core_insurance_cases ADD COLUMN policy_end_date date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_cases' AND column_name='active') THEN
    ALTER TABLE core_insurance_cases ADD COLUMN active boolean DEFAULT true;
    UPDATE core_insurance_cases SET active = true WHERE active IS NULL;
  END IF;
END $$;
