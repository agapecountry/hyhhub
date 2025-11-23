/*
  # Update Paycheck Settings to Support Multiple Paychecks

  Modifies the paycheck_settings table to allow multiple paychecks per household.
  
  ## Changes
  - Removes unique constraint on household_id to allow multiple paychecks
  - Adds paycheck_name field to identify different paychecks (e.g., "John's Salary", "Jane's Job")
  - Adds is_active field to enable/disable specific paychecks without deleting
  
  ## Notes
  - Households can now have multiple income sources with different schedules
  - Each paycheck can be independently configured and managed
*/

-- Remove the unique constraint on household_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'paycheck_settings_household_id_key'
  ) THEN
    ALTER TABLE paycheck_settings DROP CONSTRAINT paycheck_settings_household_id_key;
  END IF;
END $$;

-- Add paycheck_name field if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'paycheck_settings' AND column_name = 'paycheck_name'
  ) THEN
    ALTER TABLE paycheck_settings ADD COLUMN paycheck_name text NOT NULL DEFAULT 'Primary Paycheck';
  END IF;
END $$;

-- Add is_active field if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'paycheck_settings' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE paycheck_settings ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add index for household_id + is_active for efficient lookups
CREATE INDEX IF NOT EXISTS idx_paycheck_settings_household_active 
  ON paycheck_settings(household_id, is_active);
