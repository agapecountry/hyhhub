/*
  # Update Category Colors to Muted Palette
  
  1. Changes
    - Update all transaction category colors to use a muted, earthy palette
    - Sage greens, peachy tans, soft salmons, and charcoals
    - More sophisticated and brand-friendly colors
    
  2. Color Palette
    - Sage: #9db0a6, #8a9d91, #7a8d81
    - Peach/Tan: #d4a574, #c9986a, #b88a5f
    - Salmon/Coral: #e8a892, #d99680, #c8856f
    - Charcoal: #4a4a4a, #5a5a5a, #3a3a3a
*/

-- Update default category colors for all existing households
DO $$
BEGIN
  -- Expense categories with new muted colors
  UPDATE transaction_categories SET color = '#9db0a6' WHERE name = 'Groceries' AND is_default = true;
  UPDATE transaction_categories SET color = '#d4a574' WHERE name = 'Dining Out' AND is_default = true;
  UPDATE transaction_categories SET color = '#e8a892' WHERE name = 'Gas' AND is_default = true;
  UPDATE transaction_categories SET color = '#8a9d91' WHERE name = 'Transportation' AND is_default = true;
  UPDATE transaction_categories SET color = '#b88a5f' WHERE name = 'Utilities' AND is_default = true;
  UPDATE transaction_categories SET color = '#c9986a' WHERE name = 'Housing' AND is_default = true;
  UPDATE transaction_categories SET color = '#7a8d81' WHERE name = 'Insurance' AND is_default = true;
  UPDATE transaction_categories SET color = '#d99680' WHERE name = 'Healthcare' AND is_default = true;
  UPDATE transaction_categories SET color = '#d4a574' WHERE name = 'Entertainment' AND is_default = true;
  UPDATE transaction_categories SET color = '#c8856f' WHERE name = 'Shopping' AND is_default = true;
  UPDATE transaction_categories SET color = '#9db0a6' WHERE name = 'Subscriptions' AND is_default = true;
  UPDATE transaction_categories SET color = '#e8a892' WHERE name = 'Credit Card' AND is_default = true;
  UPDATE transaction_categories SET color = '#d99680' WHERE name = 'Personal Loan' AND is_default = true;
  UPDATE transaction_categories SET color = '#8a9d91' WHERE name = 'Education' AND is_default = true;
  UPDATE transaction_categories SET color = '#d4a574' WHERE name = 'Personal Care' AND is_default = true;
  UPDATE transaction_categories SET color = '#9db0a6' WHERE name = 'Pet Care' AND is_default = true;
  UPDATE transaction_categories SET color = '#b88a5f' WHERE name = 'Home Improvement' AND is_default = true;
  UPDATE transaction_categories SET color = '#e8a892' WHERE name = 'Gifts' AND is_default = true;
  UPDATE transaction_categories SET color = '#d99680' WHERE name = 'Charity' AND is_default = true;
  UPDATE transaction_categories SET color = '#5a5a5a' WHERE name = 'Miscellaneous' AND is_default = true;
  
  -- Income categories with muted greens and tans
  UPDATE transaction_categories SET color = '#9db0a6' WHERE name = 'Salary' AND is_default = true;
  UPDATE transaction_categories SET color = '#8a9d91' WHERE name = 'Freelance' AND is_default = true;
  UPDATE transaction_categories SET color = '#7a8d81' WHERE name = 'Investment' AND is_default = true;
  UPDATE transaction_categories SET color = '#d4a574' WHERE name = 'Bonus' AND is_default = true;
  UPDATE transaction_categories SET color = '#9db0a6' WHERE name = 'Refund' AND is_default = true;
  UPDATE transaction_categories SET color = '#8a9d91' WHERE name = 'Other Income' AND is_default = true;
  
  -- Transfer category
  UPDATE transaction_categories SET color = '#4a4a4a' WHERE name = 'Transfer' AND is_default = true;
END $$;

-- Update the default categories function for new households
CREATE OR REPLACE FUNCTION create_default_transaction_categories(p_household_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert default expense categories with muted color palette
  INSERT INTO public.transaction_categories (household_id, name, type, icon, color, is_default)
  VALUES
    -- Expense categories
    (p_household_id, 'Groceries', 'expense', '🛒', '#9db0a6', true),
    (p_household_id, 'Dining Out', 'expense', '🍽️', '#d4a574', true),
    (p_household_id, 'Gas', 'expense', '⛽', '#e8a892', true),
    (p_household_id, 'Transportation', 'expense', '🚗', '#8a9d91', true),
    (p_household_id, 'Utilities', 'expense', '💡', '#b88a5f', true),
    (p_household_id, 'Housing', 'expense', '🏠', '#c9986a', true),
    (p_household_id, 'Insurance', 'expense', '🛡️', '#7a8d81', true),
    (p_household_id, 'Healthcare', 'expense', '⚕️', '#d99680', true),
    (p_household_id, 'Entertainment', 'expense', '🎬', '#d4a574', true),
    (p_household_id, 'Shopping', 'expense', '🛍️', '#c8856f', true),
    (p_household_id, 'Subscriptions', 'expense', '📱', '#9db0a6', true),
    (p_household_id, 'Credit Card', 'expense', '💳', '#e8a892', true),
    (p_household_id, 'Personal Loan', 'expense', '💸', '#d99680', true),
    (p_household_id, 'Education', 'expense', '📚', '#8a9d91', true),
    (p_household_id, 'Personal Care', 'expense', '💆', '#d4a574', true),
    (p_household_id, 'Pet Care', 'expense', '🐾', '#9db0a6', true),
    (p_household_id, 'Home Improvement', 'expense', '🔨', '#b88a5f', true),
    (p_household_id, 'Gifts', 'expense', '🎁', '#e8a892', true),
    (p_household_id, 'Charity', 'expense', '❤️', '#d99680', true),
    (p_household_id, 'Miscellaneous', 'expense', '📌', '#5a5a5a', true),

    -- Income categories
    (p_household_id, 'Salary', 'income', '💰', '#9db0a6', true),
    (p_household_id, 'Freelance', 'income', '💼', '#8a9d91', true),
    (p_household_id, 'Investment', 'income', '📈', '#7a8d81', true),
    (p_household_id, 'Bonus', 'income', '🎉', '#d4a574', true),
    (p_household_id, 'Refund', 'income', '↩️', '#9db0a6', true),
    (p_household_id, 'Other Income', 'income', '💵', '#8a9d91', true),

    -- Transfer category
    (p_household_id, 'Transfer', 'transfer', '🔄', '#4a4a4a', true)
  ON CONFLICT (household_id, name) DO NOTHING;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_default_transaction_categories(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_default_transaction_categories(uuid) IS
'Creates default transaction categories with muted, earthy color palette.
Sage greens, peachy tans, soft salmons, and charcoals for sophisticated appearance.';
