/*
  # Fix households table policies to use security definer functions

  1. Changes
    - Drop policies that directly query household_members
    - Replace with policies using security definer functions
    - This prevents recursion issues

  2. Security
    - Users can view households where they are members
    - Users can create households
    - Admins can update and delete their households
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view households they belong to" ON households;
DROP POLICY IF EXISTS "Admins can update their households" ON households;
DROP POLICY IF EXISTS "Admins can delete their households" ON households;

-- Create new policies using security definer functions
CREATE POLICY "Users can view their households"
  ON households FOR SELECT
  TO authenticated
  USING (user_is_household_member(id));

CREATE POLICY "Admins can update households"
  ON households FOR UPDATE
  TO authenticated
  USING (user_is_household_admin(id))
  WITH CHECK (user_is_household_admin(id));

CREATE POLICY "Admins can delete households"
  ON households FOR DELETE
  TO authenticated
  USING (user_is_household_admin(id));