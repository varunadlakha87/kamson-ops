/*
  # Admin Reference Tables

  ## New Tables

  ### rm_users
  - Stores Relationship Managers with contact info and status
  - Linked to auth if they have a login, or standalone record if not

  ### loan_products
  - Master list of loan product types offered (e.g. Home Loan, LAP)
  - Each has a name, description, and active flag

  ### insurance_products
  - Master list of insurance products (Term Life, Health, Motor, etc.)
  - Includes partner company field

  ### banks_nbfc
  - Master list of banks and NBFCs
  - Includes type (bank / NBFC), logo initial for display

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read all
  - Only admins should write — enforced at app level (no admin role check in RLS for now to keep it simple, consistent with existing patterns)
*/

-- RM Users table (standalone, not tied to auth.users to allow pre-adding)
CREATE TABLE IF NOT EXISTS rm_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL DEFAULT '',
  mobile text NOT NULL DEFAULT '',
  email text DEFAULT '',
  designation text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rm_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rm_users"
  ON rm_users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert rm_users"
  ON rm_users FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update rm_users"
  ON rm_users FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete rm_users"
  ON rm_users FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Loan Products table
CREATE TABLE IF NOT EXISTS loan_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE loan_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read loan_products"
  ON loan_products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert loan_products"
  ON loan_products FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update loan_products"
  ON loan_products FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete loan_products"
  ON loan_products FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Insurance Products table
CREATE TABLE IF NOT EXISTS insurance_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  partner text DEFAULT '',
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE insurance_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read insurance_products"
  ON insurance_products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert insurance_products"
  ON insurance_products FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update insurance_products"
  ON insurance_products FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete insurance_products"
  ON insurance_products FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Banks & NBFCs table
CREATE TABLE IF NOT EXISTS banks_nbfc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'bank',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE banks_nbfc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read banks_nbfc"
  ON banks_nbfc FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert banks_nbfc"
  ON banks_nbfc FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update banks_nbfc"
  ON banks_nbfc FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete banks_nbfc"
  ON banks_nbfc FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Seed default loan products
INSERT INTO loan_products (name, description) VALUES
  ('Home Loan', 'Residential property purchase or construction'),
  ('Loan Against Property', 'Loan secured against existing property'),
  ('Personal Loan', 'Unsecured multi-purpose loan'),
  ('Business Loan', 'Working capital or business expansion'),
  ('Car Loan', 'New or used vehicle financing'),
  ('Education Loan', 'Higher education financing'),
  ('Gold Loan', 'Loan secured against gold jewellery'),
  ('Mortgage Loan', 'Long-term secured loan on property')
ON CONFLICT DO NOTHING;

-- Seed default insurance products
INSERT INTO insurance_products (name, partner, description) VALUES
  ('Term Life',    'HDFC Life',       ''),
  ('Term Life',    'ICICI Prudential',''),
  ('Term Life',    'Max Life',        ''),
  ('Term Life',    'Tata AIA',        ''),
  ('Health',       'Star Health',     ''),
  ('Health',       'HDFC ERGO',       ''),
  ('Health',       'ICICI Lombard',   ''),
  ('Health',       'Niva Bupa',       ''),
  ('Motor',        'Tata AIG',        ''),
  ('Motor',        'HDFC ERGO',       ''),
  ('ULIP',         'HDFC Life',       ''),
  ('Endowment',    'LIC',             ''),
  ('Home',         'Bajaj Allianz',   ''),
  ('Travel',       'ICICI Lombard',   '')
ON CONFLICT DO NOTHING;

-- Seed default banks/NBFCs
INSERT INTO banks_nbfc (name, type) VALUES
  ('SBI',                    'bank'),
  ('HDFC Bank',              'bank'),
  ('ICICI Bank',             'bank'),
  ('Axis Bank',              'bank'),
  ('Kotak Mahindra Bank',    'bank'),
  ('Punjab National Bank',   'bank'),
  ('Bank of Baroda',         'bank'),
  ('IDFC First Bank',        'bank'),
  ('Yes Bank',               'bank'),
  ('IndusInd Bank',          'bank'),
  ('Federal Bank',           'bank'),
  ('Bajaj Finserv',          'nbfc'),
  ('Muthoot Finance',        'nbfc'),
  ('IIFL Finance',           'nbfc'),
  ('Tata Capital',           'nbfc'),
  ('Aditya Birla Finance',   'nbfc'),
  ('Piramal Finance',        'nbfc'),
  ('Cholamandalam Finance',  'nbfc'),
  ('L&T Finance',            'nbfc')
ON CONFLICT DO NOTHING;
