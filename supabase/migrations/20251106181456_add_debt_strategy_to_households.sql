/*
  # Add debt strategy preferences to households

  1. Changes
    - Add `debt_payoff_strategy` column to households table
      - Stores the chosen strategy: 'avalanche', 'snowball', or null (no strategy selected)
    - Add `debt_extra_payment` column to households table
      - Stores the extra monthly payment amount they want to apply
    
  2. Notes
    - These fields allow households to save their preferred debt payoff strategy
    - The UI will use these to provide personalized payment recommendations
    - Default values are null (no strategy chosen yet)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'households' AND column_name = 'debt_payoff_strategy'
  ) THEN
    ALTER TABLE households ADD COLUMN debt_payoff_strategy text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'households' AND column_name = 'debt_extra_payment'
  ) THEN
    ALTER TABLE households ADD COLUMN debt_extra_payment numeric(12, 2) DEFAULT 0;
  END IF;
END $$;