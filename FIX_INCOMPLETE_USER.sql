/*
  Manual fix for user accounts created before the signup trigger was fixed.
  
  Run this in Supabase SQL Editor for each broken user.
  Replace 'user@example.com' with the actual email address.
*/

DO $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_user_name text;
  v_household_id uuid;
BEGIN
  -- Get the user from auth.users (CHANGE THIS EMAIL)
  SELECT id, email INTO v_user_id, v_email
  FROM auth.users
  WHERE email = 'user@example.com'; -- <-- CHANGE THIS
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with that email';
  END IF;
  
  -- Extract name from email
  v_user_name := split_part(v_email, '@', 1);
  
  -- Check if user already has data
  IF EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RAISE NOTICE 'User data already exists, skipping...';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Creating missing data for user: %', v_email;
  
  -- Create user entry
  INSERT INTO public.users (id, email, name, timezone)
  VALUES (v_user_id, v_email, v_user_name, 'America/New_York')
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default household
  INSERT INTO public.households (name)
  VALUES (v_user_name || '''s Household')
  RETURNING id INTO v_household_id;
  
  -- Add user as admin member
  INSERT INTO public.household_members (household_id, user_id, role, name)
  VALUES (v_household_id, v_user_id, 'admin', v_user_name);
  
  -- Create user settings
  INSERT INTO public.user_settings (user_id, household_id, default_household_id, settings)
  VALUES (v_user_id, v_household_id, v_household_id, '{}'::jsonb);
  
  RAISE NOTICE 'Successfully created data for user: %', v_email;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing user: % %', SQLERRM, SQLSTATE;
  RAISE;
END $$;
