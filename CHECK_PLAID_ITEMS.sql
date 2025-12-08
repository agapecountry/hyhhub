-- Run this in your Supabase SQL Editor to see what plaid_items you have
-- Replace 'YOUR_HOUSEHOLD_ID' with your actual household ID: 27a784ca-466b-4019-b752-2dfe1385e4d7

SELECT 
  id,
  item_id,
  institution_name,
  status,
  last_synced_at,
  created_at,
  (SELECT COUNT(*) FROM plaid_accounts WHERE plaid_accounts.plaid_item_id = plaid_items.id) as account_count
FROM plaid_items
WHERE household_id = '27a784ca-466b-4019-b752-2dfe1385e4d7'
ORDER BY created_at DESC;

-- This will show you all your bank connections (plaid_items)
-- Each row is one "bank connection"
-- The account_count column shows how many accounts are in each connection
