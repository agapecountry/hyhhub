/*
  # Update Bills Category to Use Transaction Categories

  1. Changes
    - Drop the old category column with check constraint
    - Add new category_id column as foreign key to transaction_categories
    - Set default to 'Miscellaneous' category for each household
    - Backfill existing bills with 'Miscellaneous' category
  
  2. Notes
    - Bills will now use the same category system as transactions
    - Only expense categories should be used for bills
*/

-- Drop the old category column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'category'
  ) THEN
    ALTER TABLE bills DROP COLUMN category;
  END IF;
END $$;

-- Add category_id column as foreign key to transaction_categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE bills ADD COLUMN category_id uuid REFERENCES transaction_categories(id);
  END IF;
END $$;

-- Create index on category_id
CREATE INDEX IF NOT EXISTS idx_bills_category_id ON bills(category_id);

-- Backfill existing bills with 'Miscellaneous' category for their household
DO $$
DECLARE
  bill_record RECORD;
  misc_category_id uuid;
BEGIN
  FOR bill_record IN SELECT id, household_id FROM bills WHERE category_id IS NULL
  LOOP
    -- Find the Miscellaneous category for this household
    SELECT id INTO misc_category_id
    FROM transaction_categories
    WHERE household_id = bill_record.household_id
    AND name = 'Miscellaneous'
    AND type = 'expense'
    LIMIT 1;
    
    -- Update the bill if we found a category
    IF misc_category_id IS NOT NULL THEN
      UPDATE bills
      SET category_id = misc_category_id
      WHERE id = bill_record.id;
    END IF;
  END LOOP;
END $$;

-- Make category_id required after backfilling
ALTER TABLE bills ALTER COLUMN category_id SET NOT NULL;
