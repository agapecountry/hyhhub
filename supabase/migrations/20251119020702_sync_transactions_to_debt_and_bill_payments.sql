/*
  # Sync Transactions to Debt and Bill Payments

  1. Purpose
    - Automatically create debt payment records when a transaction is linked to a debt payee
    - Automatically create bill payment records when a transaction is linked to a bill payee
    - Update debt balance when payments are recorded
    - Keep transaction_id references for traceability

  2. Changes
    - Create function to sync transaction to debt payment
    - Create function to sync transaction to bill payment
    - Create trigger on transactions table for inserts and updates
    - Create function to update debt balance after payment

  3. Security
    - Functions run with SECURITY DEFINER to bypass RLS for internal operations
    - All operations are scoped to the transaction's household_id
*/

-- Function to calculate debt payment breakdown (principal vs interest)
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
  v_monthly_interest numeric;
  v_interest_amount numeric;
  v_principal_amount numeric;
BEGIN
  -- Get current debt info
  SELECT current_balance, interest_rate
  INTO v_current_balance, v_interest_rate
  FROM debts
  WHERE id = p_debt_id;

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

-- Function to sync transaction to debt payment
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
    -- Calculate payment breakdown
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

      -- Update debt balance
      UPDATE debts
      SET current_balance = v_payment_breakdown.new_balance
      WHERE id = v_debt_id;
    ELSE
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

      -- Update debt balance
      UPDATE debts
      SET current_balance = v_payment_breakdown.new_balance
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

-- Create trigger on transactions
DROP TRIGGER IF EXISTS sync_transaction_to_payments ON transactions;
CREATE TRIGGER sync_transaction_to_payments
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION sync_transaction_to_debt_payment();

-- Handle transaction deletions
CREATE OR REPLACE FUNCTION handle_transaction_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_debt_id uuid;
  v_total_paid numeric;
BEGIN
  -- Get debt_id from debt_payments
  SELECT debt_id INTO v_debt_id
  FROM debt_payments
  WHERE transaction_id = OLD.id;

  -- Delete associated debt payment
  DELETE FROM debt_payments WHERE transaction_id = OLD.id;

  -- Delete associated bill payment
  DELETE FROM bill_payments WHERE transaction_id = OLD.id;

  -- If this was a debt payment, recalculate the debt balance
  IF v_debt_id IS NOT NULL THEN
    -- Sum all remaining debt payments for this debt
    SELECT COALESCE(SUM(principal_paid), 0) INTO v_total_paid
    FROM debt_payments
    WHERE debt_id = v_debt_id;

    -- Update debt balance (original - total paid)
    UPDATE debts
    SET current_balance = original_balance - v_total_paid
    WHERE id = v_debt_id;
  END IF;

  RETURN OLD;
END;
$$;

-- Create trigger for deletions
DROP TRIGGER IF EXISTS handle_transaction_deletion_trigger ON transactions;
CREATE TRIGGER handle_transaction_deletion_trigger
  BEFORE DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_transaction_deletion();
