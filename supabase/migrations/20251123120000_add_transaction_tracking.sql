/*
  # Add Transaction Tracking for User Modifications and Incremental Sync

  1. Changes to plaid_transactions
    - Add `user_modified` boolean to track if user edited the transaction
    - Add `user_modified_at` timestamp to track when modified
    
  2. Changes to plaid_items
    - Add `transactions_cursor` text to store Plaid's sync cursor for incremental updates
    
  3. Purpose
    - Enable incremental transaction syncing (only fetch new transactions)
    - Prevent overwriting user-modified transactions during sync
    - Allow users to edit Plaid-imported transactions
*/

-- Add user modification tracking to plaid_transactions
ALTER TABLE plaid_transactions
ADD COLUMN IF NOT EXISTS user_modified boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS user_modified_at timestamptz;

-- Add sync cursor to plaid_items for incremental updates
ALTER TABLE plaid_items
ADD COLUMN IF NOT EXISTS transactions_cursor text;

-- Add comment for clarity
COMMENT ON COLUMN plaid_transactions.user_modified IS 'Set to true when user manually edits this transaction';
COMMENT ON COLUMN plaid_transactions.user_modified_at IS 'Timestamp of last user modification';
COMMENT ON COLUMN plaid_items.transactions_cursor IS 'Plaid transactions sync cursor for incremental updates';

-- Create index for faster queries on user_modified
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_user_modified ON plaid_transactions(user_modified) WHERE user_modified = true;
