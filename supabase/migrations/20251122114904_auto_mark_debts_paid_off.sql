/*
  # Auto-Mark Debts as Paid Off When Balance Reaches Zero

  1. New Trigger Function
    - `check_debt_paid_off()` - Automatically marks debts as paid off
    - Triggers when current_balance becomes <= 0
    - Sets is_active = false and paid_off_at = now()

  2. Purpose
    - Ensures paid-off debts are automatically removed from active planning
    - Paycheck planner will no longer schedule payments for paid-off debts
    - Provides accurate paid_off_at timestamp for reporting

  3. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only updates the debt that was just modified
*/

-- Function to check if debt is paid off and mark it inactive
CREATE OR REPLACE FUNCTION check_debt_paid_off()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If current_balance is now zero or negative and debt is still active
  IF NEW.current_balance <= 0 AND NEW.is_active = true THEN
    -- Mark debt as paid off
    NEW.is_active := false;
    NEW.paid_off_at := now();
    NEW.current_balance := 0; -- Ensure it's exactly 0, not negative
  END IF;

  -- If balance goes back above zero (e.g., interest accrual or correction)
  -- Don't automatically reactivate - let user decide
  
  RETURN NEW;
END;
$$;

-- Create trigger to run before any update on debts table
DROP TRIGGER IF EXISTS trigger_check_debt_paid_off ON debts;

CREATE TRIGGER trigger_check_debt_paid_off
  BEFORE UPDATE OF current_balance ON debts
  FOR EACH ROW
  EXECUTE FUNCTION check_debt_paid_off();

-- Also check on insert (in case debt is created with 0 balance)
DROP TRIGGER IF EXISTS trigger_check_debt_paid_off_insert ON debts;

CREATE TRIGGER trigger_check_debt_paid_off_insert
  BEFORE INSERT ON debts
  FOR EACH ROW
  EXECUTE FUNCTION check_debt_paid_off();
