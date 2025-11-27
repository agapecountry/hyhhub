/*
  # Add Transfer Linking to Transactions
  
  Allows transactions to be linked as transfers between accounts:
  - transfer_id links two transactions together as a transfer pair
  - When you transfer $100 from Account A to Account B:
    - Account A gets a transaction: -$100 (withdrawal)
    - Account B gets a transaction: +$100 (deposit)
    - Both have the same transfer_id linking them together
*/

-- Add transfer_id to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS transfer_id uuid;

-- Add transfer_id to plaid_transactions table (for future use)
ALTER TABLE plaid_transactions
ADD COLUMN IF NOT EXISTS transfer_id uuid;

-- Add index for faster transfer lookups
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_id ON transactions(transfer_id) WHERE transfer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_transfer_id ON plaid_transactions(transfer_id) WHERE transfer_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN transactions.transfer_id IS 'Links two transactions together as a transfer pair. Both transactions in the pair share the same transfer_id.';
COMMENT ON COLUMN plaid_transactions.transfer_id IS 'Links two transactions together as a transfer pair. Both transactions in the pair share the same transfer_id.';
