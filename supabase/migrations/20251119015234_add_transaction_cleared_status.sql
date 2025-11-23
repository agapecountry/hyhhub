/*
  # Add Cleared Status to Transactions

  1. Changes
    - Add `is_cleared` boolean column to `transactions` table
    - Default to false (uncleared) for new transactions
    - Add index for efficient filtering by cleared status

  2. Purpose
    - Enable tracking of cleared vs uncleared transactions
    - Support cleared balance and working balance calculations
    - Allow filtering transactions by cleared status
*/

-- Add is_cleared column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'is_cleared'
  ) THEN
    ALTER TABLE transactions ADD COLUMN is_cleared boolean DEFAULT false;
  END IF;
END $$;

-- Add index for efficient filtering by cleared status
CREATE INDEX IF NOT EXISTS idx_transactions_account_cleared
  ON transactions(account_id, is_cleared);

-- Add composite index for cleared transactions with date
CREATE INDEX IF NOT EXISTS idx_transactions_account_cleared_date
  ON transactions(account_id, is_cleared, date DESC);
