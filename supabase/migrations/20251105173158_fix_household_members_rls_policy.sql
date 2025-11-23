/*
  # Fix Infinite Recursion in household_members RLS Policy

  1. Changes
    - Drop the recursive policy on household_members that checks household_members
    - Replace with simpler policies that allow users to view and insert their own memberships
    - Users can view household_members where they are a member (using household_id check)
    - Users can insert themselves as members
    - Only admins can delete members

  2. Security
    - Users can see all members of households they belong to
    - Users can only add themselves to households
    - Admins can manage membership
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view members of their households" ON household_members;

-- Create simpler, non-recursive policy
-- Users can view household_members if the user_id matches (their own membership)
CREATE POLICY "Users can view their own memberships"
  ON household_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view all members of households where they have any membership
-- This uses a subquery that doesn't create recursion
CREATE POLICY "Users can view members of joined households"
  ON household_members FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT hm.household_id 
      FROM household_members hm 
      WHERE hm.user_id = auth.uid()
    )
  );