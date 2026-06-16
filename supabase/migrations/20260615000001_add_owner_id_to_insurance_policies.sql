-- Add owner_id to core_insurance_policies (was missing from RBAC migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'core_insurance_policies' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE core_insurance_policies
      ADD COLUMN owner_id uuid REFERENCES master_users(id) ON DELETE SET NULL;
  END IF;
END $$;
