/*
  # Add Function to Unlink Single Plaid Account
  
  Creates a function to unlink just ONE Plaid account instead of all accounts
  from a Plaid item (institution).
*/

CREATE OR REPLACE FUNCTION unlink_single_plaid_account(
  p_account_id uuid,
  p_household_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_record RECORD;
  v_new_account_id uuid;
BEGIN
  -- Get the account details and verify it belongs to this household
  SELECT 
    id,
    name,
    official_name,
    type,
    subtype,
    mask,
    current_balance,
    household_id,
    plaid_item_id
  INTO v_account_record
  FROM plaid_accounts
  WHERE id = p_account_id
  AND household_id = p_household_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Plaid account not found or does not belong to household'
    );
  END IF;

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
  )
  RETURNING id INTO v_new_account_id;

  -- Update all transactions to point to the new manual account
  UPDATE transactions
  SET account_id = v_new_account_id
  WHERE account_id = p_account_id;

  -- Delete the plaid_account
  DELETE FROM plaid_accounts WHERE id = p_account_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_account_id', v_new_account_id,
    'message', 'Successfully unlinked account from Plaid'
  );
END;
$$;

COMMENT ON FUNCTION unlink_single_plaid_account IS 
  'Unlinks a single Plaid account by converting it to a manual account and preserving all transactions';
