/*
  # Add Debt Link to Transactions

  1. Changes
    - Add `debt_id` column to transactions table
    - Add foreign key constraint to debts table
    - Add index for performance
    - Create trigger to automatically update debt balance when linked transactions change
    - Create trigger to record debt payments in debt_payments table

  2. Security
    - Maintains existing RLS policies
    - Ensures debt and transaction belong to same household

  3. Business Logic
    - When a transaction is linked to a debt, it automatically creates/updates debt payment records
    - Negative amounts (payments) reduce the debt balance
    - Updates are bidirectional - changing transaction updates debt, deleting transaction reverses payment
*/

-- Add debt_id column to transactions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'debt_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN debt_id uuid REFERENCES debts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_debt_id ON transactions(debt_id) WHERE debt_id IS NOT NULL;

-- Function to sync transaction to debt payment
CREATE OR REPLACE FUNCTION sync_transaction_to_debt()
RETURNS TRIGGER AS $$
DECLARE
  v_debt_record RECORD;
  v_payment_amount numeric;
BEGIN
  -- Only process if transaction is linked to a debt
  IF NEW.debt_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the debt record
  SELECT * INTO v_debt_record FROM debts WHERE id = NEW.debt_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debt not found';
  END IF;

  -- Ensure debt and transaction are in the same household
  IF v_debt_record.household_id != NEW.household_id THEN
    RAISE EXCEPTION 'Transaction and debt must belong to the same household';
  END IF;

  -- Payment amount is the absolute value of negative amounts (payments reduce debt)
  -- If amount is negative, it's a payment (reduces debt)
  -- If amount is positive, it's a reversal/refund (increases debt)
  v_payment_amount := -NEW.amount;

  -- Insert or update debt payment record
  INSERT INTO debt_payments (
    debt_id,
    household_id,
    amount,
    payment_date,
    notes,
    transaction_id
  )
  VALUES (
    NEW.debt_id,
    NEW.household_id,
    v_payment_amount,
    NEW.date,
    COALESCE(NEW.notes, NEW.description),
    NEW.id
  )
  ON CONFLICT (transaction_id)
  DO UPDATE SET
    amount = v_payment_amount,
    payment_date = NEW.date,
    notes = COALESCE(NEW.notes, NEW.description),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle transaction deletion
CREATE OR REPLACE FUNCTION handle_debt_transaction_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- If transaction was linked to a debt, remove the payment record
  IF OLD.debt_id IS NOT NULL THEN
    DELETE FROM debt_payments WHERE transaction_id = OLD.id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle transaction debt link changes
CREATE OR REPLACE FUNCTION handle_debt_link_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If debt_id changed from one debt to another or to NULL
  IF OLD.debt_id IS NOT NULL AND (NEW.debt_id IS NULL OR NEW.debt_id != OLD.debt_id) THEN
    -- Remove old debt payment
    DELETE FROM debt_payments WHERE transaction_id = OLD.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS sync_transaction_to_debt_trigger ON transactions;
CREATE TRIGGER sync_transaction_to_debt_trigger
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  WHEN (NEW.debt_id IS NOT NULL)
  EXECUTE FUNCTION sync_transaction_to_debt();

DROP TRIGGER IF EXISTS handle_debt_transaction_deletion_trigger ON transactions;
CREATE TRIGGER handle_debt_transaction_deletion_trigger
  BEFORE DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION handle_debt_transaction_deletion();

DROP TRIGGER IF EXISTS handle_debt_link_change_trigger ON transactions;
CREATE TRIGGER handle_debt_link_change_trigger
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  WHEN (OLD.debt_id IS DISTINCT FROM NEW.debt_id)
  EXECUTE FUNCTION handle_debt_link_change();

-- Add transaction_id to debt_payments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'debt_payments' AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE debt_payments ADD COLUMN transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE;
    CREATE UNIQUE INDEX idx_debt_payments_transaction_id ON debt_payments(transaction_id) WHERE transaction_id IS NOT NULL;
  END IF;
END $$;
