/*
  # Optimize Income Sources RLS Policies

  1. Problem
    - RLS policies re-evaluate auth.uid() for each row
    - Duplicate INSERT policies exist
    - This causes suboptimal query performance at scale
    
  2. Solution
    - Replace auth.uid() with (SELECT auth.uid()) in all policies
    - Remove duplicate policies
    - This ensures auth.uid() is evaluated once, not per row
    
  3. Policies Fixed
    - Household members can view income sources
    - Household members can insert income sources (consolidated duplicates)
    - Household members can update income sources
    - Household members can delete income sources
*/

-- Drop all existing policies (including duplicates)
DROP POLICY IF EXISTS "Household members can view income sources" ON income_sources;
DROP POLICY IF EXISTS "Household members can insert income sources" ON income_sources;
DROP POLICY IF EXISTS "Household members can create income sources" ON income_sources;
DROP POLICY IF EXISTS "Household members can update income sources" ON income_sources;
DROP POLICY IF EXISTS "Household members can delete income sources" ON income_sources;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Household members can view income sources"
  ON income_sources
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members
      WHERE household_members.household_id = income_sources.household_id
        AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Household members can insert income sources"
  ON income_sources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members
      WHERE household_members.household_id = income_sources.household_id
        AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Household members can update income sources"
  ON income_sources
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members
      WHERE household_members.household_id = income_sources.household_id
        AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Household members can delete income sources"
  ON income_sources
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members
      WHERE household_members.household_id = income_sources.household_id
        AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- Add comments
COMMENT ON POLICY "Household members can view income sources" ON income_sources IS 
'Optimized: auth.uid() evaluated once per query, not per row';
COMMENT ON POLICY "Household members can insert income sources" ON income_sources IS 
'Optimized: auth.uid() evaluated once per query, not per row';
COMMENT ON POLICY "Household members can update income sources" ON income_sources IS 
'Optimized: auth.uid() evaluated once per query, not per row';
COMMENT ON POLICY "Household members can delete income sources" ON income_sources IS 
'Optimized: auth.uid() evaluated once per query, not per row';