-- ============================================================================
-- CLEANUP OLD PLAID ACCOUNTS AND TEST DATA
-- Replace YOUR_HOUSEHOLD_ID with: 27a784ca-466b-4019-b752-2dfe1385e4d7
-- ============================================================================

-- STEP 1: View all your Plaid items (bank connections)
-- This shows you what's taking up your connection slots
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

-- STEP 2: View all accounts under each Plaid item
-- This helps you identify which Plaid items to keep/delete
SELECT 
  pi.institution_name,
  pi.item_id,
  pi.status,
  pa.name as account_name,
  pa.type,
  pa.current_balance,
  pa.created_at
FROM plaid_items pi
LEFT JOIN plaid_accounts pa ON pa.plaid_item_id = pi.id
WHERE pi.household_id = '27a784ca-466b-4019-b752-2dfe1385e4d7'
ORDER BY pi.institution_name, pa.name;

-- STEP 3: Delete specific Plaid items (and all their accounts)
-- Replace 'PLAID_ITEM_ID_HERE' with the actual ID from STEP 1
-- This will CASCADE delete all plaid_accounts and plaid_transactions
-- WARNING: This is permanent! Make sure you're deleting the right ones!

-- Example: Delete a single Plaid item
-- DELETE FROM plaid_items WHERE id = 'PLAID_ITEM_ID_HERE' AND household_id = '27a784ca-466b-4019-b752-2dfe1385e4d7';

-- STEP 4: Delete ALL sandbox/test Plaid items (if you want to start fresh)
-- CAUTION: Only use this if you want to delete ALL Plaid connections!
-- DELETE FROM plaid_items WHERE household_id = '27a784ca-466b-4019-b752-2dfe1385e4d7';

-- STEP 5: View orphaned manual accounts (accounts with no transactions)
-- These might be leftovers you want to clean up
SELECT 
  a.id,
  a.name,
  a.type,
  a.balance,
  a.institution,
  a.created_at,
  a.is_active,
  (SELECT COUNT(*) FROM transactions WHERE account_id = a.id) as transaction_count
FROM accounts a
WHERE a.household_id = '27a784ca-466b-4019-b752-2dfe1385e4d7'
ORDER BY transaction_count, created_at DESC;

-- STEP 6: Delete specific manual accounts
-- Replace 'ACCOUNT_ID_HERE' with the actual ID from STEP 5
-- DELETE FROM accounts WHERE id = 'ACCOUNT_ID_HERE' AND household_id = '27a784ca-466b-4019-b752-2dfe1385e4d7';

-- STEP 7: Mark old accounts as inactive instead of deleting
-- This keeps the data but removes them from your active list
-- UPDATE accounts SET is_active = false WHERE id = 'ACCOUNT_ID_HERE' AND household_id = '27a784ca-466b-4019-b752-2dfe1385e4d7';
-- UPDATE plaid_accounts SET is_active = false WHERE id = 'PLAID_ACCOUNT_ID_HERE' AND household_id = '27a784ca-466b-4019-b752-2dfe1385e4d7';

-- STEP 8: Clean up orphaned transactions (transactions with no account)
-- This should be rare but can happen if accounts were deleted improperly
SELECT 
  t.id,
  t.date,
  t.description,
  t.amount,
  t.account_id
FROM transactions t
WHERE t.household_id = '27a784ca-466b-4019-b752-2dfe1385e4d7'
  AND NOT EXISTS (
    SELECT 1 FROM accounts WHERE id = t.account_id
    UNION
    SELECT 1 FROM plaid_accounts WHERE id = t.account_id
  );

-- STEP 9: Verify your cleanup
-- After deleting, run STEP 1 again to verify your Plaid connection count
SELECT 
  COUNT(*) as total_plaid_items,
  COUNT(*) FILTER (WHERE status = 'active') as active_items
FROM plaid_items
WHERE household_id = '27a784ca-466b-4019-b752-2dfe1385e4d7';
