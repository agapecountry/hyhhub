/*
  # Optimize RLS Policies for Scale - Part 2: Loans

  ## Tables Updated
  - loans
  - loan_payments
  - payoff_scenarios
*/

-- LOANS
DROP POLICY IF EXISTS "Household members can view loans" ON loans;
CREATE POLICY "Household members can view loans"
  ON loans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert loans" ON loans;
CREATE POLICY "Household members can insert loans"
  ON loans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update loans" ON loans;
CREATE POLICY "Household members can update loans"
  ON loans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete loans" ON loans;
CREATE POLICY "Household members can delete loans"
  ON loans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- LOAN_PAYMENTS
DROP POLICY IF EXISTS "Household members can view loan_payments" ON loan_payments;
CREATE POLICY "Household members can view loan_payments"
  ON loan_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loan_payments.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert loan_payments" ON loan_payments;
CREATE POLICY "Household members can insert loan_payments"
  ON loan_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loan_payments.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update loan_payments" ON loan_payments;
CREATE POLICY "Household members can update loan_payments"
  ON loan_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loan_payments.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete loan_payments" ON loan_payments;
CREATE POLICY "Household members can delete loan_payments"
  ON loan_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loan_payments.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- PAYOFF_SCENARIOS
DROP POLICY IF EXISTS "Household members can view payoff_scenarios" ON payoff_scenarios;
CREATE POLICY "Household members can view payoff_scenarios"
  ON payoff_scenarios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payoff_scenarios.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert payoff_scenarios" ON payoff_scenarios;
CREATE POLICY "Household members can insert payoff_scenarios"
  ON payoff_scenarios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payoff_scenarios.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update payoff_scenarios" ON payoff_scenarios;
CREATE POLICY "Household members can update payoff_scenarios"
  ON payoff_scenarios FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payoff_scenarios.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete payoff_scenarios" ON payoff_scenarios;
CREATE POLICY "Household members can delete payoff_scenarios"
  ON payoff_scenarios FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payoff_scenarios.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );
