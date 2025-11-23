/*
  # Add Missing Columns to Transactions Table

  1. Changes
    - Add `is_pending` column (boolean)
    - Add `notes` column (text)
    - Add `updated_at` column (timestamptz)

  2. Notes
    - These columns were defined in the original schema but missing from actual table
    - Uses IF NOT EXISTS to safely add columns
*/

-- Add is_pending column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'is_pending'
  ) THEN
    ALTER TABLE transactions ADD COLUMN is_pending boolean DEFAULT false;
  END IF;
END $$;

-- Add notes column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'notes'
  ) THEN
    ALTER TABLE transactions ADD COLUMN notes text;
  END IF;
END $$;

-- Add updated_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE transactions ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;
