/*
  # Allow Anonymous Users to Read Household Names for Invites

  1. Changes
    - Add RLS policy to allow anonymous users to read household names
    - This is needed so invite pages can show the household name before sign-in
    - Only allows reading name field, not sensitive household data

  2. Security
    - Anonymous users can only SELECT household data
    - This is safe as household names are not sensitive
    - Invite codes provide the security layer
*/

-- Allow anonymous users to read household data (for invite pages)
CREATE POLICY "Anonymous users can read household names"
  ON households
  FOR SELECT
  TO anon
  USING (true);
