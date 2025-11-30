/*
  # User Account Deletion System
  
  Creates a function to permanently delete a user and all their associated data.
  This is for GDPR compliance and user self-service deletion.
*/

-- Function to delete all user data
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_ids uuid[];
  v_household_id uuid;
  v_member_count int;
BEGIN
  -- Get all households this user is a member of
  SELECT ARRAY_AGG(household_id)
  INTO v_household_ids
  FROM household_members
  WHERE user_id = p_user_id;

  -- For each household, check if user is the only member
  IF v_household_ids IS NOT NULL THEN
    FOREACH v_household_id IN ARRAY v_household_ids
    LOOP
      -- Count members in this household
      SELECT COUNT(*)
      INTO v_member_count
      FROM household_members
      WHERE household_id = v_household_id;

      -- If user is the only member, delete all household data
      IF v_member_count = 1 THEN
        -- Delete all household-related data
        DELETE FROM transactions WHERE household_id = v_household_id;
        DELETE FROM accounts WHERE household_id = v_household_id;
        DELETE FROM plaid_accounts WHERE household_id = v_household_id;
        DELETE FROM plaid_items WHERE household_id = v_household_id;
        DELETE FROM debts WHERE household_id = v_household_id;
        DELETE FROM bills WHERE household_id = v_household_id;
        DELETE FROM budget_categories WHERE household_id = v_household_id;
        DELETE FROM budgets WHERE household_id = v_household_id;
        DELETE FROM calendar_events WHERE household_id = v_household_id;
        DELETE FROM chore_assignments WHERE household_id = v_household_id;
        DELETE FROM chores WHERE household_id = v_household_id;
        DELETE FROM goals WHERE household_id = v_household_id;
        DELETE FROM grocery_items WHERE household_id = v_household_id;
        DELETE FROM grocery_lists WHERE household_id = v_household_id;
        DELETE FROM meal_plans WHERE household_id = v_household_id;
        DELETE FROM pantry_items WHERE household_id = v_household_id;
        DELETE FROM payees WHERE household_id = v_household_id;
        DELETE FROM recipes WHERE household_id = v_household_id;
        DELETE FROM recurring_transactions WHERE household_id = v_household_id;
        DELETE FROM influencer_signups WHERE household_id = v_household_id;
        DELETE FROM household_subscriptions WHERE household_id = v_household_id;
        DELETE FROM household_members WHERE household_id = v_household_id;
        DELETE FROM households WHERE id = v_household_id;
      ELSE
        -- If multiple members, just remove this user from the household
        DELETE FROM household_members 
        WHERE household_id = v_household_id AND user_id = p_user_id;
      END IF;
    END LOOP;
  END IF;

  -- Delete user's influencer data
  DELETE FROM influencer_payouts WHERE influencer_user_id = p_user_id;
  DELETE FROM influencer_codes WHERE user_id = p_user_id;

  -- Delete user preferences
  DELETE FROM user_preferences WHERE user_id = p_user_id;

  -- Delete from users table
  DELETE FROM users WHERE id = p_user_id;

  -- Note: auth.users deletion must be handled by Edge Function with service role

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User data deleted successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION delete_user_account IS 
  'Permanently deletes a user and all their data. Cannot be undone. For GDPR compliance and user self-service deletion.';
