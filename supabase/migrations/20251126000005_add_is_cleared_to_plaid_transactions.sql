/*
  # Add is_cleared Column to Plaid Transactions
  
  Allows users to manually mark Plaid transactions as cleared/uncleared,
  overriding the automatic pending status from Plaid.
  
  - NULL = Use automatic status (not pending = cleared)
  - true = User manually marked as cleared
  - false = User manually marked as not cleared
*/

-- Add is_cleared column (nullable to allow automatic behavior)
ALTER TABLE plaid_transactions
ADD COLUMN IF NOT EXISTS is_cleared boolean;

-- Add comment
COMMENT ON COLUMN plaid_transactions.is_cleared IS 'Manual cleared status override. NULL means derive from pending status (auto). User can set true/false to override.';
