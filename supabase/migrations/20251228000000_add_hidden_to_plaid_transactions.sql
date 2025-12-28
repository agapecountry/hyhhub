-- Add hidden column to plaid_transactions for soft delete functionality
-- Hidden transactions won't be shown in UI or included in calculations
-- They also won't be re-synced from Plaid

ALTER TABLE plaid_transactions 
ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_hidden 
ON plaid_transactions(hidden) WHERE hidden = false;
