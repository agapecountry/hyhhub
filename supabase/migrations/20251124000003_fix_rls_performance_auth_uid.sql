/*
  # Fix RLS Performance Issues - auth.uid() Optimization
  
  1. Problem
    - Many RLS policies call auth.uid() without SELECT wrapper
    - This causes auth.uid() to be re-evaluated for each row
    - Results in poor query performance at scale
    
  2. Solution
    - Wrap all auth.uid() calls with (SELECT auth.uid())
    - This evaluates the function once per query instead of per row
    
  3. Tables Fixed
    - plaid_items
    - plaid_accounts  
    - plaid_transactions
    - journal_entries
    - income_sources
    - manual_paycheck_payments
    - member_permissions (initial)
    - budget_categories (initial)
*/

-- ============================================================================
-- PLAID_ITEMS
-- ============================================================================

DROP POLICY IF EXISTS "Household members can view items (no token)" ON plaid_items;
CREATE POLICY "Household members can view items (no token)"
  ON plaid_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert items" ON plaid_items;
CREATE POLICY "Household members can insert items"
  ON plaid_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update items" ON plaid_items;
CREATE POLICY "Household members can update items"
  ON plaid_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete items" ON plaid_items;
DROP POLICY IF EXISTS "Household members can delete plaid items" ON plaid_items;
CREATE POLICY "Household members can delete plaid items"
  ON plaid_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- PLAID_ACCOUNTS
-- ============================================================================

DROP POLICY IF EXISTS "Household members can view accounts" ON plaid_accounts;
CREATE POLICY "Household members can view accounts"
  ON plaid_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert accounts" ON plaid_accounts;
CREATE POLICY "Household members can insert accounts"
  ON plaid_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update accounts" ON plaid_accounts;
CREATE POLICY "Household members can update accounts"
  ON plaid_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete accounts" ON plaid_accounts;
CREATE POLICY "Household members can delete accounts"
  ON plaid_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- PLAID_TRANSACTIONS
-- ============================================================================

DROP POLICY IF EXISTS "Household members can view transactions" ON plaid_transactions;
CREATE POLICY "Household members can view transactions"
  ON plaid_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert transactions" ON plaid_transactions;
CREATE POLICY "Household members can insert transactions"
  ON plaid_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update transactions" ON plaid_transactions;
CREATE POLICY "Household members can update transactions"
  ON plaid_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete transactions" ON plaid_transactions;
CREATE POLICY "Household members can delete transactions"
  ON plaid_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- JOURNAL_ENTRIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their household journal entries" ON journal_entries;
CREATE POLICY "Users can view their household journal entries"
  ON journal_entries FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create journal entries" ON journal_entries;
CREATE POLICY "Users can create journal entries"
  ON journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own journal entries" ON journal_entries;
CREATE POLICY "Users can update their own journal entries"
  ON journal_entries FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) AND
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid()) AND
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their own journal entries" ON journal_entries;
CREATE POLICY "Users can delete their own journal entries"
  ON journal_entries FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

-- ============================================================================
-- INCOME_SOURCES
-- ============================================================================

DROP POLICY IF EXISTS "Household members can view income sources" ON income_sources;
CREATE POLICY "Household members can view income sources"
  ON income_sources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = income_sources.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert income sources" ON income_sources;
CREATE POLICY "Household members can insert income sources"
  ON income_sources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = income_sources.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update income sources" ON income_sources;
CREATE POLICY "Household members can update income sources"
  ON income_sources FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = income_sources.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = income_sources.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete income sources" ON income_sources;
CREATE POLICY "Household members can delete income sources"
  ON income_sources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = income_sources.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- MANUAL_PAYCHECK_PAYMENTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their household manual payments" ON manual_paycheck_payments;
CREATE POLICY "Users can view their household manual payments"
  ON manual_paycheck_payments FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create manual payments" ON manual_paycheck_payments;
CREATE POLICY "Users can create manual payments"
  ON manual_paycheck_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update manual payments" ON manual_paycheck_payments;
CREATE POLICY "Users can update manual payments"
  ON manual_paycheck_payments FOR UPDATE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete manual payments" ON manual_paycheck_payments;
CREATE POLICY "Users can delete manual payments"
  ON manual_paycheck_payments FOR DELETE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- MEMBER_PERMISSIONS (from initial schema)
-- ============================================================================

DROP POLICY IF EXISTS "Members can view permissions" ON member_permissions;
CREATE POLICY "Members can view permissions"
  ON member_permissions FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage permissions" ON member_permissions;
CREATE POLICY "Admins can manage permissions"
  ON member_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_permissions.household_id
        AND household_members.user_id = (SELECT auth.uid())
        AND household_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_permissions.household_id
        AND household_members.user_id = (SELECT auth.uid())
        AND household_members.role = 'admin'
    )
  );

-- ============================================================================
-- BUDGET_CATEGORIES (from initial schema)
-- ============================================================================

DROP POLICY IF EXISTS "Household members can view budget categories" ON budget_categories;
CREATE POLICY "Household members can view budget categories"
  ON budget_categories FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert budget categories" ON budget_categories;
CREATE POLICY "Household members can insert budget categories"
  ON budget_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update budget categories" ON budget_categories;
CREATE POLICY "Household members can update budget categories"
  ON budget_categories FOR UPDATE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete budget categories" ON budget_categories;
CREATE POLICY "Household members can delete budget categories"
  ON budget_categories FOR DELETE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- HOUSEHOLD_MEMBERS (invite acceptance policy)
-- ============================================================================

DROP POLICY IF EXISTS "Users can join households via invite" ON household_members;
CREATE POLICY "Users can join households via invite"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM household_invites
      WHERE household_invites.household_id = household_members.household_id
    )
  );
