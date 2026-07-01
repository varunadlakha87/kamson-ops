-- Add owner_id + full MIS tracking fields to core_insurance_policies

DO $$
BEGIN
  -- owner_id (was missing from RBAC migration)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='owner_id') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN owner_id uuid REFERENCES master_users(id) ON DELETE SET NULL;
  END IF;

  -- Vehicle info
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='vehicle_number') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN vehicle_number text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='vehicle_model') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN vehicle_model text DEFAULT '';
  END IF;

  -- Proposal / lead tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='proposal_number') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN proposal_number text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='lead_date') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN lead_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='is_renewal') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN is_renewal boolean DEFAULT false;
  END IF;

  -- Insurance category (FW/TW/Health/SME) — separate from policy_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='insurance_category') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN insurance_category text DEFAULT '';
  END IF;

  -- Distribution channel (T-Direct, Bajaj-PB Motor, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='channel') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN channel text DEFAULT '';
  END IF;

  -- Premium breakdown
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='od_amount') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN od_amount numeric(15,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='tp_amount') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN tp_amount numeric(15,2) DEFAULT 0;
  END IF;

  -- Payout / commission tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='payout_percentage') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN payout_percentage numeric(8,4) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='payout_amount') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN payout_amount numeric(15,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='cashback_amount') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN cashback_amount numeric(15,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='profitable_amount') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN profitable_amount numeric(15,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='payout_status') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN payout_status text DEFAULT 'pending';
  END IF;

  -- Payment details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='payment_mode') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN payment_mode text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='payment_reference') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN payment_reference text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='core_insurance_policies' AND column_name='chq_reported_date') THEN
    ALTER TABLE core_insurance_policies ADD COLUMN chq_reported_date date;
  END IF;
END $$;

-- Set default for ref_id so new inserts auto-generate it
DO $$
BEGIN
  -- Check if ref_id has a default already
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'core_insurance_policies'
    AND column_name = 'ref_id'
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE core_insurance_policies
      ALTER COLUMN ref_id SET DEFAULT 'POL-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('seq_insurance_ref')::text, 4, '0');
  END IF;
END $$;
