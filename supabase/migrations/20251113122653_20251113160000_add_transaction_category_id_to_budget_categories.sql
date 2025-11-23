/*
  # Link Budget Categories to Transaction Categories

  1. Problem
    - budget_categories table is missing transaction_category_id column
    - Frontend code expects this relationship to exist
    - Queries are failing with 400 errors

  2. Solution
    - Add transaction_category_id column as a foreign key
    - Add index for query performance
    - Keep existing name/icon/color columns for backward compatibility

  3. Changes
    - Add transaction_category_id column (nullable initially)
    - Add foreign key constraint to transaction_categories
    - Add index on transaction_category_id
*/

-- Add transaction_category_id column to budget_categories
ALTER TABLE budget_categories
ADD COLUMN IF NOT EXISTS transaction_category_id uuid;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'budget_categories_transaction_category_id_fkey'
    AND table_name = 'budget_categories'
  ) THEN
    ALTER TABLE budget_categories
    ADD CONSTRAINT budget_categories_transaction_category_id_fkey
    FOREIGN KEY (transaction_category_id)
    REFERENCES transaction_categories(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for query performance
CREATE INDEX IF NOT EXISTS idx_budget_categories_transaction_category_id
ON budget_categories(transaction_category_id);