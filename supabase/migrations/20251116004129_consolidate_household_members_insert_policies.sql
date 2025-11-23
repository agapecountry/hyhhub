/*
  # Consolidate Household Members INSERT Policies

  1. Changes
    - Drop three separate permissive INSERT policies for authenticated users
    - Create single policy combining all three use cases with OR logic
    - Keep service role and postgres policies separate (they use different roles)
  
  2. Security
    - Users can insert if:
      a) Adding themselves (signup flow)
      b) They're admin/co_parent in the household
      c) They have a valid invite
    - Maintains same security as before but in cleaner, more maintainable form
  
  3. Performance
    - Reduces policy evaluation overhead
    - Single policy is more efficient than multiple permissive policies
*/

-- Drop existing authenticated user INSERT policies
DROP POLICY IF EXISTS "Users can add self as member during signup" ON household_members;
DROP POLICY IF EXISTS "Users can insert household members" ON household_members;
DROP POLICY IF EXISTS "Users can join household with valid invite" ON household_members;

-- Create consolidated INSERT policy for authenticated users
CREATE POLICY "Users can insert household members"
  ON household_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can add themselves (signup flow)
    user_id = (SELECT auth.uid())
    OR
    -- User is admin/co_parent in the household
    EXISTS (
      SELECT 1
      FROM household_members existing
      WHERE existing.household_id = household_members.household_id
        AND existing.user_id = (SELECT auth.uid())
        AND existing.role IN ('admin', 'co_parent')
    )
    OR
    -- User has valid invite for this household
    (
      user_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1
        FROM household_invites
        WHERE household_invites.household_id = household_members.household_id
          AND household_invites.used_at IS NULL
          AND household_invites.expires_at > now()
      )
    )
  );
