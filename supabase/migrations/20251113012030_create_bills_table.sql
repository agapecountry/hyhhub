/*
  # Create Bills Table

  1. New Tables
    - `bills`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `company` (text, company/biller name)
      - `account_number` (text, optional account number)
      - `due_date` (integer, day of month 1-31)
      - `frequency` (text, monthly/yearly/quarterly/biannual)
      - `amount` (numeric, bill amount)
      - `notes` (text, optional notes)
      - `is_active` (boolean, whether bill is still active)
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `bills` table
    - Add policies for household members to manage bills
    
  3. Indexes
    - Add index on household_id for faster queries
    - Add index on due_date for sorting
*/

-- Create bills table
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  company text NOT NULL,
  account_number text,
  due_date integer NOT NULL CHECK (due_date >= 1 AND due_date <= 31),
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'yearly', 'quarterly', 'biannual')),
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bills_household_id ON bills(household_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_is_active ON bills(is_active);

-- Enable RLS
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Household members can view bills"
  ON bills FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = bills.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can create bills"
  ON bills FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = bills.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update bills"
  ON bills FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = bills.household_id
      AND household_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = bills.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete bills"
  ON bills FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = bills.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS set_bills_updated_at ON bills;
CREATE TRIGGER set_bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW
  EXECUTE FUNCTION update_bills_updated_at();
