/*
  # Fix Duplicate Scheduled Payments
  
  1. Remove duplicate records keeping only the first one
  2. Add unique constraint to prevent future duplicates
*/

-- First, delete duplicates keeping only the one with the smallest id (cast uuid to text for MIN)
DELETE FROM paycheck_scheduled_payments
WHERE id NOT IN (
  SELECT (MIN(id::text))::uuid
  FROM paycheck_scheduled_payments
  GROUP BY household_id, payment_type, payment_id, due_date
);

-- Add unique constraint to prevent future duplicates (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_scheduled_payment'
  ) THEN
    ALTER TABLE paycheck_scheduled_payments
    ADD CONSTRAINT unique_scheduled_payment 
    UNIQUE (household_id, payment_type, payment_id, due_date);
  END IF;
END $$;
