/*
  # Create Plaid Integration Tables

  1. New Tables
    - `plaid_items` - Stores Plaid item connections (bank login connections)
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `item_id` (text) - Plaid's item identifier
      - `access_token` (text) - Encrypted access token for Plaid API
      - `institution_id` (text) - Bank institution identifier
      - `institution_name` (text) - Bank name
      - `status` (text) - Connection status (active, error, disconnected)
      - `last_synced_at` (timestamptz) - Last successful sync
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `plaid_accounts` - Stores individual bank accounts from Plaid
      - `id` (uuid, primary key)
      - `plaid_item_id` (uuid, foreign key to plaid_items)
      - `account_id` (text) - Plaid's account identifier
      - `household_id` (uuid, foreign key to households)
      - `name` (text) - Account name from bank
      - `official_name` (text, nullable) - Official account name
      - `type` (text) - Account type (depository, credit, loan, investment)
      - `subtype` (text, nullable) - Account subtype (checking, savings, credit card, etc)
      - `mask` (text, nullable) - Last 4 digits of account number
      - `current_balance` (numeric) - Current account balance
      - `available_balance` (numeric, nullable) - Available balance
      - `currency_code` (text) - Currency code (USD, etc)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `plaid_transactions` - Stores transactions from Plaid (temporary staging)
      - `id` (uuid, primary key)
      - `plaid_account_id` (uuid, foreign key to plaid_accounts)
      - `transaction_id` (text, unique) - Plaid's transaction identifier
      - `household_id` (uuid, foreign key to households)
      - `amount` (numeric) - Transaction amount
      - `date` (date) - Transaction date
      - `name` (text) - Transaction name/description
      - `merchant_name` (text, nullable) - Merchant name if available
      - `category` (jsonb) - Plaid's category array
      - `pending` (boolean) - Whether transaction is pending
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for household members to view their data
    - Add policies for authenticated users to manage connections
    - Service role can bypass RLS for webhook operations

  3. Indexes
    - Foreign key indexes for performance
    - Unique constraints on external identifiers
    - Index on status fields for filtering
*/

-- Create plaid_items table
CREATE TABLE IF NOT EXISTS plaid_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_id text NOT NULL UNIQUE,
  access_token text NOT NULL,
  institution_id text NOT NULL,
  institution_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create plaid_accounts table
CREATE TABLE IF NOT EXISTS plaid_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_item_id uuid NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  official_name text,
  type text NOT NULL,
  subtype text,
  mask text,
  current_balance numeric(12, 2) NOT NULL DEFAULT 0,
  available_balance numeric(12, 2),
  currency_code text NOT NULL DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(plaid_item_id, account_id)
);

-- Create plaid_transactions table (staging for webhook data)
CREATE TABLE IF NOT EXISTS plaid_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_account_id uuid NOT NULL REFERENCES plaid_accounts(id) ON DELETE CASCADE,
  transaction_id text NOT NULL UNIQUE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  date date NOT NULL,
  name text NOT NULL,
  merchant_name text,
  category jsonb DEFAULT '[]'::jsonb,
  pending boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_plaid_items_household_id ON plaid_items(household_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_item_id ON plaid_items(item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_status ON plaid_items(status);

CREATE INDEX IF NOT EXISTS idx_plaid_accounts_plaid_item_id ON plaid_accounts(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_household_id ON plaid_accounts(household_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_account_id ON plaid_accounts(account_id);

CREATE INDEX IF NOT EXISTS idx_plaid_transactions_plaid_account_id ON plaid_transactions(plaid_account_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_household_id ON plaid_transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_transaction_id ON plaid_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_date ON plaid_transactions(date);

-- Enable RLS
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plaid_items
CREATE POLICY "Household members can view plaid items"
  ON plaid_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_items.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can insert plaid items"
  ON plaid_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_items.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update plaid items"
  ON plaid_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_items.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete plaid items"
  ON plaid_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_items.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- RLS Policies for plaid_accounts
CREATE POLICY "Household members can view plaid accounts"
  ON plaid_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_accounts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can insert plaid accounts"
  ON plaid_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_accounts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update plaid accounts"
  ON plaid_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_accounts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete plaid accounts"
  ON plaid_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_accounts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- RLS Policies for plaid_transactions
CREATE POLICY "Household members can view plaid transactions"
  ON plaid_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_transactions.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can insert plaid transactions"
  ON plaid_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_transactions.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update plaid transactions"
  ON plaid_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_transactions.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete plaid transactions"
  ON plaid_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_transactions.household_id
      AND household_members.user_id = auth.uid()
    )
  );
