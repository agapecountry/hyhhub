/*
  # Auto-Link Transactions to Payee Entities

  1. Changes
    - Create trigger to automatically link transactions to debts when payee is debt-linked
    - Create trigger to automatically populate category when payee is bill-linked
    - Update transaction when payee is changed

  2. Business Logic
    - When a transaction's payee_id is set to a debt-linked payee:
      - Automatically set transaction.debt_id to the payee's debt_id
    - When a transaction's payee_id is set to a bill-linked payee:
      - Automatically set transaction category to the bill's category
    - When payee changes, update debt_id and category accordingly
*/

-- Function to auto-link transaction to debt/bill based on payee
CREATE OR REPLACE FUNCTION auto_link_transaction_to_payee_entity()
RETURNS TRIGGER AS $$
DECLARE
  v_payee RECORD;
BEGIN
  -- Only process if payee_id is set
  IF NEW.payee_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the payee details
  SELECT 
    debt_id, 
    bill_id, 
    default_category_id
  INTO v_payee
  FROM payees
  WHERE id = NEW.payee_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- If payee is linked to a debt, auto-link the transaction to that debt
  IF v_payee.debt_id IS NOT NULL THEN
    NEW.debt_id := v_payee.debt_id;
  END IF;

  -- If payee is linked to a bill and transaction doesn't have a category, use bill's category
  IF v_payee.bill_id IS NOT NULL AND v_payee.default_category_id IS NOT NULL THEN
    -- Only set category if not already set
    IF NEW.category_id IS NULL THEN
      NEW.category_id := v_payee.default_category_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create trigger for new transactions
DROP TRIGGER IF EXISTS auto_link_transaction_to_payee_entity_trigger ON transactions;
CREATE TRIGGER auto_link_transaction_to_payee_entity_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  WHEN (NEW.payee_id IS NOT NULL)
  EXECUTE FUNCTION auto_link_transaction_to_payee_entity();
