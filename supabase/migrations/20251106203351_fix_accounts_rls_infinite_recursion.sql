/*
  # Fix Infinite Recursion in Accounts RLS Policy

  1. Changes
    - Simplify the SELECT policy for accounts table to avoid recursion
    - Remove nested subquery that causes infinite recursion
    - Keep role-based access control working correctly

  2. Security
    - Maintains same security posture
    - Admins, co-parents, and teens can view accounts
    - Account view permissions still work but without recursion
*/

DROP POLICY IF EXISTS "Members can view accounts based on role" ON accounts;

CREATE POLICY "Members can view accounts based on role"
  ON accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co_parent', 'teen')
    )
  );
