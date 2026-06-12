/*
  # Create Admin User

  Creates the initial admin user account for Kamson Financials.
*/

DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'varunadlakha87@gmail.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    )
    VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'varunadlakha87@gmail.com',
      crypt('admin', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Varun Adlakha","role":"admin"}',
      now(),
      now(),
      'authenticated',
      'authenticated'
    );

    INSERT INTO public.profiles (id, full_name, role, is_active)
    VALUES (new_user_id, 'Varun Adlakha', 'admin', true)
    ON CONFLICT (id) DO NOTHING;
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('admin', gen_salt('bf')), updated_at = now()
    WHERE email = 'varunadlakha87@gmail.com';
  END IF;
END $$;
