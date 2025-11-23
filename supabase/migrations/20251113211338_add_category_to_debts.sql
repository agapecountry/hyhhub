/*
  # Add Category Support to Debts Table

  1. Purpose
    - Unify category system across all financial entities (debts, bills, transactions)
    - Allow debts to use the same transaction_categories table
    - Enable better categorization and reporting consistency

  2. Changes
    - Add `category_id` column to debts table
    - Add foreign key constraint to transaction_categories
    - Add index for performance
    - Map existing debt types to appropriate categories

  3. Category Mapping Logic
    - Mortgage/Home Loan → Housing
    - Auto Loan/Car Loan → Transportation  
    - Credit Card → Credit Card
    - Student Loan → default to null (can be set manually)
    - Personal Loan → default to null (can be set manually)
    - Other → default to null (can be set manually)

  4. Security
    - Maintain existing RLS policies
    - No data access changes
*/

-- Add category_id column to debts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debts' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE debts ADD COLUMN category_id uuid REFERENCES transaction_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_debts_category_id ON debts(category_id) WHERE category_id IS NOT NULL;

-- Update existing debts with appropriate categories based on debt type
-- This is done per household to match the correct household's categories
DO $$
DECLARE
  household_rec RECORD;
  housing_cat_id uuid;
  transport_cat_id uuid;
  credit_card_cat_id uuid;
BEGIN
  -- Loop through each household that has debts
  FOR household_rec IN 
    SELECT DISTINCT household_id FROM debts
  LOOP
    -- Find Housing category for this household
    SELECT id INTO housing_cat_id
    FROM transaction_categories
    WHERE household_id = household_rec.household_id
      AND name = 'Housing'
    LIMIT 1;

    -- Find Transportation category for this household
    SELECT id INTO transport_cat_id
    FROM transaction_categories
    WHERE household_id = household_rec.household_id
      AND name = 'Transportation'
    LIMIT 1;

    -- Find Credit Card category for this household
    SELECT id INTO credit_card_cat_id
    FROM transaction_categories
    WHERE household_id = household_rec.household_id
      AND name = 'Credit Card'
    LIMIT 1;

    -- Update debts with appropriate categories
    IF housing_cat_id IS NOT NULL THEN
      UPDATE debts
      SET category_id = housing_cat_id
      WHERE household_id = household_rec.household_id
        AND type IN ('mortgage', 'home_loan', 'Mortgage')
        AND category_id IS NULL;
    END IF;

    IF transport_cat_id IS NOT NULL THEN
      UPDATE debts
      SET category_id = transport_cat_id
      WHERE household_id = household_rec.household_id
        AND type IN ('auto_loan', 'car_loan', 'Auto Loan', 'Car Loan')
        AND category_id IS NULL;
    END IF;

    IF credit_card_cat_id IS NOT NULL THEN
      UPDATE debts
      SET category_id = credit_card_cat_id
      WHERE household_id = household_rec.household_id
        AND type IN ('credit_card', 'Credit Card')
        AND category_id IS NULL;
    END IF;
  END LOOP;
END $$;
