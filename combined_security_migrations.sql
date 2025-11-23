/*
  # Fix RLS Auth Performance Issues

  1. Purpose
    - Replace auth.uid() with (SELECT auth.uid()) in RLS policies
    - Prevents re-evaluation of auth function for each row
    - Significantly improves query performance at scale

  2. Changes
    - Drops and recreates policies with optimized auth checks
    - Applies to: user_dashboard_preferences, transaction_categories, payees,
      recurring_transactions, transactions, pantry_locations, accounts
*/

-- user_dashboard_preferences policies
DROP POLICY IF EXISTS "Users can view their own dashboard preferences" ON public.user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can insert their own dashboard preferences" ON public.user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can update their own dashboard preferences" ON public.user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can delete their own dashboard preferences" ON public.user_dashboard_preferences;

CREATE POLICY "Users can view their own dashboard preferences"
  ON public.user_dashboard_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own dashboard preferences"
  ON public.user_dashboard_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own dashboard preferences"
  ON public.user_dashboard_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own dashboard preferences"
  ON public.user_dashboard_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- transaction_categories policies
DROP POLICY IF EXISTS "Members can view transaction categories" ON public.transaction_categories;
DROP POLICY IF EXISTS "Admins and co-parents can create categories" ON public.transaction_categories;
DROP POLICY IF EXISTS "Admins and co-parents can update categories" ON public.transaction_categories;
DROP POLICY IF EXISTS "Admins and co-parents can delete categories" ON public.transaction_categories;

CREATE POLICY "Members can view transaction categories"
  ON public.transaction_categories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transaction_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins and co-parents can create categories"
  ON public.transaction_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transaction_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Admins and co-parents can update categories"
  ON public.transaction_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transaction_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Admins and co-parents can delete categories"
  ON public.transaction_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transaction_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co-parent')
    )
  );

-- payees policies
DROP POLICY IF EXISTS "Users can view household payees" ON public.payees;
DROP POLICY IF EXISTS "Users can create payees in their household" ON public.payees;
DROP POLICY IF EXISTS "Users can update household payees" ON public.payees;
DROP POLICY IF EXISTS "Users can delete household payees" ON public.payees;

CREATE POLICY "Users can view household payees"
  ON public.payees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payees.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create payees in their household"
  ON public.payees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payees.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update household payees"
  ON public.payees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payees.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete household payees"
  ON public.payees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payees.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- recurring_transactions policies
DROP POLICY IF EXISTS "Users can view household recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can create recurring transactions in their household" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can update household recurring transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Users can delete household recurring transactions" ON public.recurring_transactions;

CREATE POLICY "Users can view household recurring transactions"
  ON public.recurring_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recurring_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create recurring transactions in their household"
  ON public.recurring_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recurring_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update household recurring transactions"
  ON public.recurring_transactions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recurring_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete household recurring transactions"
  ON public.recurring_transactions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recurring_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- transactions policies (keep existing ones, just update auth)
DROP POLICY IF EXISTS "Members can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins and co-parents can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins and co-parents can update manual transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins and co-parents can delete manual transactions" ON public.transactions;

CREATE POLICY "Members can view transactions"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts a
      JOIN household_members hm ON hm.household_id = a.household_id
      WHERE a.id = transactions.account_id
      AND hm.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins and co-parents can insert transactions"
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

CREATE POLICY "Admins and co-parents can update manual transactions"
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

CREATE POLICY "Admins and co-parents can delete manual transactions"
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

-- pantry_locations policies
DROP POLICY IF EXISTS "Household members can view pantry_locations" ON public.pantry_locations;
DROP POLICY IF EXISTS "Household members can insert pantry_locations" ON public.pantry_locations;
DROP POLICY IF EXISTS "Household members can update pantry_locations" ON public.pantry_locations;
DROP POLICY IF EXISTS "Household members can delete pantry_locations" ON public.pantry_locations;

CREATE POLICY "Household members can view pantry_locations"
  ON public.pantry_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_locations.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Household members can insert pantry_locations"
  ON public.pantry_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_locations.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Household members can update pantry_locations"
  ON public.pantry_locations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_locations.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Household members can delete pantry_locations"
  ON public.pantry_locations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_locations.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- accounts policy (just this one)
DROP POLICY IF EXISTS "Members can view accounts based on role" ON public.accounts;

CREATE POLICY "Members can view accounts based on role"
  ON public.accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = accounts.household_id
      AND hm.user_id = (SELECT auth.uid())
      AND (
        hm.role IN ('admin', 'co-parent')
        OR NOT accounts.is_private
        OR EXISTS (
          SELECT 1 FROM account_view_permissions avp
          WHERE avp.account_id = accounts.id
          AND avp.member_id = hm.id
        )
      )
    )
  );
/*
  # Remove Unused Indexes

  1. Purpose
    - Remove indexes that haven't been used
    - Reduces storage overhead
    - Improves INSERT/UPDATE performance

  2. Changes
    - Drops unused indexes identified by Supabase analysis
    - Keeps only actively used indexes
*/

-- user_dashboard_preferences unused indexes
DROP INDEX IF EXISTS public.idx_user_dashboard_preferences_user;
DROP INDEX IF EXISTS public.idx_user_dashboard_preferences_household;
DROP INDEX IF EXISTS public.idx_user_dashboard_preferences_widget;

-- transactions unused indexes
DROP INDEX IF EXISTS public.idx_transactions_plaid_id;
DROP INDEX IF EXISTS public.idx_transactions_debt_id;
DROP INDEX IF EXISTS public.idx_transactions_payee_id;
DROP INDEX IF EXISTS public.idx_transactions_recurring_id;

-- transaction_categories unused indexes
DROP INDEX IF EXISTS public.idx_transaction_categories_household_id;

-- payees unused indexes
DROP INDEX IF EXISTS public.idx_payees_household_id;

-- recurring_transactions unused indexes
DROP INDEX IF EXISTS public.idx_recurring_transactions_household_id;
DROP INDEX IF EXISTS public.idx_recurring_transactions_next_due_date;

-- pantry_items unused indexes
DROP INDEX IF EXISTS public.idx_pantry_items_location_id;

-- access_reviews unused indexes
DROP INDEX IF EXISTS public.idx_access_reviews_reviewer_id;

-- influencer_codes unused indexes
DROP INDEX IF EXISTS public.idx_influencer_codes_tier_id;

-- influencer_signups unused indexes
DROP INDEX IF EXISTS public.idx_influencer_signups_subscription_tier_id;

-- project_transactions unused indexes
DROP INDEX IF EXISTS public.idx_project_transactions_created_by;

-- security_alerts unused indexes
DROP INDEX IF EXISTS public.idx_security_alerts_acknowledged_by;
DROP INDEX IF EXISTS public.idx_security_alerts_household_id;
DROP INDEX IF EXISTS public.idx_security_alerts_user_id;

-- security_incidents unused indexes
DROP INDEX IF EXISTS public.idx_security_incidents_assigned_to;
DROP INDEX IF EXISTS public.idx_security_incidents_detected_by;

-- security_risks unused indexes
DROP INDEX IF EXISTS public.idx_security_risks_owner;
/*
  # Fix Multiple Permissive Policies

  1. Purpose
    - Consolidate duplicate permissive policies into single policies
    - Prevents potential security confusion
    - Improves policy evaluation performance

  2. Changes
    - Merges duplicate policies for influencer_signups
    - Merges duplicate policies for security_audit_logs
    - Merges duplicate policies for transactions (DELETE, INSERT, SELECT, UPDATE)
*/

-- Fix influencer_signups SELECT policies
DROP POLICY IF EXISTS "Influencers can view own signups" ON public.influencer_signups;
DROP POLICY IF EXISTS "Users can view own signup record" ON public.influencer_signups;

CREATE POLICY "Users and influencers can view own signups"
  ON public.influencer_signups
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR influencer_code_id IN (
      SELECT id FROM influencer_codes
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Fix security_audit_logs SELECT policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.security_audit_logs;
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.security_audit_logs;

CREATE POLICY "Users can view audit logs"
  ON public.security_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = security_audit_logs.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

-- Fix transactions DELETE policies
DROP POLICY IF EXISTS "Admins and co-parents can delete manual transactions" ON public.transactions;
DROP POLICY IF EXISTS "Household members can delete transactions" ON public.transactions;

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

-- Fix transactions SELECT policies
DROP POLICY IF EXISTS "Household members can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can view transactions" ON public.transactions;

CREATE POLICY "Members can view transactions"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts a
      JOIN household_members hm ON hm.household_id = a.household_id
      WHERE a.id = transactions.account_id
      AND hm.user_id = (SELECT auth.uid())
    )
  );

-- Fix transactions UPDATE policies
DROP POLICY IF EXISTS "Admins and co-parents can update manual transactions" ON public.transactions;
DROP POLICY IF EXISTS "Household members can update transactions" ON public.transactions;

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
/*
  # Fix Function Search Paths

  1. Purpose
    - Set immutable search_path for all functions
    - Prevents security vulnerabilities from search path manipulation
    - Ensures functions execute with predictable schema resolution

  2. Changes
    - Recreates functions with explicit search_path
    - Sets search_path to 'public, pg_catalog'
    - Maintains all existing function logic
*/

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  default_household_id UUID;
BEGIN
  -- Create user entry
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));

  -- Create default household
  INSERT INTO public.households (name, created_by)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) || '''s Household',
    NEW.id
  )
  RETURNING id INTO default_household_id;

  -- Add user as admin member
  INSERT INTO public.household_members (household_id, user_id, role, name, is_primary)
  VALUES (
    default_household_id,
    NEW.id,
    'admin',
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    true
  );

  -- Set default household
  INSERT INTO public.user_settings (user_id, default_household_id)
  VALUES (NEW.id, default_household_id);

  RETURN NEW;
END;
$$;

-- update_transactions_updated_at
CREATE OR REPLACE FUNCTION public.update_transactions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- update_transaction_categories_updated_at
CREATE OR REPLACE FUNCTION public.update_transaction_categories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- create_default_transaction_categories
CREATE OR REPLACE FUNCTION public.create_default_transaction_categories(household_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.transaction_categories (household_id, name, type, icon, color)
  VALUES
    (household_id_param, 'Groceries', 'expense', '🛒', '#10b981'),
    (household_id_param, 'Dining Out', 'expense', '🍽️', '#f59e0b'),
    (household_id_param, 'Transportation', 'expense', '🚗', '#3b82f6'),
    (household_id_param, 'Housing', 'expense', '🏠', '#8b5cf6'),
    (household_id_param, 'Utilities', 'expense', '💡', '#06b6d4'),
    (household_id_param, 'Entertainment', 'expense', '🎬', '#ec4899'),
    (household_id_param, 'Healthcare', 'expense', '⚕️', '#ef4444'),
    (household_id_param, 'Shopping', 'expense', '🛍️', '#a855f7'),
    (household_id_param, 'Salary', 'income', '💰', '#22c55e'),
    (household_id_param, 'Investment', 'income', '📈', '#14b8a6'),
    (household_id_param, 'Transfer', 'transfer', '↔️', '#64748b');
END;
$$;

-- create_default_categories_for_new_household
CREATE OR REPLACE FUNCTION public.create_default_categories_for_new_household()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.create_default_transaction_categories(NEW.id);
  RETURN NEW;
END;
$$;

-- sync_transaction_to_debt
CREATE OR REPLACE FUNCTION public.sync_transaction_to_debt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NEW.debt_id IS NOT NULL THEN
    INSERT INTO public.debt_payments (
      debt_id,
      amount,
      payment_date,
      principal_paid,
      interest_paid,
      remaining_balance,
      notes
    )
    VALUES (
      NEW.debt_id,
      ABS(NEW.amount),
      NEW.date,
      ABS(NEW.amount),
      0,
      0,
      'Synced from transaction: ' || NEW.description
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- handle_debt_transaction_deletion
CREATE OR REPLACE FUNCTION public.handle_debt_transaction_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.debt_id IS NOT NULL THEN
    DELETE FROM public.debt_payments
    WHERE debt_id = OLD.debt_id
    AND payment_date = OLD.date
    AND amount = ABS(OLD.amount);
  END IF;
  RETURN OLD;
END;
$$;

-- handle_debt_link_change
CREATE OR REPLACE FUNCTION public.handle_debt_link_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.debt_id IS NOT NULL AND (NEW.debt_id IS NULL OR NEW.debt_id != OLD.debt_id) THEN
    DELETE FROM public.debt_payments
    WHERE debt_id = OLD.debt_id
    AND payment_date = OLD.date
    AND amount = ABS(OLD.amount);
  END IF;

  IF NEW.debt_id IS NOT NULL AND (OLD.debt_id IS NULL OR NEW.debt_id != OLD.debt_id) THEN
    INSERT INTO public.debt_payments (
      debt_id,
      amount,
      payment_date,
      principal_paid,
      interest_paid,
      remaining_balance,
      notes
    )
    VALUES (
      NEW.debt_id,
      ABS(NEW.amount),
      NEW.date,
      ABS(NEW.amount),
      0,
      0,
      'Synced from transaction: ' || NEW.description
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- calculate_next_due_date
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  current_date DATE,
  frequency TEXT
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN CASE frequency
    WHEN 'daily' THEN current_date + INTERVAL '1 day'
    WHEN 'weekly' THEN current_date + INTERVAL '1 week'
    WHEN 'biweekly' THEN current_date + INTERVAL '2 weeks'
    WHEN 'monthly' THEN current_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN current_date + INTERVAL '3 months'
    WHEN 'yearly' THEN current_date + INTERVAL '1 year'
    ELSE current_date
  END;
END;
$$;

-- process_recurring_transactions
CREATE OR REPLACE FUNCTION public.process_recurring_transactions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT * FROM public.recurring_transactions
    WHERE is_active = true
    AND next_due_date <= CURRENT_DATE
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LOOP
    INSERT INTO public.transactions (
      account_id,
      date,
      description,
      amount,
      category_id,
      transaction_type,
      payee_id,
      is_pending,
      notes,
      debt_id,
      recurring_transaction_id
    )
    VALUES (
      rec.account_id,
      rec.next_due_date,
      rec.description,
      rec.amount,
      rec.category_id,
      rec.transaction_type,
      rec.payee_id,
      false,
      'Auto-generated from recurring transaction',
      rec.debt_id,
      rec.id
    );

    UPDATE public.recurring_transactions
    SET next_due_date = public.calculate_next_due_date(next_due_date, frequency)
    WHERE id = rec.id;
  END LOOP;
END;
$$;
