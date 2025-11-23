/*
  # Create Paycheck Planner Manual Payment Tracking

  1. New Tables
    - `paycheck_planner_payments`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `payment_type` (text) - Type: 'bill', 'debt', 'budget'
      - `payment_id` (uuid) - Reference to bills.id, debts.id, or budget_categories.id
      - `paycheck_date` (date) - The paycheck date this payment was assigned to
      - `is_paid` (boolean) - Manual paid status
      - `is_dismissed` (boolean) - If removed from unassigned list
      - `paid_date` (date) - When marked as paid
      - `marked_by` (uuid, foreign key to users)
      - `notes` (text) - Optional notes
      - `created_at` (timestamptz)

  2. Purpose
    - Track manual "paid" status for cash payments not in transaction history
    - Track dismissed/removed unassigned payments
    - Allow users to manually manage payment status in planner

  3. Security
    - Enable RLS
    - Household members can manage their household's payment tracking
*/

-- Create paycheck_planner_payments table
CREATE TABLE IF NOT EXISTS paycheck_planner_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  payment_type text NOT NULL CHECK (payment_type IN ('bill', 'debt', 'budget')),
  payment_id uuid NOT NULL,
  paycheck_date date,
  is_paid boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  paid_date date,
  marked_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_paycheck_planner_payments_household_id 
  ON paycheck_planner_payments(household_id);

CREATE INDEX IF NOT EXISTS idx_paycheck_planner_payments_payment_lookup
  ON paycheck_planner_payments(household_id, payment_type, payment_id);

CREATE INDEX IF NOT EXISTS idx_paycheck_planner_payments_paycheck_date
  ON paycheck_planner_payments(household_id, paycheck_date) 
  WHERE paycheck_date IS NOT NULL;

-- Enable RLS
ALTER TABLE paycheck_planner_payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Household members can view planner payments"
  ON paycheck_planner_payments FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can create planner payments"
  ON paycheck_planner_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update planner payments"
  ON paycheck_planner_payments FOR UPDATE
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

CREATE POLICY "Household members can delete planner payments"
  ON paycheck_planner_payments FOR DELETE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_paycheck_planner_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_paycheck_planner_payments_updated_at
  BEFORE UPDATE ON paycheck_planner_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_paycheck_planner_payments_updated_at();
