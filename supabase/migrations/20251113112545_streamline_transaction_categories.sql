/*
  # Streamline Transaction Categories

  1. Changes
    - Update default transaction categories to new streamlined list
    - Add 20 new standardized categories with proper icons and colors
    - Keep expense, income, and transfer types
    - Categories are still household-specific and customizable
    - Preserve existing user-created custom categories

  2. Categories
    Expense Categories:
    - Fitness & Sports 🏋️‍♂️
    - Food & Dining 🍽️
    - Gifts 🎁
    - Healthcare 🏥
    - Home Essentials 🛒
    - Housing 🏠
    - Insurances 🛡️
    - Investments 📈
    - Leisure 🎉
    - Media & Streaming 📺
    - Personal Administration 🗂️
    - Personal Maintenance 🧍‍♂️
    - Pets 🐾
    - Professional Services & Fees ⚖️
    - Savings 🏦
    - Service Subscriptions 📅
    - Technology 💻
    - Transportation 🚗
    - Unexpected ⚠️
    - Utilities 💡

    Income Categories:
    - Salary 💰
    - Freelance 💼
    - Investment Returns 📈
    - Bonus 🎉
    - Refund ↩️
    - Other Income 💵

    Transfer:
    - Transfer 🔄

  3. Notes
    - This replaces the create_default_transaction_categories function
    - Existing households will get the new categories
    - Old default categories remain but can be hidden/deleted by users
*/

-- Drop and recreate the function with new categories
DROP FUNCTION IF EXISTS create_default_transaction_categories(uuid);

CREATE OR REPLACE FUNCTION create_default_transaction_categories(p_household_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO transaction_categories (household_id, name, type, icon, color, is_default)
  VALUES
    -- Expense categories (alphabetically ordered for consistency)
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

    -- Income categories
    (p_household_id, 'Salary', 'income', '💰', '#10b981', true),
    (p_household_id, 'Freelance', 'income', '💼', '#3b82f6', true),
    (p_household_id, 'Investment Returns', 'income', '📈', '#8b5cf6', true),
    (p_household_id, 'Bonus', 'income', '🎉', '#f59e0b', true),
    (p_household_id, 'Refund', 'income', '↩️', '#06b6d4', true),
    (p_household_id, 'Other Income', 'income', '💵', '#22c55e', true),

    -- Transfer
    (p_household_id, 'Transfer', 'transfer', '🔄', '#64748b', true)
  ON CONFLICT (household_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add new categories to all existing households
DO $$
DECLARE
  household_record RECORD;
BEGIN
  FOR household_record IN SELECT id FROM households
  LOOP
    PERFORM create_default_transaction_categories(household_record.id);
  END LOOP;
END $$;
