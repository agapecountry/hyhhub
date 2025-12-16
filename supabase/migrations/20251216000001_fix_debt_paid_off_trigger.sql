/*
  # Fix Debt Paid Off Trigger

  Since current_balance is now the user's starting point and not auto-updated,
  we need to check if a debt is paid off based on total principal paid from payments.

  A debt is paid off when: current_balance - SUM(principal_paid) <= 0

  This trigger runs after INSERT/UPDATE/DELETE on debt_payments to check
  if the associated debt should be marked as paid off.
*/

-- Function to check if debt is paid off based on payments
CREATE OR REPLACE FUNCTION check_debt_paid_off_from_payments()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_debt_id uuid;
  v_current_balance numeric;
  v_total_principal_paid numeric;
  v_remaining_balance numeric;
  v_is_active boolean;
BEGIN
  -- Get the debt_id based on operation type
  IF TG_OP = 'DELETE' THEN
    v_debt_id := OLD.debt_id;
  ELSE
    v_debt_id := NEW.debt_id;
  END IF;

  -- Get the debt's current_balance and is_active status
  SELECT current_balance, is_active INTO v_current_balance, v_is_active
  FROM debts
  WHERE id = v_debt_id;

  -- Calculate total principal paid for this debt
  SELECT COALESCE(SUM(principal_paid), 0) INTO v_total_principal_paid
  FROM debt_payments
  WHERE debt_id = v_debt_id;

  -- Calculate remaining balance
  v_remaining_balance := v_current_balance - v_total_principal_paid;

  -- If remaining balance is zero or negative and debt is still active, mark as paid off
  IF v_remaining_balance <= 0 AND v_is_active = true THEN
    UPDATE debts
    SET is_active = false,
        paid_off_at = now()
    WHERE id = v_debt_id;
  END IF;

  -- If remaining balance goes back above zero (e.g., payment deleted) and debt was paid off
  -- Reactivate the debt
  IF v_remaining_balance > 0 AND v_is_active = false THEN
    UPDATE debts
    SET is_active = true,
        paid_off_at = NULL
    WHERE id = v_debt_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Drop the old trigger that checked current_balance directly
DROP TRIGGER IF EXISTS trigger_check_debt_paid_off ON debts;
DROP TRIGGER IF EXISTS trigger_check_debt_paid_off_insert ON debts;

-- Create new triggers on debt_payments table
DROP TRIGGER IF EXISTS trigger_check_debt_paid_off_on_payment ON debt_payments;

CREATE TRIGGER trigger_check_debt_paid_off_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON debt_payments
  FOR EACH ROW
  EXECUTE FUNCTION check_debt_paid_off_from_payments();
