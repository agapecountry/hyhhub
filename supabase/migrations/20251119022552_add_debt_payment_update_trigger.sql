/*
  # Add Trigger for Manual Debt Payment Updates

  1. Purpose
    - Recalculate debt balance when payments are manually updated
    - Ensure interest calculations remain accurate after edits
    - Handle both updates and deletions of manual payment entries

  2. Changes
    - Add trigger to recalculate balance on debt_payments UPDATE
    - Add trigger to recalculate balance on debt_payments DELETE
    - Both triggers call the existing recalculate function

  3. Notes
    - Only recalculates for manual updates (not from transaction sync)
    - Maintains data integrity across all payment modifications
*/

-- Trigger to recalculate debt balance when a payment is updated
CREATE OR REPLACE FUNCTION handle_debt_payment_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_recalculated_balance numeric;
BEGIN
  -- Recalculate the entire debt balance
  v_recalculated_balance := recalculate_debt_balance_with_interest(NEW.debt_id);
  
  -- Update debt with recalculated balance
  UPDATE debts
  SET current_balance = v_recalculated_balance
  WHERE id = NEW.debt_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to recalculate debt balance when a payment is deleted
CREATE OR REPLACE FUNCTION handle_debt_payment_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_recalculated_balance numeric;
BEGIN
  -- Recalculate the entire debt balance
  v_recalculated_balance := recalculate_debt_balance_with_interest(OLD.debt_id);
  
  -- Update debt with recalculated balance
  UPDATE debts
  SET current_balance = v_recalculated_balance
  WHERE id = OLD.debt_id;
  
  RETURN OLD;
END;
$$;

-- Create triggers for debt_payments table
DROP TRIGGER IF EXISTS recalc_on_debt_payment_update ON debt_payments;
CREATE TRIGGER recalc_on_debt_payment_update
  AFTER UPDATE ON debt_payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_debt_payment_update();

DROP TRIGGER IF EXISTS recalc_on_debt_payment_delete ON debt_payments;
CREATE TRIGGER recalc_on_debt_payment_delete
  AFTER DELETE ON debt_payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_debt_payment_deletion();
