/*
  # Fix Security Issues - Part 5: Fix Function Search Path

  1. Problem
    - Function `create_default_transaction_categories` has a mutable search_path
    - This is a security risk as it can be exploited
    - Functions should have a fixed search_path

  2. Solution
    - Set search_path explicitly in the function
    - Use SECURITY DEFINER with caution
    - Or use schema-qualified names for all objects

  3. Function Fixed
    - create_default_transaction_categories
*/

-- Drop and recreate the function with proper search_path
DROP FUNCTION IF EXISTS create_default_transaction_categories(uuid);

CREATE OR REPLACE FUNCTION create_default_transaction_categories(p_household_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert default expense categories
  INSERT INTO public.transaction_categories (household_id, name, type, icon, color, is_default)
  VALUES
    -- Expense categories (20 total)
    (p_household_id, 'Fitness & Sports', 'expense', '🏋️‍♂️', '#22c55e', true),
    (p_household_id, 'Food & Dining', 'expense', '🍽️', '#f59e0b', true),
    (p_household_id, 'Gifts', 'expense', '🎁', '#ec4899', true),
    (p_household_id, 'Healthcare', 'expense', '🏥', '#14b8a6', true),
    (p_household_id, 'Home Essentials', 'expense', '🛒', '#10b981', true),
    (p_household_id, 'Housing', 'expense', '🏠', '#8b5cf6', true),
    (p_household_id, 'Insurances', 'expense', '🛡️', '#06b6d4', true),
    (p_household_id, 'Investments', 'expense', '📈', '#a855f7', true),
    (p_household_id, 'Leisure', 'expense', '🎉', '#f97316', true),
    (p_household_id, 'Media & Streaming', 'expense', '📺', '#6366f1', true),
    (p_household_id, 'Personal Administration', 'expense', '🗂️', '#64748b', true),
    (p_household_id, 'Personal Maintenance', 'expense', '🧍‍♂️', '#84cc16', true),
    (p_household_id, 'Pets', 'expense', '🐾', '#22c55e', true),
    (p_household_id, 'Professional Services & Fees', 'expense', '⚖️', '#3b82f6', true),
    (p_household_id, 'Savings', 'expense', '🏦', '#10b981', true),
    (p_household_id, 'Service Subscriptions', 'expense', '📅', '#8b5cf6', true),
    (p_household_id, 'Technology', 'expense', '💻', '#6366f1', true),
    (p_household_id, 'Transportation', 'expense', '🚗', '#3b82f6', true),
    (p_household_id, 'Unexpected', 'expense', '⚠️', '#ef4444', true),
    (p_household_id, 'Utilities', 'expense', '💡', '#eab308', true),

    -- Income categories (6 total)
    (p_household_id, 'Salary', 'income', '💰', '#10b981', true),
    (p_household_id, 'Freelance', 'income', '💼', '#3b82f6', true),
    (p_household_id, 'Investment Returns', 'income', '📈', '#8b5cf6', true),
    (p_household_id, 'Bonus', 'income', '🎉', '#f59e0b', true),
    (p_household_id, 'Refund', 'income', '↩️', '#06b6d4', true),
    (p_household_id, 'Other Income', 'income', '💵', '#22c55e', true),

    -- Transfer category (1 total)
    (p_household_id, 'Transfer', 'transfer', '🔄', '#64748b', true)
  ON CONFLICT (household_id, name) DO NOTHING;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_default_transaction_categories(uuid) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION create_default_transaction_categories(uuid) IS
'Creates default transaction categories for a new household.
Search path is fixed to public schema for security.
Total: 27 categories (20 expense, 6 income, 1 transfer)';