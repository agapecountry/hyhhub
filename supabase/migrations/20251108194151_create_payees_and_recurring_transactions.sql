/*
  # Create Payees and Recurring Transactions System

  1. New Tables
    - `payees`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `name` (text, not null) - Name of the payee/payer
      - `default_category_id` (uuid, foreign key to transaction_categories) - Auto-fill category
      - `default_transaction_type` (text) - 'deposit' or 'withdraw'
      - `notes` (text) - Optional notes about this payee
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `recurring_transactions`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `account_id` (uuid, foreign key to accounts)
      - `payee_id` (uuid, foreign key to payees)
      - `category_id` (uuid, foreign key to transaction_categories)
      - `transaction_type` (text) - 'deposit' or 'withdraw'
      - `amount` (decimal, positive value)
      - `description` (text)
      - `frequency` (text) - 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
      - `start_date` (date) - When to start generating transactions
      - `end_date` (date, nullable) - Optional end date
      - `next_due_date` (date) - Next scheduled transaction date
      - `is_active` (boolean) - Whether to continue generating
      - `debt_id` (uuid, nullable, foreign key to debts)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `payee_id` to transactions table
    - Add `recurring_transaction_id` to transactions table

  3. Security
    - Enable RLS on both tables
    - Policies for household members to manage payees and recurring transactions

  4. Indexes
    - Foreign key indexes for performance
    - Index on next_due_date for recurring transaction processing

  5. Functions
    - Function to process recurring transactions (run daily via cron)
    - Trigger to update next_due_date after transaction creation
*/

-- Create payees table
CREATE TABLE IF NOT EXISTS payees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  default_category_id uuid REFERENCES transaction_categories(id) ON DELETE SET NULL,
  default_transaction_type text CHECK (default_transaction_type IN ('deposit', 'withdraw')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create recurring_transactions table
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  payee_id uuid REFERENCES payees(id) ON DELETE SET NULL,
  category_id uuid REFERENCES transaction_categories(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit', 'withdraw')),
  amount decimal(12, 2) NOT NULL CHECK (amount > 0),
  description text,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  start_date date NOT NULL,
  end_date date,
  next_due_date date NOT NULL,
  is_active boolean DEFAULT true,
  debt_id uuid REFERENCES debts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add payee_id and recurring_transaction_id to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'payee_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN payee_id uuid REFERENCES payees(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurring_transaction_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurring_transaction_id uuid REFERENCES recurring_transactions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payees_household_id ON payees(household_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_household_id ON recurring_transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_account_id ON recurring_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_due_date ON recurring_transactions(next_due_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_transactions_payee_id ON transactions(payee_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_id ON transactions(recurring_transaction_id);

-- Enable RLS
ALTER TABLE payees ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payees
CREATE POLICY "Users can view household payees"
  ON payees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payees.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create payees in their household"
  ON payees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payees.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household payees"
  ON payees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payees.household_id
      AND household_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payees.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household payees"
  ON payees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payees.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- RLS Policies for recurring_transactions
CREATE POLICY "Users can view household recurring transactions"
  ON recurring_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recurring_transactions.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recurring transactions in their household"
  ON recurring_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recurring_transactions.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household recurring transactions"
  ON recurring_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recurring_transactions.household_id
      AND household_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recurring_transactions.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household recurring transactions"
  ON recurring_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recurring_transactions.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Function to calculate next due date
CREATE OR REPLACE FUNCTION calculate_next_due_date(
  from_date date,
  frequency_type text
) RETURNS date AS $$
BEGIN
  CASE frequency_type
    WHEN 'daily' THEN
      RETURN from_date + interval '1 day';
    WHEN 'weekly' THEN
      RETURN from_date + interval '1 week';
    WHEN 'biweekly' THEN
      RETURN from_date + interval '2 weeks';
    WHEN 'monthly' THEN
      RETURN from_date + interval '1 month';
    WHEN 'quarterly' THEN
      RETURN from_date + interval '3 months';
    WHEN 'yearly' THEN
      RETURN from_date + interval '1 year';
    ELSE
      RETURN from_date;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process recurring transactions
CREATE OR REPLACE FUNCTION process_recurring_transactions() RETURNS void AS $$
DECLARE
  rec_transaction RECORD;
  new_transaction_id uuid;
  actual_amount decimal(12, 2);
BEGIN
  FOR rec_transaction IN
    SELECT * FROM recurring_transactions
    WHERE is_active = true
    AND next_due_date <= CURRENT_DATE
    AND (end_date IS NULL OR next_due_date <= end_date)
  LOOP
    -- Calculate actual amount (negative for withdrawals)
    IF rec_transaction.transaction_type = 'withdraw' THEN
      actual_amount := -1 * rec_transaction.amount;
    ELSE
      actual_amount := rec_transaction.amount;
    END IF;

    -- Create the transaction
    INSERT INTO transactions (
      account_id,
      household_id,
      transaction_date,
      amount,
      description,
      category_id,
      payee_id,
      debt_id,
      recurring_transaction_id
    ) VALUES (
      rec_transaction.account_id,
      rec_transaction.household_id,
      rec_transaction.next_due_date,
      actual_amount,
      rec_transaction.description,
      rec_transaction.category_id,
      rec_transaction.payee_id,
      rec_transaction.debt_id,
      rec_transaction.id
    ) RETURNING id INTO new_transaction_id;

    -- Update next_due_date
    UPDATE recurring_transactions
    SET 
      next_due_date = calculate_next_due_date(next_due_date, frequency),
      updated_at = now()
    WHERE id = rec_transaction.id;

    -- Deactivate if we've passed the end date
    IF rec_transaction.end_date IS NOT NULL AND 
       calculate_next_due_date(rec_transaction.next_due_date, rec_transaction.frequency) > rec_transaction.end_date THEN
      UPDATE recurring_transactions
      SET is_active = false, updated_at = now()
      WHERE id = rec_transaction.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payees_updated_at
  BEFORE UPDATE ON payees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_transactions_updated_at
  BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
