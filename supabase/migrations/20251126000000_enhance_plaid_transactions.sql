/*
  # Enhance Plaid Transactions Table
  
  1. Changes
    - Add `payee_id` to plaid_transactions for better payee tracking
    - This allows users to assign payees to Plaid transactions
    - Payee assignments will be preserved across syncs when user_modified is true
    
  2. Purpose
    - Enable full payee management for Plaid transactions
    - Maintain consistency between manual and Plaid transactions
*/

-- Add payee_id column to plaid_transactions
ALTER TABLE plaid_transactions
ADD COLUMN IF NOT EXISTS payee_id uuid REFERENCES payees(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_payee_id ON plaid_transactions(payee_id) WHERE payee_id IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN plaid_transactions.payee_id IS 'User-assigned payee for this transaction';
