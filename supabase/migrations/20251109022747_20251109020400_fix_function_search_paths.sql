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
  p_current_date DATE,
  frequency TEXT
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN CASE frequency
    WHEN 'daily' THEN p_current_date + INTERVAL '1 day'
    WHEN 'weekly' THEN p_current_date + INTERVAL '1 week'
    WHEN 'biweekly' THEN p_current_date + INTERVAL '2 weeks'
    WHEN 'monthly' THEN p_current_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN p_current_date + INTERVAL '3 months'
    WHEN 'yearly' THEN p_current_date + INTERVAL '1 year'
    ELSE p_current_date
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