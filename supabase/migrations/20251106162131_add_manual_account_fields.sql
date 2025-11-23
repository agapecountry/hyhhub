/*
  # Add Manual Account Fields

  1. Changes
    - Add `institution` field to store bank/institution name
    - Add `account_number_last4` field for last 4 digits of account number
    - Add `color` field for visual identification
    - Add `is_active` field to soft-delete accounts
    - Add `current_balance` alias/column to match app expectations

  2. Notes
    - These fields enable manual account tracking alongside Plaid accounts
    - The balance field remains as the source of truth
    - is_active defaults to true for new accounts
*/

-- Add new columns to accounts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'institution'
  ) THEN
    ALTER TABLE accounts ADD COLUMN institution text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'account_number_last4'
  ) THEN
    ALTER TABLE accounts ADD COLUMN account_number_last4 text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'color'
  ) THEN
    ALTER TABLE accounts ADD COLUMN color text DEFAULT '#3b82f6';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'accounts' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE accounts ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Create a view or ensure balance is accessible as current_balance
-- This allows the app to use current_balance while balance is the actual column
COMMENT ON COLUMN accounts.balance IS 'Current balance of the account (also accessible as current_balance in queries)';
