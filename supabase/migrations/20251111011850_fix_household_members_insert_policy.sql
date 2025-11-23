/*
  # Fix household_members INSERT policy

  1. Changes
    - Drop the restrictive INSERT policy that only allows self-insertion
    - Create new INSERT policy that allows:
      - Users to insert themselves as members (user_id = auth.uid())
      - Admins to insert any member (including non-account members with NULL user_id)
  
  2. Security
    - Maintains security by checking admin role for non-self insertions
    - Allows non-account member creation by admins
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can insert themselves as members" ON household_members;

-- Create new policy that allows both self-insertion and admin insertion
CREATE POLICY "Users can insert household members"
  ON household_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to insert themselves
    user_id = auth.uid()
    OR
    -- Allow admins to insert any member (including non-account members)
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
        AND hm.user_id = auth.uid()
        AND hm.role = 'admin'
    )
  );
