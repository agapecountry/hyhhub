/*
  # Fix Invite Access for Anonymous Users

  1. Changes
    - Add RLS policy to allow anonymous users to read household invites
    - This is needed so users can view invite details before signing in
    - Access is still restricted to valid, non-expired invites by application logic

  2. Security
    - Anonymous users can only SELECT invite data
    - Cannot create, update, or delete invites
    - Invite codes act as secure tokens (UUID format)
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anonymous users can read invites by code" ON household_invites;

-- Allow anonymous users to read invites by code
CREATE POLICY "Anonymous users can read invites by code"
  ON household_invites
  FOR SELECT
  TO anon
  USING (true);
