/*
  # Add Notes Column to Plaid Transactions
  
  Adds a notes column to plaid_transactions table to allow users to add
  custom notes to their Plaid transactions, just like manual transactions.
*/

-- Add notes column
ALTER TABLE plaid_transactions
ADD COLUMN IF NOT EXISTS notes text;

-- Add comment
COMMENT ON COLUMN plaid_transactions.notes IS 'User-added notes for this transaction';
