/*
  # Optimize Bill Payments RLS Policies

  1. Problem
    - RLS policies re-evaluate auth.uid() for each row
    - This causes suboptimal query performance at scale
    
  2. Solution
    - Replace auth.uid() with (SELECT auth.uid()) in subqueries
    - This ensures auth.uid() is evaluated once, not per row
    
  3. Policies Fixed
    - Users can view bill payments in their household
    - Users can create bill payments in their household
    - Users can update bill payments in their household
    - Users can delete bill payments in their household
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view bill payments in their household" ON bill_payments;
DROP POLICY IF EXISTS "Users can create bill payments in their household" ON bill_payments;
DROP POLICY IF EXISTS "Users can update bill payments in their household" ON bill_payments;
DROP POLICY IF EXISTS "Users can delete bill payments in their household" ON bill_payments;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Users can view bill payments in their household"
  ON bill_payments
  FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_members.household_id
      FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create bill payments in their household"
  ON bill_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_members.household_id
      FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update bill payments in their household"
  ON bill_payments
  FOR UPDATE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_members.household_id
      FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete bill payments in their household"
  ON bill_payments
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
COMMENT ON POLICY "Users can view bill payments in their household" ON bill_payments IS 
'Optimized: auth.uid() evaluated once per query, not per row';
COMMENT ON POLICY "Users can create bill payments in their household" ON bill_payments IS 
'Optimized: auth.uid() evaluated once per query, not per row';
COMMENT ON POLICY "Users can update bill payments in their household" ON bill_payments IS 
'Optimized: auth.uid() evaluated once per query, not per row';
COMMENT ON POLICY "Users can delete bill payments in their household" ON bill_payments IS 
'Optimized: auth.uid() evaluated once per query, not per row';