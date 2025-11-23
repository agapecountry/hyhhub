/*
  # Create Transactions Schema

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key)
      - `account_id` (uuid, foreign key) - Links to accounts table
      - `household_id` (uuid, foreign key) - For RLS performance
      - `date` (date) - Transaction date
      - `description` (text) - Transaction description
      - `amount` (numeric) - Transaction amount (positive = credit/deposit, negative = debit/withdrawal)
      - `category` (text) - Optional category
      - `notes` (text) - Optional notes
      - `is_pending` (boolean) - Whether transaction is pending
      - `plaid_transaction_id` (text) - For Plaid synced transactions
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `transactions` table
    - Members can view transactions for accounts they can access
    - Admins and co-parents can insert/update/delete manual transactions
    - Plaid transactions are read-only (managed by sync)

  3. Performance
    - Index on account_id for fast lookups
    - Index on household_id for RLS performance
    - Index on date for chronological queries
    - Index on plaid_transaction_id for sync operations
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  category text,
  notes text,
  is_pending boolean DEFAULT false,
  plaid_transaction_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_household_id ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_plaid_id ON transactions(plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL;

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Members can view transactions for accounts in their household
CREATE POLICY "Members can view transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transactions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co_parent', 'teen')
    )
  );

-- Admins and co-parents can insert manual transactions
CREATE POLICY "Admins and co-parents can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    plaid_transaction_id IS NULL
    AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transactions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

-- Admins and co-parents can update manual transactions only
CREATE POLICY "Admins and co-parents can update manual transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    plaid_transaction_id IS NULL
    AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transactions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co_parent')
    )
  )
  WITH CHECK (
    plaid_transaction_id IS NULL
    AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transactions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

-- Admins and co-parents can delete manual transactions only
CREATE POLICY "Admins and co-parents can delete manual transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (
    plaid_transaction_id IS NULL
    AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transactions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();
