/*
  # Fix Auth Identity for Admin User

  The admin user was created directly via SQL without an identity record,
  causing "Database error querying schema" on login.
  This migration adds the missing auth.identities entry.
*/

DO $$
DECLARE
  v_user_id uuid := '02b3b861-8e5b-4fbd-b3e2-1d82accda07f';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = v_user_id
  ) THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'varunadlakha87@gmail.com'),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  END IF;
END $$;
