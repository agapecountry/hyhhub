/*
  # Fix handle_new_user to Bypass RLS
  
  1. Purpose
    - Make handle_new_user function work during signup when auth.uid() doesn't exist yet
    - Grant necessary permissions to bypass RLS for initial user setup
    
  2. Changes
    - Recreate function to properly handle RLS during user creation
    - Use SECURITY DEFINER with explicit schema qualification
*/

-- Drop and recreate the function with proper RLS handling
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, auth
AS $$
DECLARE
  default_household_id UUID;
  user_name TEXT;
BEGIN
  -- Get user name from metadata or email
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Disable RLS for this transaction to allow initial setup
  PERFORM set_config('request.jwt.claims', json_build_object('sub', NEW.id::text, 'role', 'authenticated')::text, true);

  -- Create user entry
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, user_name);

  -- Create default household
  INSERT INTO public.households (name, created_by)
  VALUES (user_name || '''s Household', NEW.id)
  RETURNING id INTO default_household_id;

  -- Add user as admin member
  INSERT INTO public.household_members (
    household_id, 
    user_id, 
    role, 
    name,
    is_account_member,
    color,
    total_coins,
    spent_coins,
    current_coins
  )
  VALUES (
    default_household_id,
    NEW.id,
    'admin',
    user_name,
    true,
    '#3b82f6',
    0,
    0,
    0
  );

  -- Set default household in user_settings
  INSERT INTO public.user_settings (user_id, household_id, default_household_id)
  VALUES (NEW.id, default_household_id, default_household_id);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE WARNING 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permission to postgres role (needed for SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;
