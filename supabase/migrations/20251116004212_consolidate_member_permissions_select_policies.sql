/*
  # Consolidate Member Permissions SELECT Policies

  1. Changes
    - Split "Admins can manage permissions" from FOR ALL into separate policies
    - Consolidate SELECT policies into single policy
    - Keep UPDATE, INSERT, DELETE as separate admin-only policies
  
  2. Security
    - Users can view permissions if they're in the household
    - Only admins can modify permissions
  
  3. Performance
    - Eliminates duplicate SELECT policy evaluation
    - More efficient query execution
*/

-- Drop existing ALL policy
DROP POLICY IF EXISTS "Admins can manage permissions" ON member_permissions;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view permissions in their households" ON member_permissions;

-- Create consolidated SELECT policy (all household members can view)
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

-- Create admin-only INSERT policy
CREATE POLICY "Admins can insert permissions"
  ON member_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members
      WHERE household_members.household_id = member_permissions.household_id
        AND household_members.user_id = (SELECT auth.uid())
        AND household_members.role = 'admin'
    )
  );

-- Create admin-only UPDATE policy
CREATE POLICY "Admins can update permissions"
  ON member_permissions
  FOR UPDATE
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

-- Create admin-only DELETE policy
CREATE POLICY "Admins can delete permissions"
  ON member_permissions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members
      WHERE household_members.household_id = member_permissions.household_id
        AND household_members.user_id = (SELECT auth.uid())
        AND household_members.role = 'admin'
    )
  );
