/*
  # Optimize RLS Policies - Part 3: Transaction Tables
  
  Tables optimized:
  - transactions
  - transaction_categories
  - recurring_transactions
  - bills
  - payees
*/

-- TRANSACTIONS
DROP POLICY IF EXISTS "Members can view transactions" ON transactions;
DROP POLICY IF EXISTS "Members can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Members can update transactions" ON transactions;
DROP POLICY IF EXISTS "Members can delete transactions" ON transactions;

CREATE POLICY "Members can view transactions" ON transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM accounts a JOIN household_members hm ON hm.household_id = a.household_id WHERE a.id = transactions.account_id AND hm.user_id = (SELECT auth.uid())));

CREATE POLICY "Members can insert transactions" ON transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM accounts a JOIN household_members hm ON hm.household_id = a.household_id WHERE a.id = transactions.account_id AND hm.user_id = (SELECT auth.uid()) AND hm.role = ANY (ARRAY['admin'::text, 'co-parent'::text])));

CREATE POLICY "Members can update transactions" ON transactions FOR UPDATE TO authenticated
  USING (plaid_transaction_id IS NULL AND EXISTS (SELECT 1 FROM accounts a JOIN household_members hm ON hm.household_id = a.household_id WHERE a.id = transactions.account_id AND hm.user_id = (SELECT auth.uid()) AND hm.role = ANY (ARRAY['admin'::text, 'co-parent'::text])));

CREATE POLICY "Members can delete transactions" ON transactions FOR DELETE TO authenticated
  USING (plaid_transaction_id IS NULL AND EXISTS (SELECT 1 FROM accounts a JOIN household_members hm ON hm.household_id = a.household_id WHERE a.id = transactions.account_id AND hm.user_id = (SELECT auth.uid()) AND hm.role = ANY (ARRAY['admin'::text, 'co-parent'::text])));

-- TRANSACTION_CATEGORIES
DROP POLICY IF EXISTS "Household members can view transaction categories" ON transaction_categories;
DROP POLICY IF EXISTS "Household members can insert transaction categories" ON transaction_categories;
DROP POLICY IF EXISTS "Household members can update transaction categories" ON transaction_categories;
DROP POLICY IF EXISTS "Household members can delete transaction categories" ON transaction_categories;

CREATE POLICY "Household members can view transaction categories" ON transaction_categories FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = transaction_categories.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can insert transaction categories" ON transaction_categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = transaction_categories.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can update transaction categories" ON transaction_categories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = transaction_categories.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete transaction categories" ON transaction_categories FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = transaction_categories.household_id AND household_members.user_id = (SELECT auth.uid())));

-- RECURRING_TRANSACTIONS
DROP POLICY IF EXISTS "Household members can view recurring transactions" ON recurring_transactions;
DROP POLICY IF EXISTS "Household members can insert recurring transactions" ON recurring_transactions;
DROP POLICY IF EXISTS "Household members can update recurring transactions" ON recurring_transactions;
DROP POLICY IF EXISTS "Household members can delete recurring transactions" ON recurring_transactions;

CREATE POLICY "Household members can view recurring transactions" ON recurring_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = recurring_transactions.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can insert recurring transactions" ON recurring_transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = recurring_transactions.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can update recurring transactions" ON recurring_transactions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = recurring_transactions.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete recurring transactions" ON recurring_transactions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = recurring_transactions.household_id AND household_members.user_id = (SELECT auth.uid())));

-- BILLS
DROP POLICY IF EXISTS "Household members can view bills" ON bills;
DROP POLICY IF EXISTS "Household members can create bills" ON bills;
DROP POLICY IF EXISTS "Household members can update bills" ON bills;
DROP POLICY IF EXISTS "Household members can delete bills" ON bills;

CREATE POLICY "Household members can view bills" ON bills FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = bills.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can create bills" ON bills FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = bills.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can update bills" ON bills FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = bills.household_id AND household_members.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = bills.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete bills" ON bills FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = bills.household_id AND household_members.user_id = (SELECT auth.uid())));

-- PAYEES
DROP POLICY IF EXISTS "Household members can view payees" ON payees;
DROP POLICY IF EXISTS "Household members can create payees" ON payees;
DROP POLICY IF EXISTS "Household members can update payees" ON payees;
DROP POLICY IF EXISTS "Household members can delete payees" ON payees;

CREATE POLICY "Household members can view payees" ON payees FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = payees.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can create payees" ON payees FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = payees.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can update payees" ON payees FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = payees.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete payees" ON payees FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = payees.household_id AND household_members.user_id = (SELECT auth.uid())));