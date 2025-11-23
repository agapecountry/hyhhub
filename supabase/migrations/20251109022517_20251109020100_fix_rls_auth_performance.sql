/*
  # Fix RLS Auth Performance Issues

  1. Purpose
    - Replace auth.uid() with (SELECT auth.uid()) in RLS policies
    - Prevents re-evaluation of auth function for each row
    - Significantly improves query performance at scale

  2. Changes
    - Drops and recreates policies with optimized auth checks
    - Applies to: user_dashboard_preferences, transaction_categories, payees,
      recurring_transactions, transactions, pantry_locations, accounts
*/

-- user_dashboard_preferences policies
DROP POLICY IF EXISTS "Users can view their own dashboard preferences" ON public.user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can insert their own dashboard preferences" ON public.user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can update their own dashboard preferences" ON public.user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can delete their own dashboard preferences" ON public.user_dashboard_preferences;

CREATE POLICY "Users can view their own dashboard preferences"
  ON public.user_dashboard_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own dashboard preferences"
  ON public.user_dashboard_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own dashboard preferences"
  ON public.user_dashboard_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own dashboard preferences"
  ON public.user_dashboard_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- transaction_categories policies
DROP POLICY IF EXISTS "Members can view transaction categories" ON public.transaction_categories;
DROP POLICY IF EXISTS "Admins and co-parents can create categories" ON public.transaction_categories;
DROP POLICY IF EXISTS "Admins and co-parents can update categories" ON public.transaction_categories;
DROP POLICY IF EXISTS "Admins and co-parents can delete categories" ON public.transaction_categories;

CREATE POLICY "Members can view transaction categories"
  ON public.transaction_categories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transaction_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins and co-parents can create categories"
  ON public.transaction_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transaction_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Admins and co-parents can update categories"
  ON public.transaction_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transaction_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Admins and co-parents can delete categories"
  ON public.transaction_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transaction_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co-parent')
    )
  );

-- payees policies
DROP POLICY IF EXISTS "Users can view household payees" ON public.payees;
DROP POLICY IF EXISTS "Users can create payees in their household" ON public.payees;
DROP POLICY IF EXISTS "Users can update household payees" ON public.payees;
DROP POLICY IF EXISTS "Users can delete household payees" ON public.payees;

CREATE POLICY "Users can view household payees"
  ON public.payees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payees.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create payees in their household"
  ON public.payees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payees.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update household payees"
  ON public.payees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payees.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete household payees"
  ON public.payees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payees.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- recurring_transactions policies
DROP POLICY IF EXISTS "Users can view household recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can create recurring transactions in their household" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can update household recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can delete household recurring transactions" ON public.recurring_transactions;

CREATE POLICY "Users can view household recurring transactions"
  ON public.recurring_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recurring_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create recurring transactions in their household"
  ON public.recurring_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recurring_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update household recurring transactions"
  ON public.recurring_transactions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recurring_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete household recurring transactions"
  ON public.recurring_transactions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recurring_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- transactions policies (keep existing ones, just update auth)
DROP POLICY IF EXISTS "Members can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins and co-parents can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins and co-parents can update manual transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins and co-parents can delete manual transactions" ON public.transactions;

CREATE POLICY "Members can view transactions"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts a
      JOIN household_members hm ON hm.household_id = a.household_id
      WHERE a.id = transactions.account_id
      AND hm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins and co-parents can insert transactions"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts a
      JOIN household_members hm ON hm.household_id = a.household_id
      WHERE a.id = transactions.account_id
      AND hm.user_id = (SELECT auth.uid())
      AND hm.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Admins and co-parents can update manual transactions"
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (
    plaid_transaction_id IS NULL
    AND EXISTS (
      SELECT 1 FROM accounts a
      JOIN household_members hm ON hm.household_id = a.household_id
      WHERE a.id = transactions.account_id
      AND hm.user_id = (SELECT auth.uid())
      AND hm.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Admins and co-parents can delete manual transactions"
  ON public.transactions
  FOR DELETE
  TO authenticated
  USING (
    plaid_transaction_id IS NULL
    AND EXISTS (
      SELECT 1 FROM accounts a
      JOIN household_members hm ON hm.household_id = a.household_id
      WHERE a.id = transactions.account_id
      AND hm.user_id = (SELECT auth.uid())
      AND hm.role IN ('admin', 'co-parent')
    )
  );

-- pantry_locations policies
DROP POLICY IF EXISTS "Household members can view pantry_locations" ON public.pantry_locations;
DROP POLICY IF EXISTS "Household members can insert pantry_locations" ON public.pantry_locations;
DROP POLICY IF EXISTS "Household members can update pantry_locations" ON public.pantry_locations;
DROP POLICY IF EXISTS "Household members can delete pantry_locations" ON public.pantry_locations;

CREATE POLICY "Household members can view pantry_locations"
  ON public.pantry_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_locations.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Household members can insert pantry_locations"
  ON public.pantry_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_locations.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Household members can update pantry_locations"
  ON public.pantry_locations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_locations.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Household members can delete pantry_locations"
  ON public.pantry_locations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_locations.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- accounts policy (just this one)
DROP POLICY IF EXISTS "Members can view accounts based on role" ON public.accounts;

CREATE POLICY "Members can view accounts based on role"
  ON public.accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = accounts.household_id
      AND hm.user_id = (SELECT auth.uid())
      AND hm.role IN ('admin', 'co-parent', 'teen')
    )
  );