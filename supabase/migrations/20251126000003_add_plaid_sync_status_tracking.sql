/*
  # Add Sync Status Tracking to Plaid Items
  
  Adds flags to track the status of transaction syncing:
  - initial_update_complete: True when first 30 days of transactions are available
  - historical_update_complete: True when full 24 months of history is available
  
  These flags help the UI know when data is ready to display.
*/

-- Add sync status flags
ALTER TABLE plaid_items
ADD COLUMN IF NOT EXISTS initial_update_complete boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS historical_update_complete boolean NOT NULL DEFAULT false;

-- Add index for querying items by sync status
CREATE INDEX IF NOT EXISTS idx_plaid_items_sync_status 
ON plaid_items(initial_update_complete, historical_update_complete);

-- Add comments
COMMENT ON COLUMN plaid_items.initial_update_complete IS 'True when initial 30 days of transactions have been synced';
COMMENT ON COLUMN plaid_items.historical_update_complete IS 'True when full 24 months of transaction history has been synced';
