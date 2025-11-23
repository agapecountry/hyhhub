/*
  # Optimize RLS Policies - Part 1: Influencer and Projects

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Significantly improves query performance at scale
  
  2. Tables Updated
    - influencer_codes
    - influencer_signups
    - influencer_payouts
    - savings_projects
    - project_accounts
    - project_transactions
*/

-- Influencer Codes
DROP POLICY IF EXISTS "Influencers can view own codes" ON influencer_codes;
CREATE POLICY "Influencers can view own codes"
  ON influencer_codes FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own influencer codes" ON influencer_codes;
CREATE POLICY "Users can create own influencer codes"
  ON influencer_codes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Influencers can update own codes" ON influencer_codes;
CREATE POLICY "Influencers can update own codes"
  ON influencer_codes FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Influencers can delete own codes" ON influencer_codes;
CREATE POLICY "Influencers can delete own codes"
  ON influencer_codes FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Influencer Signups
DROP POLICY IF EXISTS "Influencers can view own signups" ON influencer_signups;
CREATE POLICY "Influencers can view own signups"
  ON influencer_signups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM influencer_codes
      WHERE influencer_codes.id = influencer_signups.influencer_code_id
      AND influencer_codes.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own signup record" ON influencer_signups;
CREATE POLICY "Users can view own signup record"
  ON influencer_signups FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System can update signups" ON influencer_signups;
CREATE POLICY "System can update signups"
  ON influencer_signups FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Influencer Payouts
DROP POLICY IF EXISTS "Influencers can view own payouts" ON influencer_payouts;
CREATE POLICY "Influencers can view own payouts"
  ON influencer_payouts FOR SELECT
  TO authenticated
  USING (influencer_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System can update payouts" ON influencer_payouts;
CREATE POLICY "System can update payouts"
  ON influencer_payouts FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Savings Projects
DROP POLICY IF EXISTS "Household members can view projects" ON savings_projects;
CREATE POLICY "Household members can view projects"
  ON savings_projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = savings_projects.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can create projects" ON savings_projects;
CREATE POLICY "Household members can create projects"
  ON savings_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = savings_projects.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update projects" ON savings_projects;
CREATE POLICY "Household members can update projects"
  ON savings_projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = savings_projects.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = savings_projects.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete projects" ON savings_projects;
CREATE POLICY "Household members can delete projects"
  ON savings_projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = savings_projects.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- Project Accounts
DROP POLICY IF EXISTS "Members can view project accounts" ON project_accounts;
CREATE POLICY "Members can view project accounts"
  ON project_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM savings_projects sp
      JOIN household_members hm ON hm.household_id = sp.household_id
      WHERE sp.id = project_accounts.project_id
      AND hm.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can create project accounts" ON project_accounts;
CREATE POLICY "Members can create project accounts"
  ON project_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM savings_projects sp
      JOIN household_members hm ON hm.household_id = sp.household_id
      WHERE sp.id = project_accounts.project_id
      AND hm.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can delete project accounts" ON project_accounts;
CREATE POLICY "Members can delete project accounts"
  ON project_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM savings_projects sp
      JOIN household_members hm ON hm.household_id = sp.household_id
      WHERE sp.id = project_accounts.project_id
      AND hm.user_id = (SELECT auth.uid())
    )
  );

-- Project Transactions
DROP POLICY IF EXISTS "Members can view project transactions" ON project_transactions;
CREATE POLICY "Members can view project transactions"
  ON project_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM savings_projects sp
      JOIN household_members hm ON hm.household_id = sp.household_id
      WHERE sp.id = project_transactions.project_id
      AND hm.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can create project transactions" ON project_transactions;
CREATE POLICY "Members can create project transactions"
  ON project_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM savings_projects sp
      JOIN household_members hm ON hm.household_id = sp.household_id
      WHERE sp.id = project_transactions.project_id
      AND hm.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can update project transactions" ON project_transactions;
CREATE POLICY "Members can update project transactions"
  ON project_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM savings_projects sp
      JOIN household_members hm ON hm.household_id = sp.household_id
      WHERE sp.id = project_transactions.project_id
      AND hm.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM savings_projects sp
      JOIN household_members hm ON hm.household_id = sp.household_id
      WHERE sp.id = project_transactions.project_id
      AND hm.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can delete project transactions" ON project_transactions;
CREATE POLICY "Members can delete project transactions"
  ON project_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM savings_projects sp
      JOIN household_members hm ON hm.household_id = sp.household_id
      WHERE sp.id = project_transactions.project_id
      AND hm.user_id = (SELECT auth.uid())
    )
  );