/*
  # Add Case Numbers + Seed Test Data

  ## Changes
  1. Add case_number columns to loans and insurance_cases with auto-sequences
  2. Insert 3 RM profiles
  3. Insert 8 realistic customers with KYC fields
  4. Insert 10 loan cases across various statuses and banks
  5. Insert 8 insurance policies (active/renewal_due)
  6. Insert 10 insurance pipeline cases across all partners and statuses
  7. Insert documents tagged to customers, loans, and insurance cases
  8. Insert tasks with various due dates
  9. Insert renewals (some urgent, some upcoming)
  10. Insert activities timeline entries

  ## Case Number Format
  - Loans: LN-2526-XXXX (FY 25-26)
  - Insurance Cases: INS-2526-XXXX
*/

-- =========================================================
-- STEP 1: Add case_number columns
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loans' AND column_name = 'case_number'
  ) THEN
    ALTER TABLE loans ADD COLUMN case_number text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'insurance_cases' AND column_name = 'case_number'
  ) THEN
    ALTER TABLE insurance_cases ADD COLUMN case_number text;
  END IF;
END $$;

-- =========================================================
-- STEP 2: Create sequences for case numbers
-- =========================================================

CREATE SEQUENCE IF NOT EXISTS loan_case_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS insurance_case_seq START 1001;

-- =========================================================
-- STEP 3: Insert 3 additional RM profiles (no auth.users — display only)
-- =========================================================

-- We insert into profiles using existing admin id as base; RMs need auth users.
-- Instead, we seed data using the existing admin user as RM for all cases,
-- and set full_name references as text in remarks where needed.
-- NOTE: profiles requires FK to auth.users, so we can only use existing profile IDs.

-- Get the admin user id for reference
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM profiles LIMIT 1;

  -- =========================================================
  -- STEP 4: Insert 8 Customers
  -- =========================================================

  INSERT INTO customers (id, full_name, mobile, alternate_mobile, email, pan, aadhaar, date_of_birth, address, occupation, status, assigned_rm_id, notes, created_by) VALUES
    ('11111111-0000-0000-0000-000000000001', 'Rajesh Kumar Sharma',   '9810001001', '9810001002', 'rajesh.sharma@gmail.com',   'ABCPS1234A', '234512345123', '1978-04-15', '42, Sector 15, Gurgaon, Haryana 122001',      'Business Owner',    'active',          admin_id, 'HNI client. Multiple loans and policies.',  admin_id),
    ('11111111-0000-0000-0000-000000000002', 'Priya Mehta',           '9820002001', '9820002002', 'priya.mehta@outlook.com',   'BCDPM5678B', '345623456234', '1985-08-22', '14, Andheri West, Mumbai, Maharashtra 400053','Salaried — IT',     'active',          admin_id, 'First-time home loan applicant.',           admin_id),
    ('11111111-0000-0000-0000-000000000003', 'Suresh Agarwal',        '9830003001', NULL,         'suresh.agarwal@yahoo.com',  'CDEPA9012C', '456734567345', '1972-11-03', '7, Civil Lines, Jaipur, Rajasthan 302006',   'Self Employed',     'renewal_due',     admin_id, 'Health policy renewal due next month.',     admin_id),
    ('11111111-0000-0000-0000-000000000004', 'Anita Verma',           '9840004001', '9840004002', 'anita.verma@gmail.com',     'DEFAV3456D', '567845678456', '1990-02-14', '23, Koramangala, Bangalore, Karnataka 560034','Salaried — Bank',   'active',          admin_id, 'Car loan inquiry. Stable income.',          admin_id),
    ('11111111-0000-0000-0000-000000000005', 'Mohammed Irfan',        '9850005001', NULL,         'irfan.md@gmail.com',        'EFGMI7890E', '678956789567', '1982-07-19', '88, Banjara Hills, Hyderabad, Telangana 500034','Business Owner', 'follow_up_pending',admin_id, 'LAP inquiry. Follow up on valuation report.',admin_id),
    ('11111111-0000-0000-0000-000000000006', 'Kavitha Nair',          '9860006001', '9860006002', 'kavitha.nair@gmail.com',    'FGHKN2345F', '789067890678', '1988-12-01', '5, Velachery, Chennai, Tamil Nadu 600042',   'Salaried — MNC',    'active',          admin_id, 'Term life + health combo requirement.',     admin_id),
    ('11111111-0000-0000-0000-000000000007', 'Deepak Joshi',          '9870007001', NULL,         'deepak.joshi@rediffmail.com','GHIDJ6789G', '890178901789', '1975-05-30', '12, Paldi, Ahmedabad, Gujarat 380007',       'CA — Self Employed','active',          admin_id, 'Business loan for office expansion.',       admin_id),
    ('11111111-0000-0000-0000-000000000008', 'Sunita Rao',            '9880008001', '9880008002', 'sunita.rao@gmail.com',      'HIJSR4567H', '901290129012', '1965-09-25', '3, Vasant Vihar, Delhi 110057',              'Retired',           'renewal_due',     admin_id, 'Endowment policy maturity approaching.',    admin_id)
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================
  -- STEP 5: Insert Loan Cases with case_number
  -- =========================================================

  INSERT INTO loans (id, customer_id, case_number, loan_type, bank_nbfc, loan_amount, emi_amount, roi, tenure_months, login_date, disbursal_date, loan_account_number, status, assigned_rm_id, notes, created_by, created_at) VALUES
    ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'LN-2526-1001', 'Home Loan',            'SBI',              4500000,  38500, 8.50,  240, '2026-01-10', '2026-02-15', 'SBI/HL/001/2526',  'disbursed',         admin_id, 'Property in Gurgaon Sector 15. Disbursed smoothly.', admin_id, '2026-01-10'),
    ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'LN-2526-1002', 'Loan Against Property', 'HDFC Bank',        2000000,  22000, 10.50, 120, '2026-03-01', NULL,         '',                 'approved',          admin_id, 'LAP on commercial property. Sanction received.', admin_id, '2026-03-01'),
    ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'LN-2526-1003', 'Home Loan',            'HDFC Bank',        6500000,  58200, 8.75,  300, '2026-02-20', NULL,         '',                 'documents_pending', admin_id, 'Salary slips pending. Remind on Monday.',   admin_id, '2026-02-20'),
    ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'LN-2526-1004', 'Business Loan',        'Bajaj Finserv',    1500000,  32000, 18.00, 60,  '2026-01-05', '2026-01-28', 'BFL/BL/045/2526',  'disbursed',         admin_id, 'Working capital loan. Disbursed in Jan.',   admin_id, '2026-01-05'),
    ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'LN-2526-1005', 'Car Loan',             'ICICI Bank',       850000,   17500, 9.25,  60,  '2026-04-01', NULL,         '',                 'logged_in',         admin_id, 'New Maruti Brezza. RC and insurance pending.', admin_id, '2026-04-01'),
    ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000005', 'LN-2526-1006', 'Loan Against Property', 'Axis Bank',        3500000,  38800, 11.00, 120, '2026-03-15', NULL,         '',                 'lead',              admin_id, 'Valuation report awaited from Hyderabad office.', admin_id, '2026-03-15'),
    ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000006', 'LN-2526-1007', 'Personal Loan',        'Kotak Mahindra',   300000,   7800,  14.50, 48,  '2026-04-10', NULL,         '',                 'sanctioned',        admin_id, 'Quick personal loan for home renovation.',  admin_id, '2026-04-10'),
    ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000007', 'LN-2526-1008', 'Business Loan',        'SBI',              2500000,  48000, 10.75, 60,  '2026-02-10', NULL,         '',                 'approved',          admin_id, 'Office expansion loan. CA financials submitted.', admin_id, '2026-02-10'),
    ('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', 'LN-2526-1009', 'Personal Loan',        'IDFC First Bank',  500000,   12000, 13.00, 48,  '2025-11-01', '2025-11-20', 'IDFC/PL/088/2526', 'disbursed',         admin_id, 'Emergency loan. Disbursed Nov 2025.',        admin_id, '2025-11-01'),
    ('22222222-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000003', 'LN-2526-1010', 'Gold Loan',            'Muthoot Finance',  250000,   6200,  22.00, 12,  '2026-04-20', NULL,         '',                 'rejected',          admin_id, 'Rejected — gold purity below required 22 carat.', admin_id, '2026-04-20')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================
  -- STEP 6: Insert Insurance Policies
  -- =========================================================

  INSERT INTO insurance_policies (id, customer_id, policy_type, insurance_company, policy_number, premium_amount, sum_assured, policy_start_date, renewal_date, nominee_name, status, assigned_rm_id, notes, created_by) VALUES
    ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Term Life',  'HDFC Life',      'HDFC/TL/2023/001234', 18500,    10000000, '2023-04-01', '2026-04-01', 'Sunita Sharma',  'renewal_due', admin_id, '1 crore term. Renewal due Apr 2026.',       admin_id),
    ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Health',     'Star Health',    'STAR/H/2024/005678',  12000,    500000,   '2024-06-01', '2026-06-15', 'Ramesh Mehta',   'active',      admin_id, 'Family floater. 5L cover.',                 admin_id),
    ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Health',     'HDFC ERGO',      'HDFC/H/2022/009012',  9500,     300000,   '2022-05-15', '2026-05-20', 'Kamla Agarwal',  'renewal_due', admin_id, 'Individual health. Renewal due May 2026.',  admin_id),
    ('33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'Motor',      'Tata AIG',       'TAIG/MV/2025/003456', 8200,     750000,   '2025-07-10', '2026-07-10', '',               'active',      admin_id, 'Honda City comprehensive.',                 admin_id),
    ('33333333-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000006', 'Term Life',  'ICICI Prudential','ICICIPRU/TL/023/456', 22000,   15000000, '2023-01-01', '2026-01-01', 'Suresh Nair',    'renewal_due', admin_id, '1.5 Cr term. Renewal overdue!',             admin_id),
    ('33333333-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000006', 'Health',     'Star Health',    'STAR/H/2024/011234',  15000,    1000000,  '2024-03-01', '2026-09-01', 'Suresh Nair',    'active',      admin_id, 'Super top-up 10L. Active.',                 admin_id),
    ('33333333-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000007', 'Endowment',  'LIC',            'LIC/EN/1997/456789',  24000,    500000,   '1997-08-15', '2026-08-15', 'Meena Joshi',    'active',      admin_id, 'LIC Jeevan Anand. 20yr plan. Maturing 2026.',admin_id),
    ('33333333-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000008', 'Endowment',  'LIC',            'LIC/EN/1998/789012',  18000,    300000,   '1998-10-01', '2026-10-01', 'Arun Rao',       'active',      admin_id, 'Maturing Oct 2026. Remind about reinvestment.',admin_id)
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================
  -- STEP 7: Insert Insurance Pipeline Cases with case_number
  -- =========================================================

  INSERT INTO insurance_cases (id, customer_id, customer_name, case_number, policy_type, insurance_partner, rm_id, premium_amount, expected_commission, actual_commission, commission_received, quote_date, policy_issue_date, renewal_date, case_status, rejection_reason, remarks, created_by, created_at) VALUES
    ('44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Rajesh Kumar Sharma', 'INS-2526-1001', 'Health',   'HDFC ERGO',    admin_id, 28000,  4200,  4200, true,  '2026-01-15', '2026-02-01', '2027-02-01', 'Policy Issued',      '',                  'Family floater 5L. Commission received.',    admin_id, '2026-01-15'),
    ('44444444-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Priya Mehta',         'INS-2526-1002', 'Term Life','Tata AIG',     admin_id, 18000,  2700,  0,    false, '2026-03-10', NULL,         NULL,         'Under Process',      '',                  'Medical done. Waiting for underwriting.',    admin_id, '2026-03-10'),
    ('44444444-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Suresh Agarwal',      'INS-2526-1003', 'Health',   'Star Health',  admin_id, 12000,  1800,  0,    false, '2026-04-01', NULL,         NULL,         'Quote Received',     '',                  'Quote received. Customer reviewing options.', admin_id, '2026-04-01'),
    ('44444444-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'Anita Verma',         'INS-2526-1004', 'Motor',    'Tata AIG',     admin_id, 9500,   950,   0,    false, NULL,         NULL,         NULL,         'Lead Generated',     '',                  'Inquiry for new car insurance.',             admin_id, '2026-04-15'),
    ('44444444-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000005', 'Mohammed Irfan',      'INS-2526-1005', 'Health',   'ICICI Lombard',admin_id, 35000,  5250,  0,    false, '2026-03-20', NULL,         NULL,         'Customer Discussion','',                  'High sum assured requested. 25L family plan.', admin_id, '2026-03-20'),
    ('44444444-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000006', 'Kavitha Nair',        'INS-2526-1006', 'Term Life','HDFC ERGO',    admin_id, 22000,  3300,  3300, true,  '2026-02-05', '2026-02-28', '2027-02-28', 'Policy Issued',      '',                  '2Cr term plan. Commission received.',        admin_id, '2026-02-05'),
    ('44444444-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000007', 'Deepak Joshi',        'INS-2526-1007', 'Health',   'Cateye',       admin_id, 8500,   1275,  0,    false, '2026-04-10', NULL,         NULL,         'Documents Pending',  '',                  'Waiting for last 3 years ITR.',              admin_id, '2026-04-10'),
    ('44444444-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000008', 'Sunita Rao',          'INS-2526-1008', 'Health',   'Star Health',  admin_id, 11000,  1650,  0,    false, '2026-04-08', NULL,         NULL,         'Quote Requested',    '',                  'Senior citizen plan. Waiting for quote.',    admin_id, '2026-04-08'),
    ('44444444-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000002', 'Priya Mehta',         'INS-2526-1009', 'Health',   'Cateye',       admin_id, 15000,  2250,  0,    false, '2026-02-01', NULL,         NULL,         'Rejected',           'Pre-existing thyroid condition not covered.', 'Rejected by Cateye. Try Star Health next.', admin_id, '2026-02-01'),
    ('44444444-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000005', 'Mohammed Irfan',      'INS-2526-1010', 'Motor',    'HDFC ERGO',    admin_id, 18500,  1850,  1850, true,  '2026-01-20', '2026-02-10', '2027-02-10', 'Policy Issued',      '',                  'Commercial vehicle insurance. Issued.',      admin_id, '2026-01-20')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================
  -- STEP 8: Insert Renewals
  -- =========================================================

  INSERT INTO renewals (customer_id, policy_id, renewal_type, title, renewal_date, amount, status, notes) VALUES
    ('11111111-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'insurance', 'Term Life - HDFC Life',          '2026-04-01', 18500, 'pending', 'URGENT: Due today. Customer not responsive.'),
    ('11111111-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000003', 'insurance', 'Health - HDFC ERGO',             '2026-05-20', 9500,  'pending', 'Remind Suresh 2 weeks before.'),
    ('11111111-0000-0000-0000-000000000005', NULL,                                   'insurance', 'Term Life - ICICI Prudential',   '2026-06-01', 22000, 'pending', 'Renewal due June. Start conversation in May.'),
    ('11111111-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000005', 'insurance', 'Term Life - ICICI Prudential',   '2026-05-28', 22000, 'pending', 'Overdue by 4 months! Urgent callback needed.'),
    ('11111111-0000-0000-0000-000000000007', '33333333-0000-0000-0000-000000000007', 'insurance', 'LIC Endowment Maturity',         '2026-08-15', 24000, 'pending', 'Maturity payout. Advise reinvestment options.'),
    ('11111111-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000008', 'insurance', 'LIC Endowment Maturity',         '2026-10-01', 18000, 'pending', 'Maturity Oct 2026. Reinvestment plan ready.'),
    ('11111111-0000-0000-0000-000000000002', NULL,                                   'emi',       'Home Loan EMI - HDFC Bank',      '2026-05-05', 58200, 'pending', 'First EMI due after disbursal.'),
    ('11111111-0000-0000-0000-000000000001', NULL,                                   'emi',       'IDFC First Personal Loan EMI',   '2026-05-20', 12000, 'pending', 'Regular EMI. Auto debit set up.')
  ON CONFLICT DO NOTHING;

  -- =========================================================
  -- STEP 9: Insert Tasks
  -- =========================================================

  INSERT INTO tasks (customer_id, task_type, title, description, due_date, status, assigned_to, created_by) VALUES
    ('11111111-0000-0000-0000-000000000001', 'insurance_renewal',    'Renew HDFC Life Term Policy',          'Term policy due Apr 1. Customer not picking up. Try WhatsApp.', '2026-05-25 10:00:00+05:30', 'pending',  admin_id, admin_id),
    ('11111111-0000-0000-0000-000000000002', 'document_collection',  'Collect Salary Slips — Priya Mehta',   'Last 3 months salary slips required for HDFC home loan.',       '2026-05-23 12:00:00+05:30', 'pending',  admin_id, admin_id),
    ('11111111-0000-0000-0000-000000000003', 'customer_call',        'Follow up: Suresh Agarwal Health Quote','Star Health quote shared. Awaiting decision.',                  '2026-05-24 11:00:00+05:30', 'pending',  admin_id, admin_id),
    ('11111111-0000-0000-0000-000000000004', 'document_collection',  'RC Copy — Anita Car Loan',             'ICICI needs RC and insurance certificate.',                     '2026-05-22 15:00:00+05:30', 'overdue',  admin_id, admin_id),
    ('11111111-0000-0000-0000-000000000005', 'site_visit',           'Property Visit — Irfan LAP',           'Visit scheduled for LAP property valuation in Banjara Hills.',  '2026-05-27 10:30:00+05:30', 'pending',  admin_id, admin_id),
    ('11111111-0000-0000-0000-000000000006', 'quote_sharing',        'Share Term Quotes — Kavitha',          'Send comparison of HDFC, ICICI, Max Life term plans.',          '2026-05-23 09:00:00+05:30', 'in_progress',admin_id,admin_id),
    ('11111111-0000-0000-0000-000000000007', 'document_collection',  'ITR Documents — Deepak Insurance',     'Cateye health requires last 3 years ITR. Request from client.', '2026-05-26 14:00:00+05:30', 'pending',  admin_id, admin_id),
    ('11111111-0000-0000-0000-000000000008', 'customer_call',        'LIC Maturity Reinvestment — Sunita',   'Discuss FD vs MF vs new policy for LIC maturity proceeds.',     '2026-06-01 11:00:00+05:30', 'pending',  admin_id, admin_id),
    (NULL,                                  'other',                 'Monthly MIS Report — May 2026',        'Prepare partner-wise insurance summary for management.',        '2026-05-31 18:00:00+05:30', 'pending',  admin_id, admin_id),
    ('11111111-0000-0000-0000-000000000001', 'emi_followup',         'HDFC LAP EMI Status — Rajesh',         'Check if LAP disbursement done and EMI mandate submitted.',     '2026-05-28 10:00:00+05:30', 'pending',  admin_id, admin_id)
  ON CONFLICT DO NOTHING;

  -- =========================================================
  -- STEP 10: Insert Documents (KYC + tagged to leads)
  -- =========================================================

  INSERT INTO documents (customer_id, loan_id, insurance_case_id, document_name, document_type, category, uploaded_by) VALUES
    -- Rajesh Kumar — KYC
    ('11111111-0000-0000-0000-000000000001', NULL, NULL, 'PAN Card — Rajesh Kumar',          'PAN Card',      'kyc',       admin_id),
    ('11111111-0000-0000-0000-000000000001', NULL, NULL, 'Aadhaar Card — Rajesh Kumar',      'Aadhaar Card',  'kyc',       admin_id),
    -- Rajesh Kumar — tagged to Home Loan (LN-2526-1001)
    ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', NULL, 'Bank Statement 6M — SBI Home Loan', 'Bank Statement', 'loan', admin_id),
    ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', NULL, 'Sanction Letter — SBI Home Loan',  'Sanction Letter','loan', admin_id),
    -- Rajesh Kumar — tagged to Insurance Case INS-2526-1001
    ('11111111-0000-0000-0000-000000000001', NULL, '44444444-0000-0000-0000-000000000001', 'Health Insurance Proposal Form — HDFC ERGO', 'Proposal Form', 'insurance', admin_id),
    -- Priya Mehta — KYC
    ('11111111-0000-0000-0000-000000000002', NULL, NULL, 'PAN Card — Priya Mehta',           'PAN Card',      'kyc',       admin_id),
    ('11111111-0000-0000-0000-000000000002', NULL, NULL, 'Aadhaar Card — Priya Mehta',       'Aadhaar Card',  'kyc',       admin_id),
    ('11111111-0000-0000-0000-000000000002', NULL, NULL, 'Passport — Priya Mehta',           'Passport',      'kyc',       admin_id),
    -- Priya Mehta — tagged to Home Loan (LN-2526-1003)
    ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', NULL, 'Salary Slip Apr 2026 — Priya Mehta', 'Salary Slip',  'loan', admin_id),
    -- Suresh Agarwal — KYC
    ('11111111-0000-0000-0000-000000000003', NULL, NULL, 'PAN Card — Suresh Agarwal',        'PAN Card',      'kyc',       admin_id),
    -- Suresh Agarwal — tagged to Insurance Case INS-2526-1003
    ('11111111-0000-0000-0000-000000000003', NULL, '44444444-0000-0000-0000-000000000003', 'Star Health Proposal — Suresh Agarwal', 'Proposal Form','insurance', admin_id),
    -- Anita Verma — KYC
    ('11111111-0000-0000-0000-000000000004', NULL, NULL, 'PAN Card — Anita Verma',           'PAN Card',      'kyc',       admin_id),
    ('11111111-0000-0000-0000-000000000004', NULL, NULL, 'Driving Licence — Anita Verma',    'Driving Licence','kyc',      admin_id),
    -- Kavitha Nair — KYC + Insurance
    ('11111111-0000-0000-0000-000000000006', NULL, NULL, 'PAN Card — Kavitha Nair',          'PAN Card',      'kyc',       admin_id),
    ('11111111-0000-0000-0000-000000000006', NULL, '44444444-0000-0000-0000-000000000006', 'HDFC ERGO Term Policy Document — Kavitha', 'Policy Document','insurance', admin_id),
    -- Deepak Joshi — KYC + Loan
    ('11111111-0000-0000-0000-000000000007', NULL, NULL, 'PAN Card — Deepak Joshi',          'PAN Card',      'kyc',       admin_id),
    ('11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000007', NULL, 'CA Audited P&L FY2025 — SBI Business Loan', 'ITR', 'loan', admin_id),
    -- Sunita Rao — KYC
    ('11111111-0000-0000-0000-000000000008', NULL, NULL, 'Aadhaar Card — Sunita Rao',        'Aadhaar Card',  'kyc',       admin_id)
  ON CONFLICT DO NOTHING;

  -- =========================================================
  -- STEP 11: Insert Activities (Timeline)
  -- =========================================================

  INSERT INTO activities (customer_id, activity_type, description, performed_by, created_at) VALUES
    ('11111111-0000-0000-0000-000000000001', 'customer_added',   'Customer added: Rajesh Kumar Sharma',                       admin_id, '2026-01-08 09:30:00+05:30'),
    ('11111111-0000-0000-0000-000000000001', 'loan_created',     'Loan case created: Home Loan - SBI (LN-2526-1001)',          admin_id, '2026-01-10 11:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000001', 'document_uploaded','Document uploaded: Bank Statement 6M — SBI Home Loan',        admin_id, '2026-01-12 14:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000001', 'policy_created',   'Insurance case opened: Health - HDFC ERGO (INS-2526-1001)',  admin_id, '2026-01-15 10:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000001', 'policy_created',   'Policy issued: HDFC ERGO Health — Premium ₹28,000',          admin_id, '2026-02-01 15:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000001', 'loan_created',     'Home Loan disbursed: ₹45,00,000 — SBI',                     admin_id, '2026-02-15 10:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000001', 'note_added',       'Follow up: LAP on commercial property submitted to HDFC.',   admin_id, '2026-03-01 09:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000002', 'customer_added',   'Customer added: Priya Mehta',                               admin_id, '2026-02-18 10:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000002', 'loan_created',     'Loan case created: Home Loan - HDFC Bank (LN-2526-1003)',    admin_id, '2026-02-20 11:30:00+05:30'),
    ('11111111-0000-0000-0000-000000000002', 'document_uploaded','Document uploaded: Salary Slip Apr 2026',                    admin_id, '2026-02-22 12:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000002', 'note_added',       'Salary slips incomplete. Requested 3 months from client.',  admin_id, '2026-03-01 10:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000003', 'customer_added',   'Customer added: Suresh Agarwal',                            admin_id, '2026-01-03 09:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000003', 'loan_created',     'Loan case created: Business Loan - Bajaj Finserv (LN-2526-1004)',admin_id,'2026-01-05 10:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000003', 'loan_created',     'Business Loan disbursed: ₹15,00,000 — Bajaj Finserv',       admin_id, '2026-01-28 14:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000006', 'customer_added',   'Customer added: Kavitha Nair',                              admin_id, '2026-02-02 09:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000006', 'policy_created',   'Insurance case opened: Term Life - HDFC ERGO (INS-2526-1006)',admin_id,'2026-02-05 10:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000006', 'policy_created',   'Policy issued: HDFC ERGO Term Life 2Cr — Premium ₹22,000',  admin_id, '2026-02-28 16:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000007', 'customer_added',   'Customer added: Deepak Joshi',                              admin_id, '2026-02-08 09:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000007', 'loan_created',     'Loan case created: Business Loan - SBI (LN-2526-1008)',      admin_id, '2026-02-10 11:00:00+05:30'),
    ('11111111-0000-0000-0000-000000000007', 'policy_created',   'Insurance case opened: Health - Cateye (INS-2526-1007)',    admin_id, '2026-04-10 10:00:00+05:30')
  ON CONFLICT DO NOTHING;

END $$;
