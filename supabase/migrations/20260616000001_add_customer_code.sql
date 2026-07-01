/*
  # Add customer_code to core_customers

  Format: K0000000001, K0000000002, ...
  - Auto-generated on INSERT via trigger (never by application code)
  - Immutable: a second trigger blocks any UPDATE attempt
  - UUID id remains primary key; customer_code is a unique display identifier
*/

-- 1. Sequence (start after any existing rows — will be set dynamically below)
CREATE SEQUENCE IF NOT EXISTS seq_customer_code START 1;

-- 2. Add column (nullable first so we can backfill)
ALTER TABLE core_customers
  ADD COLUMN IF NOT EXISTS customer_code text;

-- 3. Backfill existing rows in created_at order
DO $$
DECLARE
  r RECORD;
  next_code text;
BEGIN
  FOR r IN
    SELECT id FROM core_customers
    WHERE customer_code IS NULL
    ORDER BY created_at ASC
  LOOP
    next_code := 'K' || LPAD(nextval('seq_customer_code')::text, 10, '0');
    UPDATE core_customers SET customer_code = next_code WHERE id = r.id;
  END LOOP;
END $$;

-- 4. Now enforce NOT NULL + UNIQUE
ALTER TABLE core_customers
  ALTER COLUMN customer_code SET NOT NULL;

ALTER TABLE core_customers
  ADD CONSTRAINT uq_customer_code UNIQUE (customer_code);

CREATE INDEX IF NOT EXISTS idx_core_customers_code ON core_customers(customer_code);

-- 5. Trigger: auto-generate on INSERT
CREATE OR REPLACE FUNCTION fn_generate_customer_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code := 'K' || LPAD(nextval('seq_customer_code')::text, 10, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_code_insert ON core_customers;
CREATE TRIGGER trg_customer_code_insert
  BEFORE INSERT ON core_customers
  FOR EACH ROW EXECUTE FUNCTION fn_generate_customer_code();

-- 6. Trigger: block UPDATE of customer_code (immutability)
CREATE OR REPLACE FUNCTION fn_protect_customer_code()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.customer_code IS DISTINCT FROM NEW.customer_code THEN
    RAISE EXCEPTION 'customer_code is immutable and cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customer_code_immutable ON core_customers;
CREATE TRIGGER trg_customer_code_immutable
  BEFORE UPDATE ON core_customers
  FOR EACH ROW EXECUTE FUNCTION fn_protect_customer_code();
