/*
  # Create Bill Payments Table

  1. Purpose
    - Track individual bill payments
    - Link transactions to bill records
    - Support bill payment history and analytics

  2. Table Structure
    - `id` (uuid, primary key)
    - `bill_id` (uuid, foreign key to bills)
    - `household_id` (uuid, foreign key to households)
    - `transaction_id` (uuid, foreign key to transactions) - NULLABLE, SET NULL on delete
    - `amount` (numeric) - payment amount
    - `payment_date` (date) - when payment was made
    - `notes` (text) - optional notes
    - `created_at` (timestamptz)

  3. Foreign Key Behavior
    - bill_id: CASCADE (if bill deleted, delete payments)
    - household_id: CASCADE (if household deleted, delete payments)
    - transaction_id: SET NULL (if transaction deleted, keep payment record but unlink)

  4. Security
    - Enable RLS
    - Household members can view/manage bill payments
*/

-- Create bill_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS bill_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  amount numeric(12, 2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes (drop duplicate first if exists)
DROP INDEX IF EXISTS idx_bill_payments_bill_id;
CREATE INDEX IF NOT EXISTS idx_bill_payments_bill ON bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_household ON bill_payments(household_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_transaction ON bill_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_date ON bill_payments(payment_date DESC);

-- Enable RLS
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view bill payments in their household" ON bill_payments;
  DROP POLICY IF EXISTS "Users can create bill payments in their household" ON bill_payments;
  DROP POLICY IF EXISTS "Users can update bill payments in their household" ON bill_payments;
  DROP POLICY IF EXISTS "Users can delete bill payments in their household" ON bill_payments;
END $$;

-- Create optimized RLS policies
CREATE POLICY "Users can view bill payments in their household"
  ON bill_payments
  FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_members.household_id
      FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create bill payments in their household"
  ON bill_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_members.household_id
      FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update bill payments in their household"
  ON bill_payments
  FOR UPDATE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_members.household_id
      FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete bill payments in their household"
  ON bill_payments
  FOR DELETE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_members.household_id
      FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
    )
  );

-- Add comments
COMMENT ON TABLE bill_payments IS 'Tracks individual payments made towards bills';
COMMENT ON COLUMN bill_payments.transaction_id IS 'Links to transaction record. SET NULL if transaction is deleted to preserve payment history.';
