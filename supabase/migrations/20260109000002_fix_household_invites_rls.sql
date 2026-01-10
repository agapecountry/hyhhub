/*
  # Fix Household Invites RLS Policy
  
  1. Changes
    - Replace overly permissive USING (true) with proper restriction
    - Only allow updating invites that haven't been used yet
    - Ensure user can only mark themselves as the one who used it
*/

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can mark invite as used" ON household_invites;

-- Create a more restrictive policy
-- Users can only update invites that are:
-- 1. Not yet used (used_at IS NULL)
-- 2. Not expired
-- 3. They are marking themselves as the user (used_by = auth.uid())
CREATE POLICY "Users can mark valid invites as used"
  ON household_invites
  FOR UPDATE
  TO authenticated
  USING (
    used_at IS NULL 
    AND expires_at > now()
  )
  WITH CHECK (
    used_by = (select auth.uid())
    AND used_at IS NOT NULL
  );
