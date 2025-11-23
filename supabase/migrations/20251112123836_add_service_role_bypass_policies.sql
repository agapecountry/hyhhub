/*
  # Add Service Role Bypass Policies for User Creation
  
  1. Purpose
    - Allow the handle_new_user trigger to work during signup
    - Add INSERT policies that work with SECURITY DEFINER functions
    
  2. Changes
    - Add INSERT policy for users table for service_role
    - Modify household_members INSERT policy to allow service_role
    - Modify user_settings INSERT policy to allow service_role
    
  3. Security
    - These policies only apply to service_role which is used by triggers
    - Regular authenticated users still go through normal RLS
*/

-- Add INSERT policy for users table (it was missing)
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
CREATE POLICY "Service role can insert users"
  ON public.users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add policy for authenticated users to insert themselves
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
CREATE POLICY "Users can insert own record"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Add service role bypass for household_members
DROP POLICY IF EXISTS "Service role can insert household members" ON public.household_members;
CREATE POLICY "Service role can insert household members"
  ON public.household_members
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add service role bypass for user_settings
DROP POLICY IF EXISTS "Service role can insert user settings" ON public.user_settings;
CREATE POLICY "Service role can insert user settings"
  ON public.user_settings
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add service role bypass for households (for completeness)
DROP POLICY IF EXISTS "Service role can insert households" ON public.households;
CREATE POLICY "Service role can insert households"
  ON public.households
  FOR INSERT
  TO service_role
  WITH CHECK (true);
