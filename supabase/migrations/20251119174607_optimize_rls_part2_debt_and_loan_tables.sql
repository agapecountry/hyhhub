/*
  # Optimize RLS Policies - Part 2: Debt and Loan Tables
  
  Tables optimized:
  - debts
  - debt_payments
  - loans
  - loan_payments
  - payoff_scenarios
*/

-- DEBTS
DROP POLICY IF EXISTS "Household members can view debts" ON debts;
DROP POLICY IF EXISTS "Household members can insert debts" ON debts;
DROP POLICY IF EXISTS "Household members can update debts" ON debts;
DROP POLICY IF EXISTS "Household members can delete debts" ON debts;

CREATE POLICY "Household members can view debts" ON debts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = debts.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can insert debts" ON debts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = debts.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can update debts" ON debts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = debts.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete debts" ON debts FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = debts.household_id AND household_members.user_id = (SELECT auth.uid())));

-- DEBT_PAYMENTS
DROP POLICY IF EXISTS "Household members can view payments" ON debt_payments;
DROP POLICY IF EXISTS "Household members can insert payments" ON debt_payments;
DROP POLICY IF EXISTS "Household members can update payments" ON debt_payments;
DROP POLICY IF EXISTS "Household members can delete payments" ON debt_payments;

CREATE POLICY "Household members can view payments" ON debt_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM debts JOIN household_members ON household_members.household_id = debts.household_id WHERE debts.id = debt_payments.debt_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can insert payments" ON debt_payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM debts JOIN household_members ON household_members.household_id = debts.household_id WHERE debts.id = debt_payments.debt_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can update payments" ON debt_payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM debts JOIN household_members ON household_members.household_id = debts.household_id WHERE debts.id = debt_payments.debt_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete payments" ON debt_payments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM debts JOIN household_members ON household_members.household_id = debts.household_id WHERE debts.id = debt_payments.debt_id AND household_members.user_id = (SELECT auth.uid())));

-- LOANS
DROP POLICY IF EXISTS "Household members can view loans" ON loans;
DROP POLICY IF EXISTS "Household members can insert loans" ON loans;
DROP POLICY IF EXISTS "Household members can update loans" ON loans;
DROP POLICY IF EXISTS "Household members can delete loans" ON loans;

CREATE POLICY "Household members can view loans" ON loans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loans.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can insert loans" ON loans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loans.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can update loans" ON loans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loans.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete loans" ON loans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loans.household_id AND household_members.user_id = (SELECT auth.uid())));

-- LOAN_PAYMENTS
DROP POLICY IF EXISTS "Household members can view loan payments" ON loan_payments;
DROP POLICY IF EXISTS "Household members can insert loan payments" ON loan_payments;
DROP POLICY IF EXISTS "Household members can update loan payments" ON loan_payments;
DROP POLICY IF EXISTS "Household members can delete loan payments" ON loan_payments;

CREATE POLICY "Household members can view loan payments" ON loan_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM loans JOIN household_members ON household_members.household_id = loans.household_id WHERE loans.id = loan_payments.loan_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can insert loan payments" ON loan_payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM loans JOIN household_members ON household_members.household_id = loans.household_id WHERE loans.id = loan_payments.loan_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can update loan payments" ON loan_payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM loans JOIN household_members ON household_members.household_id = loans.household_id WHERE loans.id = loan_payments.loan_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete loan payments" ON loan_payments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM loans JOIN household_members ON household_members.household_id = loans.household_id WHERE loans.id = loan_payments.loan_id AND household_members.user_id = (SELECT auth.uid())));

-- PAYOFF_SCENARIOS
DROP POLICY IF EXISTS "Household members can view payoff scenarios" ON payoff_scenarios;
DROP POLICY IF EXISTS "Household members can insert payoff scenarios" ON payoff_scenarios;
DROP POLICY IF EXISTS "Household members can update payoff scenarios" ON payoff_scenarios;
DROP POLICY IF EXISTS "Household members can delete payoff scenarios" ON payoff_scenarios;

CREATE POLICY "Household members can view payoff scenarios" ON payoff_scenarios FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = payoff_scenarios.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can insert payoff scenarios" ON payoff_scenarios FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = payoff_scenarios.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can update payoff scenarios" ON payoff_scenarios FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = payoff_scenarios.household_id AND household_members.user_id = (SELECT auth.uid())));

CREATE POLICY "Household members can delete payoff scenarios" ON payoff_scenarios FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = payoff_scenarios.household_id AND household_members.user_id = (SELECT auth.uid())));