/*
  # Fix Multiple Permissive Policies

  1. Purpose
    - Consolidate duplicate permissive policies into single policies
    - Prevents potential security confusion
    - Improves policy evaluation performance

  2. Changes
    - Merges duplicate policies for transactions (DELETE, INSERT, UPDATE)
    - Note: influencer_signups and security_audit_logs already fixed
*/

-- Fix transactions DELETE policies
DROP POLICY IF EXISTS "Admins and co-parents can delete manual transactions" ON public.transactions;
DROP POLICY IF EXISTS "Household members can delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can delete transactions" ON public.transactions;

CREATE POLICY "Members can delete transactions"
  ON public.transactions
  FOR DELETE
  TO authenticated
  USING (
    plaid_transaction_id IS NULL
    AND EXISTS (
      SELECT 1 FROM accounts a
      JOIN household_members hm ON hm.household_id = a.household_id
      WHERE a.id = transactions.account_id
      AND hm.user_id = (SELECT auth.uid())
      AND hm.role IN ('admin', 'co-parent')
    )
  );

-- Fix transactions INSERT policies
DROP POLICY IF EXISTS "Admins and co-parents can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Household members can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can insert transactions" ON public.transactions;

CREATE POLICY "Members can insert transactions"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts a
      JOIN household_members hm ON hm.household_id = a.household_id
      WHERE a.id = transactions.account_id
      AND hm.user_id = (SELECT auth.uid())
      AND hm.role IN ('admin', 'co-parent')
    )
  );

-- Fix transactions UPDATE policies
DROP POLICY IF EXISTS "Admins and co-parents can update manual transactions" ON public.transactions;
DROP POLICY IF EXISTS "Household members can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can update transactions" ON public.transactions;

CREATE POLICY "Members can update transactions"
  ON public.transactions
  FOR UPDATE
  TO authenticated
  USING (
    plaid_transaction_id IS NULL
    AND EXISTS (
      SELECT 1 FROM accounts a
      JOIN household_members hm ON hm.household_id = a.household_id
      WHERE a.id = transactions.account_id
      AND hm.user_id = (SELECT auth.uid())
      AND hm.role IN ('admin', 'co-parent')
    )
  );
