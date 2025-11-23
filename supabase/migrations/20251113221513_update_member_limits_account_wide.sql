/*
  # Update Member Limits to be Account-Wide

  1. Purpose
    - Change member limits from per-household to per-account (subscription owner)
    - Track which user owns/pays for the subscription
    - Count account members across ALL households owned by the subscription holder

  2. Changes
    - Add subscription_owner_id to household_subscriptions
    - Update get_account_member_limit to work for a user across all households
    - Add get_account_member_count to count across all owned households
    - Update can_add_account_member to check account-wide limits

  3. Logic
    - Subscription owner = user who is admin of a household with active subscription
    - Member limit applies across ALL households where user is subscription owner
    - Example: Elite tier = 8 members total across Household A + B + C, not 8 per household
*/

-- Add subscription_owner_id to track who owns/pays for the subscription
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'household_subscriptions' 
    AND column_name = 'subscription_owner_id'
  ) THEN
    ALTER TABLE household_subscriptions 
    ADD COLUMN subscription_owner_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Populate subscription_owner_id with the admin of each household
UPDATE household_subscriptions hs
SET subscription_owner_id = (
  SELECT hm.user_id
  FROM household_members hm
  WHERE hm.household_id = hs.household_id
    AND hm.role = 'admin'
  ORDER BY hm.joined_at ASC
  LIMIT 1
)
WHERE subscription_owner_id IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_household_subscriptions_owner 
  ON household_subscriptions(subscription_owner_id);

-- Function to get account-wide member limit for a user
CREATE OR REPLACE FUNCTION get_user_account_member_limit(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_tier_name text;
  v_limit integer;
BEGIN
  -- Get the highest tier subscription for this user across all their households
  SELECT st.name INTO v_tier_name
  FROM household_subscriptions hs
  JOIN subscription_tiers st ON hs.tier_id = st.id
  WHERE hs.subscription_owner_id = p_user_id
    AND hs.status = 'active'
  ORDER BY 
    CASE st.name
      WHEN 'infelite' THEN 6
      WHEN 'elite' THEN 5
      WHEN 'infprem' THEN 4
      WHEN 'premium' THEN 3
      WHEN 'basic' THEN 2
      WHEN 'free' THEN 1
      ELSE 0
    END DESC
  LIMIT 1;

  -- Default to free tier if no subscription
  v_tier_name := COALESCE(v_tier_name, 'free');

  -- Return limit based on tier
  CASE v_tier_name
    WHEN 'free' THEN v_limit := 1;
    WHEN 'basic' THEN v_limit := 1;
    WHEN 'premium' THEN v_limit := 4;
    WHEN 'infprem' THEN v_limit := 4;
    WHEN 'elite' THEN v_limit := 8;
    WHEN 'infelite' THEN v_limit := 8;
    ELSE v_limit := 1;
  END CASE;

  RETURN v_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_user_account_member_limit(uuid) TO authenticated;

-- Function to get current account member count across all owned households
CREATE OR REPLACE FUNCTION get_user_account_member_count(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  -- Count all account members across households where user owns the subscription
  SELECT COUNT(DISTINCT hm.user_id) INTO v_count
  FROM household_members hm
  JOIN household_subscriptions hs ON hm.household_id = hs.household_id
  WHERE hs.subscription_owner_id = p_user_id
    AND hs.status = 'active'
    AND hm.is_account_member = true;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_user_account_member_count(uuid) TO authenticated;

-- Update the household-specific function to use the subscription owner
CREATE OR REPLACE FUNCTION get_account_member_limit(p_household_id uuid)
RETURNS integer AS $$
DECLARE
  v_owner_id uuid;
  v_limit integer;
BEGIN
  -- Get the subscription owner for this household
  SELECT subscription_owner_id INTO v_owner_id
  FROM household_subscriptions
  WHERE household_id = p_household_id
    AND status = 'active'
  ORDER BY current_period_start DESC
  LIMIT 1;

  -- If no subscription found, return free tier limit
  IF v_owner_id IS NULL THEN
    RETURN 1;
  END IF;

  -- Get the user's account-wide limit
  v_limit := get_user_account_member_limit(v_owner_id);

  RETURN v_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- Update can_add_account_member to check account-wide limits
CREATE OR REPLACE FUNCTION can_add_account_member(p_household_id uuid)
RETURNS boolean AS $$
DECLARE
  v_owner_id uuid;
  v_current_count integer;
  v_limit integer;
BEGIN
  -- Get the subscription owner for this household
  SELECT subscription_owner_id INTO v_owner_id
  FROM household_subscriptions
  WHERE household_id = p_household_id
    AND status = 'active'
  ORDER BY current_period_start DESC
  LIMIT 1;

  -- If no subscription, check if user is admin (they own it)
  IF v_owner_id IS NULL THEN
    SELECT user_id INTO v_owner_id
    FROM household_members
    WHERE household_id = p_household_id
      AND role = 'admin'
    ORDER BY joined_at ASC
    LIMIT 1;
  END IF;

  -- If still no owner found, deny
  IF v_owner_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get account-wide count and limit
  v_current_count := get_user_account_member_count(v_owner_id);
  v_limit := get_user_account_member_limit(v_owner_id);

  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- Function to get detailed breakdown of member usage across households
CREATE OR REPLACE FUNCTION get_user_household_member_breakdown(p_user_id uuid)
RETURNS TABLE (
  household_id uuid,
  household_name text,
  member_count bigint,
  total_limit integer,
  total_used integer
) AS $$
DECLARE
  v_limit integer;
  v_total_count integer;
BEGIN
  -- Get user's total limit and count
  v_limit := get_user_account_member_limit(p_user_id);
  v_total_count := get_user_account_member_count(p_user_id);

  RETURN QUERY
  SELECT 
    h.id as household_id,
    h.name as household_name,
    COUNT(hm.id) FILTER (WHERE hm.is_account_member = true) as member_count,
    v_limit as total_limit,
    v_total_count as total_used
  FROM households h
  JOIN household_subscriptions hs ON h.id = hs.household_id
  LEFT JOIN household_members hm ON h.id = hm.household_id
  WHERE hs.subscription_owner_id = p_user_id
    AND hs.status = 'active'
  GROUP BY h.id, h.name
  ORDER BY h.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_user_household_member_breakdown(uuid) TO authenticated;

-- Add comment explaining the new structure
COMMENT ON COLUMN household_subscriptions.subscription_owner_id IS 
  'User who owns/pays for this subscription. Member limits apply across all households owned by this user.';
