/*
  # Cleanup Orphaned Plaid Items
  
  Delete plaid_items that have no associated plaid_accounts.
  This happens when all accounts are unlinked but the item wasn't deleted.
*/

-- Delete orphaned plaid_items (items with no accounts)
DO $$
DECLARE
  v_deleted_count int;
BEGIN
  DELETE FROM plaid_items
  WHERE id IN (
    SELECT pi.id
    FROM plaid_items pi
    LEFT JOIN plaid_accounts pa ON pa.plaid_item_id = pi.id
    WHERE pa.id IS NULL
  );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % orphaned plaid_items', v_deleted_count;
END $$;
