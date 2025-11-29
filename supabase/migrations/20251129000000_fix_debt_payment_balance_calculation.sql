/*
  # Fix Debt Payment Balance Calculation
  
  The balance calculation should use the most recent payment's remaining_balance
  as the starting point, not the potentially stale current_balance from debts table.
*/

CREATE OR REPLACE FUNCTION calculate_debt_payment_breakdown(
  p_debt_id uuid,
  p_payment_amount numeric
)
RETURNS TABLE (
  principal_paid numeric,
  interest_paid numeric,
  new_balance numeric
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_balance numeric;
  v_interest_rate numeric;
  v_original_balance numeric;
  v_monthly_interest numeric;
  v_interest_amount numeric;
  v_principal_amount numeric;
BEGIN
  -- Get debt info
  SELECT original_balance, interest_rate
  INTO v_original_balance, v_interest_rate
  FROM debts
  WHERE id = p_debt_id;

  -- Get the most recent payment's remaining_balance as starting point
  -- If no payments exist, use original_balance
  SELECT remaining_balance INTO v_current_balance
  FROM debt_payments
  WHERE debt_id = p_debt_id
  ORDER BY payment_date DESC, created_at DESC
  LIMIT 1;

  -- If no previous payments, start with original balance
  IF v_current_balance IS NULL THEN
    v_current_balance := v_original_balance;
  END IF;

  -- Calculate monthly interest rate (annual rate / 12 / 100)
  v_monthly_interest := v_interest_rate / 12.0 / 100.0;
  
  -- Calculate interest portion of payment
  v_interest_amount := v_current_balance * v_monthly_interest;
  
  -- Remaining goes to principal
  v_principal_amount := p_payment_amount - v_interest_amount;
  
  -- If payment doesn't cover interest, it all goes to interest
  IF v_principal_amount < 0 THEN
    v_interest_amount := p_payment_amount;
    v_principal_amount := 0;
  END IF;
  
  -- Calculate new balance
  new_balance := GREATEST(v_current_balance - v_principal_amount, 0);
  principal_paid := v_principal_amount;
  interest_paid := v_interest_amount;
  
  RETURN QUERY SELECT principal_paid, interest_paid, new_balance;
END;
$$;
