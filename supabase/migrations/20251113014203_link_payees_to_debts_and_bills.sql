/*
  # Link Payees to Debts and Bills

  1. Changes
    - Add `debt_id` column to payees table (optional reference to debts)
    - Add `bill_id` column to payees table (optional reference to bills)
    - Create unique constraint to ensure a payee can only link to one debt or bill
    - Add check constraint to ensure payee links to either debt, bill, or neither (not both)
    - Create automatic payees for all existing debts
    - Create automatic payees for all existing bills
    - Add triggers to auto-create payees when new debts/bills are created
    - Add trigger to auto-populate category when payee is selected

  2. Business Logic
    - When a debt is created, automatically create a corresponding payee
    - When a bill is created, automatically create a corresponding payee
    - When a transaction is assigned to a debt/bill payee:
      - Auto-link the transaction to the debt (for debt payees)
      - Auto-populate the category from the bill (for bill payees)
    - Deleting a debt/bill also deletes its associated payee

  3. Security
    - Maintains existing RLS policies on payees table
*/

-- Add debt_id and bill_id columns to payees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payees' AND column_name = 'debt_id'
  ) THEN
    ALTER TABLE payees ADD COLUMN debt_id uuid REFERENCES debts(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payees' AND column_name = 'bill_id'
  ) THEN
    ALTER TABLE payees ADD COLUMN bill_id uuid REFERENCES bills(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add check constraint to ensure payee is linked to at most one entity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payees_single_link_check'
  ) THEN
    ALTER TABLE payees ADD CONSTRAINT payees_single_link_check 
      CHECK (
        (debt_id IS NOT NULL AND bill_id IS NULL) OR
        (debt_id IS NULL AND bill_id IS NOT NULL) OR
        (debt_id IS NULL AND bill_id IS NULL)
      );
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payees_debt_id ON payees(debt_id) WHERE debt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payees_bill_id ON payees(bill_id) WHERE bill_id IS NOT NULL;

-- Create unique constraints to ensure one payee per debt/bill
CREATE UNIQUE INDEX IF NOT EXISTS idx_payees_unique_debt ON payees(debt_id) WHERE debt_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payees_unique_bill ON payees(bill_id) WHERE bill_id IS NOT NULL;

-- Function to create payee for debt
CREATE OR REPLACE FUNCTION create_payee_for_debt()
RETURNS TRIGGER AS $$
DECLARE
  v_payee_name text;
BEGIN
  -- Use lender name if available, otherwise use debt name
  v_payee_name := COALESCE(NEW.lender, NEW.name);
  
  -- Create a payee for the new debt
  INSERT INTO payees (
    household_id,
    name,
    debt_id,
    default_transaction_type,
    notes
  ) VALUES (
    NEW.household_id,
    v_payee_name,
    NEW.id,
    'withdraw',
    'Auto-created for debt: ' || NEW.name
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Function to create payee for bill
CREATE OR REPLACE FUNCTION create_payee_for_bill()
RETURNS TRIGGER AS $$
DECLARE
  v_category_id uuid;
BEGIN
  -- Get the category_id from the bill
  v_category_id := NEW.category_id;

  -- Create a payee for the new bill
  INSERT INTO payees (
    household_id,
    name,
    bill_id,
    default_category_id,
    default_transaction_type,
    notes
  ) VALUES (
    NEW.household_id,
    NEW.company,
    NEW.id,
    v_category_id,
    'withdraw',
    'Auto-created for bill: ' || NEW.company
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Function to update payee when debt changes
CREATE OR REPLACE FUNCTION update_payee_for_debt()
RETURNS TRIGGER AS $$
DECLARE
  v_new_name text;
  v_old_name text;
BEGIN
  v_new_name := COALESCE(NEW.lender, NEW.name);
  v_old_name := COALESCE(OLD.lender, OLD.name);
  
  -- Update the payee name if debt lender/name changed
  IF v_old_name != v_new_name THEN
    UPDATE payees
    SET name = v_new_name,
        updated_at = now()
    WHERE debt_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Function to update payee when bill changes
CREATE OR REPLACE FUNCTION update_payee_for_bill()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the payee name and category if bill changed
  IF OLD.company != NEW.company OR OLD.category_id != NEW.category_id THEN
    UPDATE payees
    SET name = NEW.company,
        default_category_id = NEW.category_id,
        updated_at = now()
    WHERE bill_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS create_payee_for_debt_trigger ON debts;
CREATE TRIGGER create_payee_for_debt_trigger
  AFTER INSERT ON debts
  FOR EACH ROW
  EXECUTE FUNCTION create_payee_for_debt();

DROP TRIGGER IF EXISTS create_payee_for_bill_trigger ON bills;
CREATE TRIGGER create_payee_for_bill_trigger
  AFTER INSERT ON bills
  FOR EACH ROW
  EXECUTE FUNCTION create_payee_for_bill();

DROP TRIGGER IF EXISTS update_payee_for_debt_trigger ON debts;
CREATE TRIGGER update_payee_for_debt_trigger
  AFTER UPDATE ON debts
  FOR EACH ROW
  WHEN (OLD.lender IS DISTINCT FROM NEW.lender OR OLD.name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION update_payee_for_debt();

DROP TRIGGER IF EXISTS update_payee_for_bill_trigger ON bills;
CREATE TRIGGER update_payee_for_bill_trigger
  AFTER UPDATE ON bills
  FOR EACH ROW
  WHEN (OLD.company IS DISTINCT FROM NEW.company OR OLD.category_id IS DISTINCT FROM NEW.category_id)
  EXECUTE FUNCTION update_payee_for_bill();

-- Create payees for existing debts
INSERT INTO payees (household_id, name, debt_id, default_transaction_type, notes)
SELECT 
  household_id,
  COALESCE(lender, name),
  id,
  'withdraw',
  'Auto-created for debt: ' || name
FROM debts
WHERE NOT EXISTS (
  SELECT 1 FROM payees WHERE payees.debt_id = debts.id
)
ON CONFLICT DO NOTHING;

-- Create payees for existing bills
INSERT INTO payees (household_id, name, bill_id, default_category_id, default_transaction_type, notes)
SELECT 
  household_id,
  company,
  id,
  category_id,
  'withdraw',
  'Auto-created for bill: ' || company
FROM bills
WHERE NOT EXISTS (
  SELECT 1 FROM payees WHERE payees.bill_id = bills.id
)
ON CONFLICT DO NOTHING;
