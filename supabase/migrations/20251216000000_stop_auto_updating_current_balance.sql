/*
  # Stop Auto-Updating current_balance on Debts

  The current_balance field should be the user's starting point when they begin
  tracking a debt in the app. It should NOT be auto-updated by triggers.

  The remaining balance is now calculated in the UI as:
    remaining_balance = current_balance - SUM(principal_paid from debt_payments)

  This migration:
  1. Updates sync_transaction_to_debt_payment to NOT update debts.current_balance
  2. Updates handle_transaction_deletion to NOT update debts.current_balance
*/

-- Updated function to sync transaction to debt payment WITHOUT updating current_balance
CREATE OR REPLACE FUNCTION sync_transaction_to_debt_payment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_debt_id uuid;
  v_bill_id uuid;
  v_payment_breakdown RECORD;
  v_old_principal numeric := 0;
BEGIN
  -- Only process if transaction has a payee_id
  IF NEW.payee_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the debt_id and bill_id from the payee
  SELECT debt_id, bill_id INTO v_debt_id, v_bill_id
  FROM payees
  WHERE id = NEW.payee_id;

  -- Handle debt payment
  IF v_debt_id IS NOT NULL AND NEW.amount < 0 THEN
    -- Calculate payment breakdown based on CURRENT debt balance
    SELECT * INTO v_payment_breakdown
    FROM calculate_debt_payment_breakdown(v_debt_id, ABS(NEW.amount));

    -- Check if payment already exists (UPDATE case)
    IF EXISTS (SELECT 1 FROM debt_payments WHERE transaction_id = NEW.id) THEN
      -- Update existing payment record
      UPDATE debt_payments
      SET 
        amount = ABS(NEW.amount),
        payment_date = NEW.date,
        principal_paid = v_payment_breakdown.principal_paid,
        interest_paid = v_payment_breakdown.interest_paid,
        remaining_balance = v_payment_breakdown.new_balance,
        notes = NEW.notes
      WHERE transaction_id = NEW.id;
      
      -- NOTE: We no longer update debts.current_balance here
      -- The remaining balance is calculated in the UI
    ELSE
      -- Insert new debt payment record
      INSERT INTO debt_payments (
        debt_id,
        household_id,
        transaction_id,
        amount,
        payment_date,
        principal_paid,
        interest_paid,
        remaining_balance,
        notes
      ) VALUES (
        v_debt_id,
        NEW.household_id,
        NEW.id,
        ABS(NEW.amount),
        NEW.date,
        v_payment_breakdown.principal_paid,
        v_payment_breakdown.interest_paid,
        v_payment_breakdown.new_balance,
        NEW.notes
      );
      
      -- NOTE: We no longer update debts.current_balance here
      -- The remaining balance is calculated in the UI
    END IF;
  END IF;

  -- Handle bill payment
  IF v_bill_id IS NOT NULL AND NEW.amount < 0 THEN
    -- Check if payment already exists
    IF NOT EXISTS (
      SELECT 1 FROM bill_payments 
      WHERE transaction_id = NEW.id
    ) THEN
      -- Insert bill payment record
      INSERT INTO bill_payments (
        bill_id,
        household_id,
        transaction_id,
        amount,
        payment_date,
        notes
      ) VALUES (
        v_bill_id,
        NEW.household_id,
        NEW.id,
        ABS(NEW.amount),
        NEW.date,
        NEW.notes
      );
    ELSE
      -- Update existing payment record
      UPDATE bill_payments
      SET 
        amount = ABS(NEW.amount),
        payment_date = NEW.date,
        notes = NEW.notes
      WHERE transaction_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Updated function to handle transaction deletions WITHOUT updating current_balance
CREATE OR REPLACE FUNCTION handle_transaction_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete associated debt payment (no need to restore balance - it's calculated in UI)
  DELETE FROM debt_payments WHERE transaction_id = OLD.id;

  -- Delete associated bill payment
  DELETE FROM bill_payments WHERE transaction_id = OLD.id;

  RETURN OLD;
END;
$$;
