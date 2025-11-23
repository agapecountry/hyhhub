/*
  # Optimize Paycheck Planner Payments RLS Policies

  1. Problem
    - RLS policies re-evaluate auth.uid() for each row
    - This causes suboptimal query performance at scale
    
  2. Solution
    - Replace auth.uid() with (SELECT auth.uid()) in subqueries
    - This ensures auth.uid() is evaluated once, not per row
    
  3. Policies Fixed
    - Household members can view planner payments
    - Household members can create planner payments
    - Household members can update planner payments
    - Household members can delete planner payments
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Household members can view planner payments" ON paycheck_planner_payments;
DROP POLICY IF EXISTS "Household members can create planner payments" ON paycheck_planner_payments;
DROP POLICY IF EXISTS "Household members can update planner payments" ON paycheck_planner_payments;
DROP POLICY IF EXISTS "Household members can delete planner payments" ON paycheck_planner_payments;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Household members can view planner payments"
  ON paycheck_planner_payments
  FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_members.household_id
      FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Household members can create planner payments"
  ON paycheck_planner_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_members.household_id
      FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Household members can update planner payments"
  ON paycheck_planner_payments
  FOR UPDATE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_members.household_id
      FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_members.household_id
      FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Household members can delete planner payments"
  ON paycheck_planner_payments
  FOR DELETE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_members.household_id
      FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
    )
  );

-- Add comments
COMMENT ON POLICY "Household members can view planner payments" ON paycheck_planner_payments IS 
'Optimized: auth.uid() evaluated once per query, not per row';
COMMENT ON POLICY "Household members can create planner payments" ON paycheck_planner_payments IS 
'Optimized: auth.uid() evaluated once per query, not per row';
COMMENT ON POLICY "Household members can update planner payments" ON paycheck_planner_payments IS 
'Optimized: auth.uid() evaluated once per query, not per row';
COMMENT ON POLICY "Household members can delete planner payments" ON paycheck_planner_payments IS 
'Optimized: auth.uid() evaluated once per query, not per row';