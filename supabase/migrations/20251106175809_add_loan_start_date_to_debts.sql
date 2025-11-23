/*
  # Add loan start date to debts table

  1. Changes
    - Add `loan_start_date` column to debts table to track when the loan originally started
    - This allows users to see the complete loan history from inception, not just from when they entered it into the system
    - Default to created_at for existing records

  2. Notes
    - This field is optional but useful for accurate historical tracking
    - When combined with original_balance, users can see the full loan amortization schedule
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debts' AND column_name = 'loan_start_date'
  ) THEN
    ALTER TABLE debts ADD COLUMN loan_start_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;