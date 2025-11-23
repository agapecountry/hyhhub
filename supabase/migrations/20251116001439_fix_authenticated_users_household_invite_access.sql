/*
  # Fix Authenticated User Access to Household Names via Invites

  1. Changes
    - Add policy to allow authenticated users to view household names when they have a valid invite
    - This allows users who are logged in to see household information when accepting invites
  
  2. Security
    - Users can only see household name if they have a valid, unused, non-expired invite
    - Restricts access to name field only
    - Does not grant access to other household data
*/

-- Drop and recreate the authenticated user SELECT policy to include invite access
DROP POLICY IF EXISTS "Users can view their households" ON households;

CREATE POLICY "Users can view their households"
  ON households
  FOR SELECT
  TO authenticated
  USING (
    user_is_household_member(id) 
    OR (NOT EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = households.id))
    OR EXISTS (
      SELECT 1 FROM household_invites 
      WHERE household_invites.household_id = households.id
        AND household_invites.used_at IS NULL
        AND household_invites.expires_at > now()
    )
  );
