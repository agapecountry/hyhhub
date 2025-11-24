/*
  # Update Transaction Categories
  
  1. Changes
    - Remove "Personal Administration" category
    - Add "Credit Card" 💳
    - Add "Personal Loan" 💸
    - Add "Groceries" 🛒
    - Add "Gas" ⛽
    
  2. Notes
    - This updates existing households
    - Uses ON CONFLICT to avoid duplicates
    - Only affects categories, not user data
*/

-- Add new categories to all households
DO $$
DECLARE
  household_record RECORD;
BEGIN
  FOR household_record IN SELECT id FROM households
  LOOP
    -- Add new categories if they don't exist
    INSERT INTO transaction_categories (household_id, name, type, icon, color, is_default)
    VALUES
      (household_record.id, 'Credit Card', 'expense', '💳', '#ef4444', true),
      (household_record.id, 'Personal Loan', 'expense', '💸', '#3b82f6', true),
      (household_record.id, 'Groceries', 'expense', '🛒', '#10b981', true),
      (household_record.id, 'Gas', 'expense', '⛽', '#ef4444', true)
    ON CONFLICT (household_id, name) DO NOTHING;
  END LOOP;
END $$;

-- Delete "Personal Administration" category from all households
-- First, update any transactions/bills/debts that use this category to null
UPDATE transactions
SET category_id = NULL
WHERE category_id IN (
  SELECT id FROM transaction_categories WHERE name = 'Personal Administration'
);

UPDATE bills
SET category_id = NULL
WHERE category_id IN (
  SELECT id FROM transaction_categories WHERE name = 'Personal Administration'
);

UPDATE debts
SET category_id = NULL
WHERE category_id IN (
  SELECT id FROM transaction_categories WHERE name = 'Personal Administration'
);

UPDATE budget_categories
SET transaction_category_id = NULL
WHERE transaction_category_id IN (
  SELECT id FROM transaction_categories WHERE name = 'Personal Administration'
);

-- Now safe to delete the category
DELETE FROM transaction_categories
WHERE name = 'Personal Administration';
