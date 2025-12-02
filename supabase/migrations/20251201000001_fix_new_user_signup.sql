/*
  # Fix New User Signup Error
  
  The handle_new_user function was trying to insert into user_settings
  which doesn't exist. We have user_preferences instead.
  
  This migration fixes the function to work with the actual schema.
*/

-- Drop and recreate the function with correct table names
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  default_household_id UUID;
  user_name TEXT;
BEGIN
  -- Extract user name from metadata or email
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Create user entry
  INSERT INTO public.users (id, email, name, timezone)
  VALUES (
    NEW.id, 
    NEW.email, 
    user_name,
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'America/New_York')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create default household
  INSERT INTO public.households (name)
  VALUES (user_name || '''s Household')
  RETURNING id INTO default_household_id;

  -- Add user as admin member
  INSERT INTO public.household_members (household_id, user_id, role, name)
  VALUES (
    default_household_id,
    NEW.id,
    'admin',
    user_name
  );

  -- Create user preferences (not user_settings)
  INSERT INTO public.user_preferences (user_id, theme, language)
  VALUES (NEW.id, 'system', 'en')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error for debugging
  RAISE LOG 'Error in handle_new_user for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  -- Re-raise to prevent user creation
  RAISE;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update policies to allow the function to work

-- Users table: Allow inserting own record during signup
DROP POLICY IF EXISTS "Users can insert own record during signup" ON public.users;
CREATE POLICY "Users can insert own record during signup"
  ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Households table: Allow creating households
DROP POLICY IF EXISTS "Users can create households during signup" ON public.households;
CREATE POLICY "Users can create households during signup"
  ON public.households
  FOR INSERT
  WITH CHECK (true);

-- Household members: Allow adding self as member
DROP POLICY IF EXISTS "Users can add self as member during signup" ON public.household_members;
CREATE POLICY "Users can add self as member during signup"
  ON public.household_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- User preferences: Allow creating own preferences
DROP POLICY IF EXISTS "Users can create own preferences during signup" ON public.user_preferences;
CREATE POLICY "Users can create own preferences during signup"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

COMMENT ON FUNCTION public.handle_new_user IS 
  'Creates user record, default household, and preferences when a new user signs up via auth.users';
