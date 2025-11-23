/*
  # Add Auto-Matching Columns to Plaid Transactions

  1. Changes to plaid_transactions
    - Add `bill_id` to link to bills
    - Add `debt_id` to link to debts  
    - Add `category_id` to store auto-assigned category
    - Add `auto_matched` boolean to track if auto-matched
    - Add `match_confidence` to store confidence level
    
  2. Purpose
    - Enable automatic matching of Plaid transactions to bills/debts
    - Enable automatic category assignment based on Plaid data
    - Track which transactions were auto-matched vs user-assigned
*/

-- Add matching columns to plaid_transactions
ALTER TABLE plaid_transactions
ADD COLUMN IF NOT EXISTS bill_id uuid REFERENCES bills(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS debt_id uuid REFERENCES debts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES transaction_categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS auto_matched boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS match_confidence text CHECK (match_confidence IN ('high', 'medium', 'low'));

-- Add comments for clarity
COMMENT ON COLUMN plaid_transactions.bill_id IS 'Linked bill if auto-matched';
COMMENT ON COLUMN plaid_transactions.debt_id IS 'Linked debt if auto-matched';
COMMENT ON COLUMN plaid_transactions.category_id IS 'Category (auto-assigned or user-set)';
COMMENT ON COLUMN plaid_transactions.auto_matched IS 'True if automatically matched to bill/debt/category';
COMMENT ON COLUMN plaid_transactions.match_confidence IS 'Confidence level of auto-match';

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_bill_id ON plaid_transactions(bill_id) WHERE bill_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_debt_id ON plaid_transactions(debt_id) WHERE debt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_category_id ON plaid_transactions(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_auto_matched ON plaid_transactions(auto_matched) WHERE auto_matched = true;
