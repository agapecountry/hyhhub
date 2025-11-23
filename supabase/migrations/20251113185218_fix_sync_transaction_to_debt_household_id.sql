/*
  # Fix sync_transaction_to_debt function to include household_id

  1. Changes
    - Update the sync_transaction_to_debt function to include household_id when creating debt_payments
    - This fixes the "null value in column household_id" error
  
  2. Security
    - No security changes
*/

CREATE OR REPLACE FUNCTION sync_transaction_to_debt()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.debt_id IS NOT NULL THEN
    INSERT INTO debt_payments (
      debt_id,
      household_id,
      amount,
      payment_date,
      principal_paid,
      interest_paid,
      remaining_balance,
      notes,
      transaction_id
    )
    VALUES (
      NEW.debt_id,
      NEW.household_id,
      ABS(NEW.amount),
      NEW.date,
      ABS(NEW.amount),
      0,
      0,
      'Synced from transaction: ' || NEW.description,
      NEW.id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
