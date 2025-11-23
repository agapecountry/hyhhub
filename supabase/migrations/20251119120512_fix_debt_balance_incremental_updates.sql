/*
  # Fix Debt Balance to Use Incremental Updates

  1. Problem
    - Current system replays all payments from original_balance
    - This is inefficient and causes calculation issues
    - Debt balance should work like a bank account - adjust current balance up/down
    
  2. Solution
    - When payment is added: reduce current_balance by principal amount
    - When payment is deleted: increase current_balance by principal that was paid
    - When payment is updated: adjust by the difference in principal
    - Use current_balance for all calculations, not original_balance
    
  3. Changes
    - Simplify sync_transaction_to_debt_payment to directly adjust balance
    - Simplify handle_transaction_deletion to restore balance
    - Remove the complex recalculation function
*/

-- Simplified function to sync transaction to debt payment
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
      -- Get the old principal amount to reverse it
      SELECT principal_paid INTO v_old_principal
      FROM debt_payments
      WHERE transaction_id = NEW.id;
      
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
      
      -- Adjust debt balance: add back old principal, subtract new principal
      UPDATE debts
      SET current_balance = current_balance + v_old_principal - v_payment_breakdown.principal_paid
      WHERE id = v_debt_id;
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
      
      -- Reduce debt balance by principal paid
      UPDATE debts
      SET current_balance = current_balance - v_payment_breakdown.principal_paid
      WHERE id = v_debt_id;
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

-- Simplified function to handle transaction deletions
CREATE OR REPLACE FUNCTION handle_transaction_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_debt_id uuid;
  v_principal_paid numeric;
BEGIN
  -- Get debt_id and principal from debt_payments
  SELECT debt_id, principal_paid INTO v_debt_id, v_principal_paid
  FROM debt_payments
  WHERE transaction_id = OLD.id;

  -- Delete associated debt payment
  DELETE FROM debt_payments WHERE transaction_id = OLD.id;

  -- Delete associated bill payment
  DELETE FROM bill_payments WHERE transaction_id = OLD.id;

  -- If this was a debt payment, restore the principal to the balance
  IF v_debt_id IS NOT NULL THEN
    UPDATE debts
    SET current_balance = current_balance + v_principal_paid
    WHERE id = v_debt_id;
  END IF;

  RETURN OLD;
END;
$$;

-- Drop the old recalculation function as it's no longer needed
DROP FUNCTION IF EXISTS recalculate_debt_balance_with_interest(uuid);