/*
  # Create Paycheck Scheduled Payments Table

  1. Purpose
    - Store the scheduled payment assignments for each paycheck period
    - Lock in assignments once paycheck date passes (no rescheduling)
    - Preserve historical record of what was scheduled

  2. Table Structure
    - `id` (uuid, primary key)
    - `household_id` (uuid, foreign key to households)
    - `paycheck_id` (uuid, foreign key to paycheck_settings)
    - `paycheck_date` (date) - The specific paycheck date
    - `payment_type` (text) - 'bill', 'debt', 'extra-debt', 'budget'
    - `payment_id` (uuid) - Reference to the bill/debt/budget
    - `payment_name` (text) - Snapshot of name at time of scheduling
    - `amount` (numeric) - Snapshot of amount at time of scheduling
    - `due_date` (date) - The payment's due date
    - `is_paid` (boolean) - Whether marked as paid
    - `is_split` (boolean) - Whether this is a split payment
    - `split_part` (text) - 'Part 1', 'Part 2', etc.
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  3. Security
    - Enable RLS
    - Household members can manage their scheduled payments
*/

-- Create paycheck_scheduled_payments table
CREATE TABLE IF NOT EXISTS paycheck_scheduled_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  paycheck_id uuid NOT NULL REFERENCES paycheck_settings(id) ON DELETE CASCADE,
  paycheck_date date NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('bill', 'debt', 'extra-debt', 'budget')),
  payment_id uuid NOT NULL,
  payment_name text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  due_date date NOT NULL,
  is_paid boolean DEFAULT false,
  is_split boolean DEFAULT false,
  split_part text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_paycheck_scheduled_payments_household 
  ON paycheck_scheduled_payments(household_id);

CREATE INDEX IF NOT EXISTS idx_paycheck_scheduled_payments_paycheck 
  ON paycheck_scheduled_payments(household_id, paycheck_id, paycheck_date);

CREATE INDEX IF NOT EXISTS idx_paycheck_scheduled_payments_date 
  ON paycheck_scheduled_payments(household_id, paycheck_date);

-- Enable RLS
ALTER TABLE paycheck_scheduled_payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Household members can view scheduled payments"
  ON paycheck_scheduled_payments FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can create scheduled payments"
  ON paycheck_scheduled_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update scheduled payments"
  ON paycheck_scheduled_payments FOR UPDATE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete scheduled payments"
  ON paycheck_scheduled_payments FOR DELETE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Update trigger
CREATE OR REPLACE FUNCTION update_paycheck_scheduled_payments_updated_at()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_paycheck_scheduled_payments_updated_at
  BEFORE UPDATE ON paycheck_scheduled_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_paycheck_scheduled_payments_updated_at();
