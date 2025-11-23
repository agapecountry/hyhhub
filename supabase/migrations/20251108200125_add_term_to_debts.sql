/*
  # Add Term Field to Debts

  1. Changes
    - Add `term_months` column to debts table (integer, nullable)
    - Represents the original loan term in months (e.g., 360 for 30-year mortgage, 60 for 5-year car loan)
  
  2. Notes
    - This helps calculate expected payoff dates and track progress against original terms
    - Nullable for existing debts and debts where term is unknown
*/

-- Add term_months column to debts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debts' AND column_name = 'term_months'
  ) THEN
    ALTER TABLE debts ADD COLUMN term_months integer;
  END IF;
END $$;

-- Add check constraint to ensure term is positive if provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'debts' AND constraint_name = 'debts_term_months_check'
  ) THEN
    ALTER TABLE debts ADD CONSTRAINT debts_term_months_check CHECK (term_months IS NULL OR term_months > 0);
  END IF;
END $$;
