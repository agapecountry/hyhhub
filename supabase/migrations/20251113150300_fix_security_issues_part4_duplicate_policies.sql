/*
  # Fix Security Issues - Part 4: Remove Duplicate Permissive Policies

  1. Problem
    - Multiple tables have duplicate permissive INSERT policies
    - This creates confusion and potential security issues
    - Policies include both "during signup" and regular versions

  2. Solution
    - Keep only one INSERT policy per table
    - Remove "during signup" versions (they're redundant)
    - The regular policy covers both signup and normal operations

  3. Tables Fixed
    - household_members: Remove "Users can add self as member during signup"
    - households: Remove "Users can create households during signup"
    - user_settings: Remove "Users can create own settings during signup"
    - users: Remove "Users can insert own record during signup"

  Note: These policies were already optimized in Part 2, now we just remove duplicates
*/

-- ============================================================================
-- household_members - Remove duplicate INSERT policy
-- ============================================================================

-- Keep: "Users can insert household members" (covers both cases)
-- Remove: "Users can add self as member during signup" (already dropped in Part 2)

-- ============================================================================
-- households - Remove duplicate INSERT policy
-- ============================================================================

-- Check which policies exist and remove the signup-specific one
DROP POLICY IF EXISTS "Users can create households during signup" ON households;

-- The "Users can create households" policy should remain

-- ============================================================================
-- user_settings - Remove duplicate INSERT policy
-- ============================================================================

-- The "Users can create own settings during signup" was already replaced in Part 2
-- Make sure we only have one INSERT policy

DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;

-- Recreate the single policy that covers both cases
CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- users - Remove duplicate INSERT policy
-- ============================================================================

-- We have both "Users can insert own record" and "Users can insert own record during signup"
-- Both were optimized in Part 2, now remove the duplicate

-- Keep only one policy (they're identical after optimization)
-- The first one is sufficient
DROP POLICY IF EXISTS "Users can insert own record during signup" ON users;

-- Verify the remaining policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users'
    AND policyname = 'Users can insert own record'
  ) THEN
    -- Recreate if somehow missing
    CREATE POLICY "Users can insert own record"
      ON users FOR INSERT
      TO authenticated
      WITH CHECK (id = (SELECT auth.uid()));
  END IF;
END $$;
