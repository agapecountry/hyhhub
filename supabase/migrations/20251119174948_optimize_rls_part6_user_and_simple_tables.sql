/*
  # Optimize RLS Policies - Part 6: User Preferences and Simple Tables
  
  Tables optimized:
  - rewards, reward_redemptions
  - user_settings, user_dashboard_preferences, user_navigation_preferences
  - paycheck_settings
  - income_sources
  - journal_entries
  - users
  - member_permissions
*/

-- REWARDS
DROP POLICY IF EXISTS "Household members can view rewards" ON rewards;
DROP POLICY IF EXISTS "Household members can create rewards" ON rewards;
DROP POLICY IF EXISTS "Household members can update rewards" ON rewards;
DROP POLICY IF EXISTS "Household members can delete rewards" ON rewards;

CREATE POLICY "Household members can view rewards" ON rewards FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = rewards.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can create rewards" ON rewards FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = rewards.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can update rewards" ON rewards FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = rewards.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can delete rewards" ON rewards FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = rewards.household_id AND household_members.user_id = (SELECT auth.uid())));

-- REWARD_REDEMPTIONS
DROP POLICY IF EXISTS "Household members can view reward redemptions" ON reward_redemptions;
DROP POLICY IF EXISTS "Household members can create reward redemptions" ON reward_redemptions;
DROP POLICY IF EXISTS "Household members can update reward redemptions" ON reward_redemptions;

CREATE POLICY "Household members can view reward redemptions" ON reward_redemptions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM rewards JOIN household_members ON household_members.household_id = rewards.household_id WHERE rewards.id = reward_redemptions.reward_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can create reward redemptions" ON reward_redemptions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM rewards JOIN household_members ON household_members.household_id = rewards.household_id WHERE rewards.id = reward_redemptions.reward_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can update reward redemptions" ON reward_redemptions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM rewards JOIN household_members ON household_members.household_id = rewards.household_id WHERE rewards.id = reward_redemptions.reward_id AND household_members.user_id = (SELECT auth.uid())));

-- USER_SETTINGS
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));

-- USER_DASHBOARD_PREFERENCES
DROP POLICY IF EXISTS "Users can view own dashboard preferences" ON user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can insert own dashboard preferences" ON user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can update own dashboard preferences" ON user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can delete own dashboard preferences" ON user_dashboard_preferences;

CREATE POLICY "Users can view own dashboard preferences" ON user_dashboard_preferences FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can insert own dashboard preferences" ON user_dashboard_preferences FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can update own dashboard preferences" ON user_dashboard_preferences FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can delete own dashboard preferences" ON user_dashboard_preferences FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- USER_NAVIGATION_PREFERENCES
DROP POLICY IF EXISTS "Users can view own navigation preferences" ON user_navigation_preferences;
DROP POLICY IF EXISTS "Users can insert own navigation preferences" ON user_navigation_preferences;
DROP POLICY IF EXISTS "Users can update own navigation preferences" ON user_navigation_preferences;
DROP POLICY IF EXISTS "Users can delete own navigation preferences" ON user_navigation_preferences;

CREATE POLICY "Users can view own navigation preferences" ON user_navigation_preferences FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can insert own navigation preferences" ON user_navigation_preferences FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can update own navigation preferences" ON user_navigation_preferences FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can delete own navigation preferences" ON user_navigation_preferences FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- PAYCHECK_SETTINGS
DROP POLICY IF EXISTS "Household members can view paycheck settings" ON paycheck_settings;
DROP POLICY IF EXISTS "Household members can insert paycheck settings" ON paycheck_settings;
DROP POLICY IF EXISTS "Household members can update paycheck settings" ON paycheck_settings;
DROP POLICY IF EXISTS "Household members can delete paycheck settings" ON paycheck_settings;

CREATE POLICY "Household members can view paycheck settings" ON paycheck_settings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = paycheck_settings.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can insert paycheck settings" ON paycheck_settings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = paycheck_settings.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can update paycheck settings" ON paycheck_settings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = paycheck_settings.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can delete paycheck settings" ON paycheck_settings FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = paycheck_settings.household_id AND household_members.user_id = (SELECT auth.uid())));

-- INCOME_SOURCES
DROP POLICY IF EXISTS "Household members can view income sources" ON income_sources;
DROP POLICY IF EXISTS "Household members can insert income sources" ON income_sources;
DROP POLICY IF EXISTS "Household members can update income sources" ON income_sources;
DROP POLICY IF EXISTS "Household members can delete income sources" ON income_sources;

CREATE POLICY "Household members can view income sources" ON income_sources FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = income_sources.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can insert income sources" ON income_sources FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = income_sources.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can update income sources" ON income_sources FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = income_sources.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can delete income sources" ON income_sources FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = income_sources.household_id AND household_members.user_id = (SELECT auth.uid())));

-- JOURNAL_ENTRIES
DROP POLICY IF EXISTS "Users can view own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can create own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update own journal entries" ON journal_entries;

CREATE POLICY "Users can view own journal entries" ON journal_entries FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can create own journal entries" ON journal_entries FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can update own journal entries" ON journal_entries FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));

-- USERS
DROP POLICY IF EXISTS "Users can view own user record" ON users;
DROP POLICY IF EXISTS "Users can insert own user record" ON users;
DROP POLICY IF EXISTS "Users can update own user record" ON users;

CREATE POLICY "Users can view own user record" ON users FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY "Users can insert own user record" ON users FOR INSERT TO authenticated WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "Users can update own user record" ON users FOR UPDATE TO authenticated USING (id = (SELECT auth.uid()));

-- MEMBER_PERMISSIONS
DROP POLICY IF EXISTS "Household members can view member permissions" ON member_permissions;
DROP POLICY IF EXISTS "Admins can create member permissions" ON member_permissions;
DROP POLICY IF EXISTS "Admins can update member permissions" ON member_permissions;
DROP POLICY IF EXISTS "Admins can delete member permissions" ON member_permissions;

CREATE POLICY "Household members can view member permissions" ON member_permissions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = member_permissions.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Admins can create member permissions" ON member_permissions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = member_permissions.household_id AND household_members.user_id = (SELECT auth.uid()) AND household_members.role = 'admin'));
CREATE POLICY "Admins can update member permissions" ON member_permissions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = member_permissions.household_id AND household_members.user_id = (SELECT auth.uid()) AND household_members.role = 'admin'));
CREATE POLICY "Admins can delete member permissions" ON member_permissions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = member_permissions.household_id AND household_members.user_id = (SELECT auth.uid()) AND household_members.role = 'admin'));