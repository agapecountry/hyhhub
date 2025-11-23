/*
  # Add Policy for Invite Acceptance

  1. Changes
    - Add policy to allow users to add themselves via valid invite
    - This enables invite acceptance flow for authenticated users
  
  2. Security
    - Users can only add themselves (user_id must match auth.uid())
    - Must have a valid, unused, non-expired invite for the household
    - Role is restricted to what's specified in the insert
*/

-- Add policy for users accepting invites
CREATE POLICY "Users can join household with valid invite"
  ON household_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM household_invites
      WHERE household_invites.household_id = household_members.household_id
        AND household_invites.used_at IS NULL
        AND household_invites.expires_at > now()
    )
  );
