/*
  # Optimize RLS Policies - Part 1: Core Household Tables
  
  Optimize auth.uid() calls in RLS policies by wrapping in (SELECT auth.uid())
  This prevents re-evaluation for each row, improving query performance.
  
  Tables optimized:
  - budgets
  - budget_categories  
  - categories
  - chores
  - chore_assignments
*/

-- BUDGETS
DROP POLICY IF EXISTS "Household members can view budgets" ON budgets;
DROP POLICY IF EXISTS "Household members can insert budgets" ON budgets;
DROP POLICY IF EXISTS "Household members can update budgets" ON budgets;
DROP POLICY IF EXISTS "Household members can delete budgets" ON budgets;

CREATE POLICY "Household members can view budgets" ON budgets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budgets.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can insert budgets" ON budgets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budgets.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can update budgets" ON budgets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budgets.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete budgets" ON budgets FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budgets.household_id AND household_members.user_id = (SELECT auth.uid())));

-- BUDGET_CATEGORIES
DROP POLICY IF EXISTS "Household members can view budget categories" ON budget_categories;
DROP POLICY IF EXISTS "Household members can create budget categories" ON budget_categories;
DROP POLICY IF EXISTS "Household members can update budget categories" ON budget_categories;
DROP POLICY IF EXISTS "Household members can delete budget categories" ON budget_categories;

CREATE POLICY "Household members can view budget categories" ON budget_categories FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budget_categories.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can create budget categories" ON budget_categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budget_categories.household_id AND household_members.user_id = (SELECT auth.uid()) AND household_members.role = ANY (ARRAY['admin'::text, 'co_parent'::text])));

CREATE POLICY "Household members can update budget categories" ON budget_categories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budget_categories.household_id AND household_members.user_id = (SELECT auth.uid()) AND household_members.role = ANY (ARRAY['admin'::text, 'co_parent'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budget_categories.household_id AND household_members.user_id = (SELECT auth.uid()) AND household_members.role = ANY (ARRAY['admin'::text, 'co_parent'::text])));

CREATE POLICY "Household members can delete budget categories" ON budget_categories FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budget_categories.household_id AND household_members.user_id = (SELECT auth.uid()) AND household_members.role = ANY (ARRAY['admin'::text, 'co_parent'::text])));

-- CATEGORIES  
DROP POLICY IF EXISTS "Household members can view categories" ON categories;
DROP POLICY IF EXISTS "Household members can insert categories" ON categories;
DROP POLICY IF EXISTS "Household members can update categories" ON categories;
DROP POLICY IF EXISTS "Household members can delete categories" ON categories;

CREATE POLICY "Household members can view categories" ON categories FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = categories.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can insert categories" ON categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = categories.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can update categories" ON categories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = categories.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete categories" ON categories FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = categories.household_id AND household_members.user_id = (SELECT auth.uid())));

-- CHORES
DROP POLICY IF EXISTS "Household members can view chores" ON chores;
DROP POLICY IF EXISTS "Household members can insert chores" ON chores;
DROP POLICY IF EXISTS "Household members can update chores" ON chores;
DROP POLICY IF EXISTS "Household members can delete chores" ON chores;

CREATE POLICY "Household members can view chores" ON chores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chores.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can insert chores" ON chores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chores.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can update chores" ON chores FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chores.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete chores" ON chores FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chores.household_id AND household_members.user_id = (SELECT auth.uid())));

-- CHORE_ASSIGNMENTS
DROP POLICY IF EXISTS "Members can view chore assignments based on role" ON chore_assignments;
DROP POLICY IF EXISTS "Household members can insert chore_assignments" ON chore_assignments;
DROP POLICY IF EXISTS "Members can update chore assignments based on role" ON chore_assignments;
DROP POLICY IF EXISTS "Household members can delete chore_assignments" ON chore_assignments;

CREATE POLICY "Members can view chore assignments based on role" ON chore_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM chores JOIN household_members ON household_members.household_id = chores.household_id WHERE chores.id = chore_assignments.chore_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can insert chore_assignments" ON chore_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM chores JOIN household_members ON household_members.household_id = chores.household_id WHERE chores.id = chore_assignments.chore_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Members can update chore assignments based on role" ON chore_assignments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM chores JOIN household_members ON household_members.household_id = chores.household_id WHERE chores.id = chore_assignments.chore_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete chore_assignments" ON chore_assignments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM chores JOIN household_members ON household_members.household_id = chores.household_id WHERE chores.id = chore_assignments.chore_id AND household_members.user_id = (SELECT auth.uid())));