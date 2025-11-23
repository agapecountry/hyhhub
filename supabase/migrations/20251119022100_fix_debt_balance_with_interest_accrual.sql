/*
  # Fix Debt Balance Calculations with Interest Accrual

  1. Problem
    - Current system only deducts principal from balance
    - Interest should accrue on the balance between payments
    - Recalculation after deletion doesn't account for proper interest

  2. Solution
    - Create function to properly recalculate debt balance from all payments
    - Account for interest accruing over time based on payment dates
    - Update both insert/update and deletion triggers to use proper calculation

  3. How It Works
    - When a payment is made, interest is calculated on current balance
    - Payment is split: interest portion + principal portion
    - Balance is reduced only by principal
    - When recalculating, replay all payments in chronological order
*/

-- Function to recalculate debt balance from all historical payments
CREATE OR REPLACE FUNCTION recalculate_debt_balance_with_interest(p_debt_id uuid)
RETURNS numeric
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_original_balance numeric;
  v_current_balance numeric;
  v_interest_rate numeric;
  v_payment RECORD;
  v_monthly_rate numeric;
  v_interest_amount numeric;
  v_principal_amount numeric;
BEGIN
  -- Get debt info
  SELECT original_balance, interest_rate
  INTO v_original_balance, v_interest_rate
  FROM debts
  WHERE id = p_debt_id;

  -- Start with original balance
  v_current_balance := v_original_balance;
  v_monthly_rate := v_interest_rate / 12.0 / 100.0;

  -- Replay all payments in chronological order
  FOR v_payment IN
    SELECT amount, principal_paid, interest_paid, payment_date
    FROM debt_payments
    WHERE debt_id = p_debt_id
    ORDER BY payment_date ASC, created_at ASC
  LOOP
    -- Calculate interest on current balance
    v_interest_amount := v_current_balance * v_monthly_rate;
    
    -- Payment breakdown
    v_principal_amount := v_payment.amount - v_interest_amount;
    
    -- If payment doesn't cover interest, it all goes to interest
    IF v_principal_amount < 0 THEN
      v_interest_amount := v_payment.amount;
      v_principal_amount := 0;
    END IF;
    
    -- Reduce balance by principal only
    v_current_balance := GREATEST(v_current_balance - v_principal_amount, 0);
    
    -- Update the payment record with recalculated values
    UPDATE debt_payments
    SET 
      principal_paid = v_principal_amount,
      interest_paid = v_interest_amount,
      remaining_balance = v_current_balance
    WHERE debt_id = p_debt_id
      AND payment_date = v_payment.payment_date
      AND amount = v_payment.amount;
  END LOOP;

  RETURN v_current_balance;
END;
$$;

-- Updated function to sync transaction to debt payment
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
  v_recalculated_balance numeric;
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

    -- Check if payment already exists
    IF NOT EXISTS (
      SELECT 1 FROM debt_payments 
      WHERE transaction_id = NEW.id
    ) THEN
      -- Insert debt payment record
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
    ELSE
      -- Update existing payment record
      UPDATE debt_payments
      SET 
        amount = ABS(NEW.amount),
        payment_date = NEW.date,
        notes = NEW.notes
      WHERE transaction_id = NEW.id;
    END IF;

    -- Recalculate entire debt balance from all payments
    v_recalculated_balance := recalculate_debt_balance_with_interest(v_debt_id);
    
    -- Update debt with recalculated balance
    UPDATE debts
    SET current_balance = v_recalculated_balance
    WHERE id = v_debt_id;
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

-- Updated function to handle transaction deletions
CREATE OR REPLACE FUNCTION handle_transaction_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_debt_id uuid;
  v_recalculated_balance numeric;
BEGIN
  -- Get debt_id from debt_payments
  SELECT debt_id INTO v_debt_id
  FROM debt_payments
  WHERE transaction_id = OLD.id;

  -- Delete associated debt payment
  DELETE FROM debt_payments WHERE transaction_id = OLD.id;

  -- Delete associated bill payment
  DELETE FROM bill_payments WHERE transaction_id = OLD.id;

  -- If this was a debt payment, recalculate the entire debt balance
  IF v_debt_id IS NOT NULL THEN
    v_recalculated_balance := recalculate_debt_balance_with_interest(v_debt_id);
    
    -- Update debt with recalculated balance
    UPDATE debts
    SET current_balance = v_recalculated_balance
    WHERE id = v_debt_id;
  END IF;

  RETURN OLD;
END;
$$;
