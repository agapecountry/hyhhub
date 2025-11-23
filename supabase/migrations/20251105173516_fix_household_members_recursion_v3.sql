/*
  # Fix Infinite Recursion in household_members RLS - Version 3

  1. Changes
    - Drop ALL existing policies on household_members
    - Create security definer functions to safely check membership
    - Create new non-recursive policies

  2. Security
    - Users can view all household_members records
    - Users can only insert themselves
    - Admins can delete members
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can add themselves to households" ON household_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON household_members;
DROP POLICY IF EXISTS "Users can view members of joined households" ON household_members;
DROP POLICY IF EXISTS "Admins can manage household members" ON household_members;

-- Create security definer functions if they don't exist
CREATE OR REPLACE FUNCTION public.user_is_household_member(household_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.household_members
    WHERE household_id = household_uuid 
    AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_household_admin(household_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.household_members
    WHERE household_id = household_uuid 
    AND user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Create new non-recursive policies
CREATE POLICY "Users can view all household members"
  ON household_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert themselves as members"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can delete members"
  ON household_members FOR DELETE
  TO authenticated
  USING (user_is_household_admin(household_id));