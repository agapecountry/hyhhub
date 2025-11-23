/*
  # Add Category to Bills Table

  1. Changes
    - Add `category` column to bills table
    - Category options: utilities, housing, insurance, subscriptions, debt, other
  
  2. Notes
    - Uses IF NOT EXISTS to safely add column
    - Default value is 'other'
*/

-- Add category column to bills table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'category'
  ) THEN
    ALTER TABLE bills ADD COLUMN category text NOT NULL DEFAULT 'other' CHECK (category IN ('utilities', 'housing', 'insurance', 'subscriptions', 'debt', 'other'));
  END IF;
END $$;
