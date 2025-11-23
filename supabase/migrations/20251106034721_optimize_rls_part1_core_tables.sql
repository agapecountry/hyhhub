/*
  # Optimize RLS Policies for Scale - Part 1: Core Tables

  ## Changes Made
  
  Wrap all `auth.uid()` calls in `(SELECT auth.uid())` to prevent re-evaluation per row.
  This caches the authentication result and significantly improves query performance at scale.
  
  ### Tables Updated
  - user_settings
  - accounts
  - notifications
  - categories
  - budgets
  - transactions
  
  ## Performance Impact
  Before: auth.uid() called once per row
  After: auth.uid() called once per query
  
  At 1000 rows, this is 1000x fewer auth calls.
*/

-- USER_SETTINGS
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ACCOUNTS
DROP POLICY IF EXISTS "Members can view accounts based on role" ON accounts;
CREATE POLICY "Members can view accounts based on role"
  ON accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent', 'teen')
    )
    OR EXISTS (
      SELECT 1 FROM account_view_permissions
      WHERE account_view_permissions.account_id = accounts.id
      AND account_view_permissions.member_id IN (
        SELECT id FROM household_members
        WHERE household_id = accounts.household_id
        AND user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Admins and co-parents can insert accounts" ON accounts;
CREATE POLICY "Admins and co-parents can insert accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

DROP POLICY IF EXISTS "Admins and co-parents can update accounts" ON accounts;
CREATE POLICY "Admins and co-parents can update accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

DROP POLICY IF EXISTS "Admins can delete accounts" ON accounts;
CREATE POLICY "Admins can delete accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert notifications to household members" ON notifications;
CREATE POLICY "Users can insert notifications to household members"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm1
      JOIN household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.user_id = notifications.user_id
      AND hm2.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- CATEGORIES
DROP POLICY IF EXISTS "Household members can view categories" ON categories;
CREATE POLICY "Household members can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert categories" ON categories;
CREATE POLICY "Household members can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update categories" ON categories;
CREATE POLICY "Household members can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete categories" ON categories;
CREATE POLICY "Household members can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- BUDGETS
DROP POLICY IF EXISTS "Household members can view budgets" ON budgets;
CREATE POLICY "Household members can view budgets"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budgets.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert budgets" ON budgets;
CREATE POLICY "Household members can insert budgets"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budgets.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update budgets" ON budgets;
CREATE POLICY "Household members can update budgets"
  ON budgets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budgets.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete budgets" ON budgets;
CREATE POLICY "Household members can delete budgets"
  ON budgets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budgets.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- TRANSACTIONS
DROP POLICY IF EXISTS "Household members can view transactions" ON transactions;
CREATE POLICY "Household members can view transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert transactions" ON transactions;
CREATE POLICY "Household members can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update transactions" ON transactions;
CREATE POLICY "Household members can update transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete transactions" ON transactions;
CREATE POLICY "Household members can delete transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );
