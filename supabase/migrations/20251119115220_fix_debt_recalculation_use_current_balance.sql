/*
  # Fix Debt Balance Recalculation to Use Current Balance

  1. Problem
    - recalculate_debt_balance_with_interest() uses original_balance as starting point
    - This is incorrect when recalculating after payment updates/deletions
    - Should use current_balance instead to maintain proper debt tracking
    
  2. Solution
    - Update function to start with current_balance from debts table
    - This ensures recalculation works correctly when:
      - Payments are deleted
      - Payment amounts are changed
      - Payment dates are modified
    
  3. Changes
    - Change initial balance from original_balance to current_balance
    - This matches the behavior of calculate_debt_payment_breakdown which already uses current_balance
*/

-- Update function to use current_balance instead of original_balance
CREATE OR REPLACE FUNCTION recalculate_debt_balance_with_interest(p_debt_id uuid)
RETURNS numeric
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_balance numeric;
  v_interest_rate numeric;
  v_payment RECORD;
  v_monthly_rate numeric;
  v_interest_amount numeric;
  v_principal_amount numeric;
BEGIN
  -- Get debt info - USE CURRENT BALANCE instead of original
  SELECT current_balance, interest_rate
  INTO v_current_balance, v_interest_rate
  FROM debts
  WHERE id = p_debt_id;

  -- Start with current balance (not original balance)
  v_monthly_rate := v_interest_rate / 12.0 / 100.0;

  -- Replay all payments in chronological order to recalculate breakdown
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