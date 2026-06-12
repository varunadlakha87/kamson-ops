/*
  # Fix Admin Tables RLS Policies

  The admin tables (rm_users, loan_products, insurance_products, banks_nbfc) had INSERT/UPDATE/DELETE
  policies requiring auth.uid() IS NOT NULL. The app uses a mock/anonymous session so auth.uid()
  returns null, causing all writes to be silently rejected.

  This migration drops those restrictive policies and replaces them with open policies,
  consistent with how customers, loans, and other tables are configured in this project.
*/

-- ── rm_users ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can insert rm_users" ON rm_users;
DROP POLICY IF EXISTS "Authenticated users can update rm_users" ON rm_users;
DROP POLICY IF EXISTS "Authenticated users can delete rm_users" ON rm_users;
DROP POLICY IF EXISTS "Authenticated users can read rm_users"   ON rm_users;

CREATE POLICY "Allow all select on rm_users" ON rm_users FOR SELECT USING (true);
CREATE POLICY "Allow all insert on rm_users" ON rm_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on rm_users" ON rm_users FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on rm_users" ON rm_users FOR DELETE USING (true);

-- ── loan_products ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can insert loan_products" ON loan_products;
DROP POLICY IF EXISTS "Authenticated users can update loan_products" ON loan_products;
DROP POLICY IF EXISTS "Authenticated users can delete loan_products" ON loan_products;
DROP POLICY IF EXISTS "Authenticated users can read loan_products"   ON loan_products;

CREATE POLICY "Allow all select on loan_products" ON loan_products FOR SELECT USING (true);
CREATE POLICY "Allow all insert on loan_products" ON loan_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on loan_products" ON loan_products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on loan_products" ON loan_products FOR DELETE USING (true);

-- ── insurance_products ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can insert insurance_products" ON insurance_products;
DROP POLICY IF EXISTS "Authenticated users can update insurance_products" ON insurance_products;
DROP POLICY IF EXISTS "Authenticated users can delete insurance_products" ON insurance_products;
DROP POLICY IF EXISTS "Authenticated users can read insurance_products"   ON insurance_products;

CREATE POLICY "Allow all select on insurance_products" ON insurance_products FOR SELECT USING (true);
CREATE POLICY "Allow all insert on insurance_products" ON insurance_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on insurance_products" ON insurance_products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on insurance_products" ON insurance_products FOR DELETE USING (true);

-- ── banks_nbfc ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can insert banks_nbfc" ON banks_nbfc;
DROP POLICY IF EXISTS "Authenticated users can update banks_nbfc" ON banks_nbfc;
DROP POLICY IF EXISTS "Authenticated users can delete banks_nbfc" ON banks_nbfc;
DROP POLICY IF EXISTS "Authenticated users can read banks_nbfc"   ON banks_nbfc;

CREATE POLICY "Allow all select on banks_nbfc" ON banks_nbfc FOR SELECT USING (true);
CREATE POLICY "Allow all insert on banks_nbfc" ON banks_nbfc FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on banks_nbfc" ON banks_nbfc FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete on banks_nbfc" ON banks_nbfc FOR DELETE USING (true);
