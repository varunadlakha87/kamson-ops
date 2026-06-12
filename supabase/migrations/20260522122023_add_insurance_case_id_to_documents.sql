/*
  # Add insurance_case_id to documents table

  Documents can now be tagged to an insurance case (in addition to loans and
  insurance policies already supported). This enables the lead-level document
  tagging flow.

  ## Changes
  - `documents.insurance_case_id` — optional FK to insurance_cases
  - Open RLS policies already exist for documents; no changes needed there
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'insurance_case_id'
  ) THEN
    ALTER TABLE documents
      ADD COLUMN insurance_case_id uuid REFERENCES insurance_cases(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS documents_insurance_case_id_idx ON documents(insurance_case_id);
CREATE INDEX IF NOT EXISTS documents_loan_id_idx ON documents(loan_id);
CREATE INDEX IF NOT EXISTS documents_customer_id_idx ON documents(customer_id);
