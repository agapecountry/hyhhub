/*
  # Add Update Policy for Household Members

  ## Overview
  Adds an UPDATE policy to allow admins to update household member information
  including name, role, and color.

  ## Changes

  1. Security Policies
    - Add UPDATE policy for household_members
    - Admins can update any member in their household
    - Users can update their own member record

  ## Important Notes
  - Ensures admins can manage member names, colors, and roles
  - Allows users to update their own information
*/

-- Add update policy for household_members
CREATE POLICY "Admins can update household members"
  ON household_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
    OR user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
    OR user_id = auth.uid()
  );