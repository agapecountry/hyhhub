/*
  # Optimize Member Permissions RLS Policy

  1. Changes
    - Drop existing RLS policies on member_permissions
    - Recreate with optimized auth.uid() calls wrapped in subqueries
    - This prevents re-evaluation of auth.uid() for each row
  
  2. Performance
    - Improves query performance at scale by evaluating auth functions once
    - Follows Supabase RLS best practices for authentication checks
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view permissions in their households" ON member_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON member_permissions;

-- Recreate optimized SELECT policy
CREATE POLICY "Users can view permissions in their households"
  ON member_permissions
  FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_members.household_id
      FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
    )
  );

-- Recreate optimized admin policy
CREATE POLICY "Admins can manage permissions"
  ON member_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members
      WHERE household_members.household_id = member_permissions.household_id
        AND household_members.user_id = (SELECT auth.uid())
        AND household_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members
      WHERE household_members.household_id = member_permissions.household_id
        AND household_members.user_id = (SELECT auth.uid())
        AND household_members.role = 'admin'
    )
  );
