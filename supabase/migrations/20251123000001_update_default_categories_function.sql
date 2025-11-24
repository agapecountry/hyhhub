/*
  # Update Default Categories Function
  
  1. Changes
    - Remove "Personal Administration"
    - Add "Credit Card" and "Personal Loan" 
    - Add "Groceries" and "Gas"
    - Update to match current needs
    
  2. Notes
    - This ensures new households get the updated categories
*/

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_default_transaction_categories(uuid) TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION create_default_transaction_categories(uuid) IS
'Creates default transaction categories for a new household.
Total: 27 categories (20 expense, 6 income, 1 transfer)
Includes Credit Card, Personal Loan, Groceries, and Gas.';
