/*
  # Make core_loans.customer_id nullable

  The initial schema set customer_id as NOT NULL on the loans table,
  but the LoansPage UI allows creating loans without linking a customer
  (e.g. a pipeline entry before the customer profile is created).

  This migration drops the NOT NULL constraint to match the UI intent,
  matching the same pattern used by insurance_cases.customer_id (nullable).
*/

ALTER TABLE core_loans
  ALTER COLUMN customer_id DROP NOT NULL;
