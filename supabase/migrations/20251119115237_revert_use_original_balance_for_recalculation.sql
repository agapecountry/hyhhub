/*
  # Revert to Using Original Balance for Recalculation

  1. Clarification
    - When recalculating debt balance from scratch, we need to start from original_balance
    - Then replay ALL payments in chronological order
    - This gives us the correct current balance after all payments
    
  2. Use Cases
    - When a payment is deleted: recalculate from original + replay remaining payments
    - When a payment amount changes: recalculate from original + replay all payments
    - This ensures accuracy by rebuilding the entire payment history
    
  3. Current Balance vs Original Balance
    - original_balance = the debt amount when first created
    - current_balance = original_balance minus all principal payments made
    - Recalculation MUST start from original_balance to be accurate
*/

-- Restore function to use original_balance (correct approach)
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

  -- Start with original balance and replay all payments
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