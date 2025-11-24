/*
  # Revert Category Colors to Original Palette
  
  1. Changes
    - Restore original bright color palette
    - Keep the current categories (including Credit Card, Personal Loan, Groceries, Gas)
*/

-- Revert to original colors for all existing households
DO $$
BEGIN
  -- Expense categories with original colors
  UPDATE transaction_categories SET color = '#10b981' WHERE name = 'Groceries' AND is_default = true;
  UPDATE transaction_categories SET color = '#f59e0b' WHERE name = 'Dining Out' AND is_default = true;
  UPDATE transaction_categories SET color = '#ef4444' WHERE name = 'Gas' AND is_default = true;
  UPDATE transaction_categories SET color = '#3b82f6' WHERE name = 'Transportation' AND is_default = true;
  UPDATE transaction_categories SET color = '#8b5cf6' WHERE name = 'Utilities' AND is_default = true;
  UPDATE transaction_categories SET color = '#ec4899' WHERE name = 'Housing' AND is_default = true;
  UPDATE transaction_categories SET color = '#06b6d4' WHERE name = 'Insurance' AND is_default = true;
  UPDATE transaction_categories SET color = '#14b8a6' WHERE name = 'Healthcare' AND is_default = true;
  UPDATE transaction_categories SET color = '#f97316' WHERE name = 'Entertainment' AND is_default = true;
  UPDATE transaction_categories SET color = '#a855f7' WHERE name = 'Shopping' AND is_default = true;
  UPDATE transaction_categories SET color = '#6366f1' WHERE name = 'Subscriptions' AND is_default = true;
  UPDATE transaction_categories SET color = '#ef4444' WHERE name = 'Credit Card' AND is_default = true;
  UPDATE transaction_categories SET color = '#3b82f6' WHERE name = 'Personal Loan' AND is_default = true;
  UPDATE transaction_categories SET color = '#84cc16' WHERE name = 'Education' AND is_default = true;
  UPDATE transaction_categories SET color = '#f43f5e' WHERE name = 'Personal Care' AND is_default = true;
  UPDATE transaction_categories SET color = '#22c55e' WHERE name = 'Pet Care' AND is_default = true;
  UPDATE transaction_categories SET color = '#eab308' WHERE name = 'Home Improvement' AND is_default = true;
  UPDATE transaction_categories SET color = '#ec4899' WHERE name = 'Gifts' AND is_default = true;
  UPDATE transaction_categories SET color = '#f43f5e' WHERE name = 'Charity' AND is_default = true;
  UPDATE transaction_categories SET color = '#64748b' WHERE name = 'Miscellaneous' AND is_default = true;
  
  -- Income categories with original colors
  UPDATE transaction_categories SET color = '#10b981' WHERE name = 'Salary' AND is_default = true;
  UPDATE transaction_categories SET color = '#3b82f6' WHERE name = 'Freelance' AND is_default = true;
  UPDATE transaction_categories SET color = '#8b5cf6' WHERE name = 'Investment' AND is_default = true;
  UPDATE transaction_categories SET color = '#f59e0b' WHERE name = 'Bonus' AND is_default = true;
  UPDATE transaction_categories SET color = '#06b6d4' WHERE name = 'Refund' AND is_default = true;
  UPDATE transaction_categories SET color = '#22c55e' WHERE name = 'Other Income' AND is_default = true;
  
  -- Transfer category
  UPDATE transaction_categories SET color = '#64748b' WHERE name = 'Transfer' AND is_default = true;
END $$;

-- Update the default categories function back to original colors
CREATE OR REPLACE FUNCTION create_default_transaction_categories(p_household_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert default expense categories with original colors
  INSERT INTO public.transaction_categories (household_id, name, type, icon, color, is_default)
  VALUES
    -- Expense categories
    (p_household_id, 'Groceries', 'expense', '🛒', '#10b981', true),
    (p_household_id, 'Dining Out', 'expense', '🍽️', '#f59e0b', true),
    (p_household_id, 'Gas', 'expense', '⛽', '#ef4444', true),
    (p_household_id, 'Transportation', 'expense', '🚗', '#3b82f6', true),
    (p_household_id, 'Utilities', 'expense', '💡', '#8b5cf6', true),
    (p_household_id, 'Housing', 'expense', '🏠', '#ec4899', true),
    (p_household_id, 'Insurance', 'expense', '🛡️', '#06b6d4', true),
    (p_household_id, 'Healthcare', 'expense', '⚕️', '#14b8a6', true),
    (p_household_id, 'Entertainment', 'expense', '🎬', '#f97316', true),
    (p_household_id, 'Shopping', 'expense', '🛍️', '#a855f7', true),
    (p_household_id, 'Subscriptions', 'expense', '📱', '#6366f1', true),
    (p_household_id, 'Credit Card', 'expense', '💳', '#ef4444', true),
    (p_household_id, 'Personal Loan', 'expense', '💸', '#3b82f6', true),
    (p_household_id, 'Education', 'expense', '📚', '#84cc16', true),
    (p_household_id, 'Personal Care', 'expense', '💆', '#f43f5e', true),
    (p_household_id, 'Pet Care', 'expense', '🐾', '#22c55e', true),
    (p_household_id, 'Home Improvement', 'expense', '🔨', '#eab308', true),
    (p_household_id, 'Gifts', 'expense', '🎁', '#ec4899', true),
    (p_household_id, 'Charity', 'expense', '❤️', '#f43f5e', true),
    (p_household_id, 'Miscellaneous', 'expense', '📌', '#64748b', true),

    -- Income categories
    (p_household_id, 'Salary', 'income', '💰', '#10b981', true),
    (p_household_id, 'Freelance', 'income', '💼', '#3b82f6', true),
    (p_household_id, 'Investment', 'income', '📈', '#8b5cf6', true),
    (p_household_id, 'Bonus', 'income', '🎉', '#f59e0b', true),
    (p_household_id, 'Refund', 'income', '↩️', '#06b6d4', true),
    (p_household_id, 'Other Income', 'income', '💵', '#22c55e', true),

    -- Transfer category
    (p_household_id, 'Transfer', 'transfer', '🔄', '#64748b', true)
  ON CONFLICT (household_id, name) DO NOTHING;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_default_transaction_categories(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_default_transaction_categories(uuid) IS
'Creates default transaction categories with original color palette.
Total: 27 categories (20 expense, 6 income, 1 transfer)
Includes Credit Card, Personal Loan, Groceries, and Gas.';
