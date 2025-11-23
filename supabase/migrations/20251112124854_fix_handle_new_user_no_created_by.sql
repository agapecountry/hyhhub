/*
  # Fix handle_new_user Without created_by Column
  
  1. Purpose
    - Create a working trigger that works with the actual schema
    - Add permissive policies that allow the function to work
    
  2. Changes
    - Remove references to non-existent created_by column
    - Add permissive policies for authenticated users
*/

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create permissive policies that allow users to create their own records

-- Users table: Allow inserting own user record
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

-- User settings: Allow creating own settings
DROP POLICY IF EXISTS "Users can create own settings during signup" ON public.user_settings;
CREATE POLICY "Users can create own settings during signup"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create the simplified function
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
  -- Extract user name
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Create user entry with timezone
  INSERT INTO public.users (id, email, name, timezone)
  VALUES (
    NEW.id, 
    NEW.email, 
    user_name,
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'America/New_York')
  );

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

  -- Set default household
  INSERT INTO public.user_settings (user_id, household_id, default_household_id)
  VALUES (NEW.id, default_household_id, default_household_id);

  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error for debugging
  RAISE LOG 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
  RAISE;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
