/*
  # Fix RLS Bypass for handle_new_user Trigger
  
  1. Purpose
    - Make the trigger work by having it run as a role that bypasses RLS
    - The postgres role should bypass RLS but policies need to allow it
    
  2. Changes
    - Update all INSERT policies to allow postgres role
    - Ensure the function can insert into all required tables
*/

-- Update users table policies to allow postgres
DROP POLICY IF EXISTS "Postgres can insert users" ON public.users;
CREATE POLICY "Postgres can insert users"
  ON public.users
  FOR INSERT
  TO postgres
  WITH CHECK (true);

-- Update households table policies to allow postgres
DROP POLICY IF EXISTS "Postgres can insert households" ON public.households;
CREATE POLICY "Postgres can insert households"
  ON public.households
  FOR INSERT
  TO postgres
  WITH CHECK (true);

-- Update household_members table policies to allow postgres
DROP POLICY IF EXISTS "Postgres can insert household members" ON public.household_members;
CREATE POLICY "Postgres can insert household members"
  ON public.household_members
  FOR INSERT
  TO postgres
  WITH CHECK (true);

-- Update user_settings table policies to allow postgres
DROP POLICY IF EXISTS "Postgres can insert user settings" ON public.user_settings;
CREATE POLICY "Postgres can insert user settings"
  ON public.user_settings
  FOR INSERT
  TO postgres
  WITH CHECK (true);

-- Ensure the function is owned by postgres and has SECURITY DEFINER
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Grant necessary permissions
GRANT ALL ON public.users TO postgres;
GRANT ALL ON public.households TO postgres;
GRANT ALL ON public.household_members TO postgres;
GRANT ALL ON public.user_settings TO postgres;
