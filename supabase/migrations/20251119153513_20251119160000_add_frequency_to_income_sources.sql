/*
  # Add Payment Frequency to Income Sources

  1. Changes
    - Add `payment_frequency` column to income_sources
    - Add `amount` column (to match paycheck naming convention)
    - Keep `monthly_amount` for backward compatibility but deprecate it
    - Update to store the per-payment amount and frequency

  2. Notes
    - Frequency options: weekly, biweekly, semimonthly, monthly
    - This aligns with paycheck planner frequency options
    - Budget calculations will convert to monthly automatically
*/

-- Add payment_frequency column
ALTER TABLE income_sources
ADD COLUMN IF NOT EXISTS payment_frequency text DEFAULT 'monthly';

-- Add check constraint for payment_frequency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'income_sources_payment_frequency_check'
  ) THEN
    ALTER TABLE income_sources
    ADD CONSTRAINT income_sources_payment_frequency_check 
    CHECK (payment_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly'));
  END IF;
END $$;

-- Add amount column (per-payment amount)
ALTER TABLE income_sources
ADD COLUMN IF NOT EXISTS amount decimal(12, 2);

-- Migrate existing data (monthly_amount to amount with monthly frequency)
UPDATE income_sources
SET amount = monthly_amount,
    payment_frequency = 'monthly'
WHERE amount IS NULL;

-- Make amount NOT NULL after migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income_sources' AND column_name = 'amount'
  ) THEN
    ALTER TABLE income_sources ALTER COLUMN amount SET NOT NULL;
  END IF;
END $$;

-- Add check constraint for positive amount
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'income_sources_positive_amount'
  ) THEN
    ALTER TABLE income_sources
    ADD CONSTRAINT income_sources_positive_amount CHECK (amount >= 0);
  END IF;
END $$;