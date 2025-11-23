/*
  # Optimize RLS Policies for Scale - Part 5: Debt, Plaid & Subscriptions

  ## Tables Updated
  - debts
  - debt_payments
  - plaid_items
  - plaid_accounts
  - plaid_transactions
  - household_subscriptions
  - plaid_connections
*/

-- DEBTS
DROP POLICY IF EXISTS "Household members can view debts" ON debts;
CREATE POLICY "Household members can view debts"
  ON debts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert debts" ON debts;
CREATE POLICY "Household members can insert debts"
  ON debts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update debts" ON debts;
CREATE POLICY "Household members can update debts"
  ON debts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete debts" ON debts;
CREATE POLICY "Household members can delete debts"
  ON debts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- DEBT_PAYMENTS
DROP POLICY IF EXISTS "Household members can view payments" ON debt_payments;
CREATE POLICY "Household members can view payments"
  ON debt_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM debts
      JOIN household_members ON household_members.household_id = debts.household_id
      WHERE debts.id = debt_payments.debt_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert payments" ON debt_payments;
CREATE POLICY "Household members can insert payments"
  ON debt_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM debts
      JOIN household_members ON household_members.household_id = debts.household_id
      WHERE debts.id = debt_payments.debt_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update payments" ON debt_payments;
CREATE POLICY "Household members can update payments"
  ON debt_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM debts
      JOIN household_members ON household_members.household_id = debts.household_id
      WHERE debts.id = debt_payments.debt_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete payments" ON debt_payments;
CREATE POLICY "Household members can delete payments"
  ON debt_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM debts
      JOIN household_members ON household_members.household_id = debts.household_id
      WHERE debts.id = debt_payments.debt_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- PLAID_ITEMS
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
CREATE POLICY "Household members can delete items"
  ON plaid_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- PLAID_ACCOUNTS
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

-- PLAID_TRANSACTIONS
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

-- HOUSEHOLD_SUBSCRIPTIONS
DROP POLICY IF EXISTS "Household members can view their subscription" ON household_subscriptions;
CREATE POLICY "Household members can view their subscription"
  ON household_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household admins can insert subscriptions" ON household_subscriptions;
CREATE POLICY "Household admins can insert subscriptions"
  ON household_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Household admins can update subscriptions" ON household_subscriptions;
CREATE POLICY "Household admins can update subscriptions"
  ON household_subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

-- PLAID_CONNECTIONS
DROP POLICY IF EXISTS "Household members can view their Plaid connections" ON plaid_connections;
CREATE POLICY "Household members can view their Plaid connections"
  ON plaid_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household admins can manage Plaid connections" ON plaid_connections;
CREATE POLICY "Household admins can manage Plaid connections"
  ON plaid_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Household admins can update Plaid connections" ON plaid_connections;
CREATE POLICY "Household admins can update Plaid connections"
  ON plaid_connections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Household admins can delete Plaid connections" ON plaid_connections;
CREATE POLICY "Household admins can delete Plaid connections"
  ON plaid_connections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );
