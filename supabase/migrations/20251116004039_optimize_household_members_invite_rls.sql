/*
  # Optimize Household Members Invite RLS Policy

  1. Changes
    - Drop existing "Users can join household with valid invite" policy
    - Recreate with optimized auth.uid() call wrapped in subquery
    - Prevents re-evaluation of auth.uid() for each row
  
  2. Performance
    - Improves INSERT performance by evaluating auth.uid() once per query
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Users can join household with valid invite" ON household_members;

-- Recreate with optimized auth.uid()
CREATE POLICY "Users can join household with valid invite"
  ON household_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM household_invites
      WHERE household_invites.household_id = household_members.household_id
        AND household_invites.used_at IS NULL
        AND household_invites.expires_at > now()
    )
  );
