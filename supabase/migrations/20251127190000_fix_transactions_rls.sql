/*
  # Fix Transactions and Accounts RLS Policies
  
  The existing RLS policies for transactions and accounts may not work properly with the subquery.
  This migration updates them to use a more efficient pattern.
*/

-- Drop all existing transaction policies (multiple names from different migrations)
-- SELECT policies
DROP POLICY IF EXISTS "Members can view transactions" ON transactions;
DROP POLICY IF EXISTS "Household members can view transactions" ON transactions;

-- INSERT policies
DROP POLICY IF EXISTS "Admins and co-parents can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Members can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Members can insert manual transactions" ON transactions;
DROP POLICY IF EXISTS "Household members can insert transactions" ON transactions;

-- UPDATE policies
DROP POLICY IF EXISTS "Admins and co-parents can update manual transactions" ON transactions;
DROP POLICY IF EXISTS "Members can update transactions" ON transactions;
DROP POLICY IF EXISTS "Members can update manual transactions" ON transactions;
DROP POLICY IF EXISTS "Household members can update transactions" ON transactions;

-- DELETE policies
DROP POLICY IF EXISTS "Admins and co-parents can delete manual transactions" ON transactions;
DROP POLICY IF EXISTS "Members can delete transactions" ON transactions;
DROP POLICY IF EXISTS "Members can delete manual transactions" ON transactions;
DROP POLICY IF EXISTS "Household members can delete transactions" ON transactions;

-- ============================================================================
-- RECREATE TRANSACTION POLICIES
-- ============================================================================

-- SELECT policy - all household members can view transactions
CREATE POLICY "Members can view transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    (
      SELECT EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = transactions.household_id
        AND household_members.user_id = (SELECT auth.uid())
        AND household_members.role IN ('admin', 'co_parent', 'teen')
      )
    )
  );

-- INSERT policy - all household members can insert manual transactions
-- Recreate insert policy with optimized check
-- Allow admins, co-parents, and teens to insert manual transactions
CREATE POLICY "Members can insert manual transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    plaid_transaction_id IS NULL
    AND (
      SELECT EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = transactions.household_id
        AND household_members.user_id = (SELECT auth.uid())
        AND household_members.role IN ('admin', 'co_parent', 'teen')
      )
    )
  );

-- Recreate update policy (only admins and co-parents, not teens)
CREATE POLICY "Members can update manual transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    plaid_transaction_id IS NULL
    AND (
      SELECT EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = transactions.household_id
        AND household_members.user_id = (SELECT auth.uid())
        AND household_members.role IN ('admin', 'co_parent')
      )
    )
  )
  WITH CHECK (
    plaid_transaction_id IS NULL
    AND (
      SELECT EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = transactions.household_id
        AND household_members.user_id = (SELECT auth.uid())
        AND household_members.role IN ('admin', 'co_parent')
      )
    )
  );

-- Recreate delete policy (only admins and co-parents, not teens)
CREATE POLICY "Members can delete manual transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (
    plaid_transaction_id IS NULL
    AND (
      SELECT EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = transactions.household_id
        AND household_members.user_id = (SELECT auth.uid())
        AND household_members.role IN ('admin', 'co_parent')
      )
    )
  );

-- ============================================================================
-- ACCOUNTS TABLE RLS FIX
-- ============================================================================

-- Fix accounts SELECT policy to use same pattern
DROP POLICY IF EXISTS "Members can view accounts based on role" ON accounts;

CREATE POLICY "Members can view accounts based on role"
  ON accounts FOR SELECT
  TO authenticated
  USING (
    (
      SELECT EXISTS (
        SELECT 1 FROM household_members
        WHERE household_members.household_id = accounts.household_id
        AND household_members.user_id = (SELECT auth.uid())
        AND household_members.role IN ('admin', 'co_parent', 'teen')
      )
    )
  );
