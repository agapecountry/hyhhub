/*
  # Add working_balance column to accounts and plaid_accounts
  
  1. Changes
    - Add working_balance column to accounts table
    - Add working_balance column to plaid_accounts table
    - Populate working_balance for manual accounts: balance + sum(transactions)
    - Populate working_balance for plaid accounts: initial_balance + sum(transactions) + sum(-plaid_transactions)
*/

-- Add working_balance to accounts (manual)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS working_balance numeric(12, 2) DEFAULT 0;

-- Add working_balance to plaid_accounts
ALTER TABLE plaid_accounts ADD COLUMN IF NOT EXISTS working_balance numeric(12, 2) DEFAULT 0;

-- Populate working_balance for manual accounts
UPDATE accounts a
SET working_balance = a.balance + COALESCE(
  (SELECT SUM(t.amount) FROM transactions t WHERE t.account_id = a.id),
  0
);

-- Populate working_balance for plaid accounts
UPDATE plaid_accounts pa
SET working_balance = COALESCE(pa.initial_balance, 0)
  + COALESCE(
    (SELECT SUM(t.amount) FROM transactions t WHERE t.account_id = pa.id),
    0
  )
  + COALESCE(
    (SELECT SUM(-pt.amount) FROM plaid_transactions pt 
     WHERE pt.plaid_account_id = pa.id 
     AND pt.hidden IS NOT TRUE
     AND pt.matched_manual_transaction_id IS NULL),
    0
  );
