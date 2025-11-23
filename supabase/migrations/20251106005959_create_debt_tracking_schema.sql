/*
  # Create Debt Tracking Schema

  1. New Tables
    - `debts`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `name` (text) - loan/debt name (e.g., "Car Loan", "Student Loan")
      - `type` (text) - type of debt (mortgage, auto, student, credit_card, personal, other)
      - `original_balance` (numeric) - starting balance
      - `current_balance` (numeric) - remaining balance
      - `interest_rate` (numeric) - annual interest rate percentage
      - `minimum_payment` (numeric) - minimum monthly payment
      - `payment_day` (integer) - day of month payment is due (1-31)
      - `lender` (text) - name of lender/creditor
      - `account_number_last4` (text) - last 4 digits of account
      - `payoff_strategy` (text) - snowball, avalanche, or custom
      - `extra_payment` (numeric) - additional payment amount
      - `is_active` (boolean) - whether debt is still being paid
      - `created_at` (timestamptz)
      - `paid_off_at` (timestamptz) - when debt was paid off

    - `debt_payments`
      - `id` (uuid, primary key)
      - `debt_id` (uuid, foreign key to debts)
      - `household_id` (uuid, foreign key to households)
      - `amount` (numeric) - payment amount
      - `payment_date` (date) - when payment was made
      - `principal_paid` (numeric) - amount toward principal
      - `interest_paid` (numeric) - amount toward interest
      - `remaining_balance` (numeric) - balance after payment
      - `notes` (text) - optional notes
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Policies for household members to manage their debts
    - Policies for viewing and tracking payments

  3. Indexes
    - Index on household_id for efficient queries
    - Index on debt_id for payment lookups
*/

-- Create debts table
CREATE TABLE IF NOT EXISTS debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other',
  original_balance numeric(12, 2) NOT NULL,
  current_balance numeric(12, 2) NOT NULL,
  interest_rate numeric(5, 3) NOT NULL DEFAULT 0,
  minimum_payment numeric(12, 2) NOT NULL,
  payment_day integer CHECK (payment_day >= 1 AND payment_day <= 31),
  lender text,
  account_number_last4 text,
  payoff_strategy text DEFAULT 'snowball',
  extra_payment numeric(12, 2) DEFAULT 0,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  paid_off_at timestamptz
);

-- Create debt_payments table
CREATE TABLE IF NOT EXISTS debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id uuid NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  principal_paid numeric(12, 2) NOT NULL,
  interest_paid numeric(12, 2) NOT NULL,
  remaining_balance numeric(12, 2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_debts_household ON debts(household_id);
CREATE INDEX IF NOT EXISTS idx_debts_active ON debts(household_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_household ON debt_payments(household_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON debt_payments(payment_date DESC);

-- Enable RLS
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for debts table
CREATE POLICY "Household members can view debts"
  ON debts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can insert debts"
  ON debts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update debts"
  ON debts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete debts"
  ON debts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- RLS Policies for debt_payments table
CREATE POLICY "Household members can view payments"
  ON debt_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debt_payments.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can insert payments"
  ON debt_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debt_payments.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update payments"
  ON debt_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debt_payments.household_id
      AND household_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debt_payments.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete payments"
  ON debt_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debt_payments.household_id
      AND household_members.user_id = auth.uid()
    )
  );
