/*
  # Fix Security Issues - Part 2: RLS Performance Optimization

  1. Problem
    - Many RLS policies call auth.uid() or auth.jwt() directly
    - This re-evaluates the function for each row (bad performance)
    - Should use (SELECT auth.uid()) to evaluate once per query

  2. Solution
    - Replace auth.uid() with (SELECT auth.uid())
    - Replace auth.jwt() with (SELECT auth.jwt())
    - Maintains same security while improving performance

  3. Tables Fixed
    - paycheck_settings (4 policies)
    - household_members (2 policies)
    - user_settings (1 policy)
    - budget_categories (4 policies)
    - users (2 policies)
    - user_navigation_preferences (4 policies)
    - bills (4 policies)
*/

-- ============================================================================
-- paycheck_settings
-- ============================================================================

DROP POLICY IF EXISTS "Users can view paycheck settings for their household" ON paycheck_settings;
CREATE POLICY "Users can view paycheck settings for their household"
  ON paycheck_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = paycheck_settings.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert paycheck settings for their household" ON paycheck_settings;
CREATE POLICY "Users can insert paycheck settings for their household"
  ON paycheck_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = paycheck_settings.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update paycheck settings for their household" ON paycheck_settings;
CREATE POLICY "Users can update paycheck settings for their household"
  ON paycheck_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = paycheck_settings.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = paycheck_settings.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete paycheck settings for their household" ON paycheck_settings;
CREATE POLICY "Users can delete paycheck settings for their household"
  ON paycheck_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = paycheck_settings.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- household_members
-- ============================================================================

DROP POLICY IF EXISTS "Users can add self as member during signup" ON household_members;
CREATE POLICY "Users can add self as member during signup"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert household members" ON household_members;
CREATE POLICY "Users can insert household members"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members existing
      WHERE existing.household_id = household_members.household_id
      AND existing.user_id = (SELECT auth.uid())
      AND existing.role IN ('admin', 'co_parent')
    )
  );

-- ============================================================================
-- user_settings
-- ============================================================================

DROP POLICY IF EXISTS "Users can create own settings during signup" ON user_settings;
CREATE POLICY "Users can create own settings during signup"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- budget_categories
-- ============================================================================

DROP POLICY IF EXISTS "Household members can view budget categories" ON budget_categories;
CREATE POLICY "Household members can view budget categories"
  ON budget_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budget_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can create budget categories" ON budget_categories;
CREATE POLICY "Household members can create budget categories"
  ON budget_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budget_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

DROP POLICY IF EXISTS "Household members can update budget categories" ON budget_categories;
CREATE POLICY "Household members can update budget categories"
  ON budget_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budget_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budget_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

DROP POLICY IF EXISTS "Household members can delete budget categories" ON budget_categories;
CREATE POLICY "Household members can delete budget categories"
  ON budget_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budget_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

-- ============================================================================
-- users
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own record" ON users;
CREATE POLICY "Users can insert own record"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own record during signup" ON users;
CREATE POLICY "Users can insert own record during signup"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- user_navigation_preferences
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own navigation preferences" ON user_navigation_preferences;
CREATE POLICY "Users can view own navigation preferences"
  ON user_navigation_preferences FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own navigation preferences" ON user_navigation_preferences;
CREATE POLICY "Users can insert own navigation preferences"
  ON user_navigation_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own navigation preferences" ON user_navigation_preferences;
CREATE POLICY "Users can update own navigation preferences"
  ON user_navigation_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own navigation preferences" ON user_navigation_preferences;
CREATE POLICY "Users can delete own navigation preferences"
  ON user_navigation_preferences FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- bills
-- ============================================================================

DROP POLICY IF EXISTS "Household members can view bills" ON bills;
CREATE POLICY "Household members can view bills"
  ON bills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = bills.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can create bills" ON bills;
CREATE POLICY "Household members can create bills"
  ON bills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = bills.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update bills" ON bills;
CREATE POLICY "Household members can update bills"
  ON bills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = bills.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = bills.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete bills" ON bills;
CREATE POLICY "Household members can delete bills"
  ON bills FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = bills.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );