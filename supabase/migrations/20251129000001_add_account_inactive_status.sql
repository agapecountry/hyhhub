/*
  # Add Inactive Status to Accounts
  
  Add is_active field to both accounts and plaid_accounts tables.
  This allows users to hide accounts without deleting transaction history.
*/

-- Add is_active to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Add is_active to plaid_accounts table
ALTER TABLE plaid_accounts 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_is_active ON plaid_accounts(is_active);
