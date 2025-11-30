/*
  # Fix Unlink Plaid Function - Add Type Mapping
  
  Updates the unlink_plaid_item function to properly map Plaid account types 
  to manual account types that match the accounts table check constraint.
*/

CREATE OR REPLACE FUNCTION unlink_plaid_item(
  p_plaid_item_id uuid,
  p_household_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_record RECORD;
  v_accounts_converted integer := 0;
BEGIN
  -- Verify the item belongs to this household
  IF NOT EXISTS (
    SELECT 1 FROM plaid_items 
    WHERE id = p_plaid_item_id 
    AND household_id = p_household_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Plaid item not found or does not belong to household'
    );
  END IF;

  -- Convert all plaid_accounts to manual accounts
  FOR v_account_record IN
    SELECT 
      id,
      name,
      official_name,
      type,
      subtype,
      mask,
      current_balance,
      household_id
    FROM plaid_accounts
    WHERE plaid_item_id = p_plaid_item_id
  LOOP
    -- Insert into manual accounts table
    INSERT INTO accounts (
      household_id,
      name,
      type,
      balance,
      account_number_last4,
      institution,
      color,
      is_active
    ) VALUES (
      v_account_record.household_id,
      COALESCE(v_account_record.official_name, v_account_record.name),
      -- Map Plaid types to manual account types
      CASE 
        WHEN v_account_record.subtype = 'checking' THEN 'checking'
        WHEN v_account_record.subtype = 'savings' THEN 'savings'
        WHEN v_account_record.subtype = 'credit card' THEN 'credit_card'
        WHEN v_account_record.type = 'credit' THEN 'credit_card'
        WHEN v_account_record.type = 'loan' THEN 'other'
        WHEN v_account_record.type = 'investment' THEN 'investment'
        ELSE 'other'
      END,
      v_account_record.current_balance,
      v_account_record.mask,
      'Unlinked from Plaid',
      '#64748b',
      true
    );

    v_accounts_converted := v_accounts_converted + 1;
  END LOOP;

  -- Delete the plaid_item (cascades to plaid_accounts and plaid_transactions)
  DELETE FROM plaid_items WHERE id = p_plaid_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'accounts_converted', v_accounts_converted,
    'message', format('Successfully unlinked and converted %s account(s) to manual', v_accounts_converted)
  );
END;
$$;

COMMENT ON FUNCTION unlink_plaid_item IS 
  'Unlinks a Plaid item by converting all its accounts to manual accounts with proper type mapping';
