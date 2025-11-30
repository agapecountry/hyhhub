/*
  # Fix Remaining Security Issues
  
  1. Fix generate_recurring_influencer_payouts search_path (already in migration but may need reapplying)
  2. Merge duplicate household_members INSERT policies
  
  Issues:
  - Function has mutable search_path
  - Multiple permissive policies on household_members for INSERT
*/

-- 1. Fix generate_recurring_influencer_payouts (ensure it has search_path set)
DROP FUNCTION IF EXISTS generate_recurring_influencer_payouts();

CREATE OR REPLACE FUNCTION generate_recurring_influencer_payouts()
RETURNS TABLE (
  payouts_created integer,
  total_amount_cents integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  signup_record RECORD;
  subscription_record RECORD;
  code_record RECORD;
  tier_record RECORD;
  payout_amount integer;
  payouts_count integer := 0;
  total_amount integer := 0;
  should_create_payout boolean;
  days_since_last_payout integer;
BEGIN
  FOR signup_record IN
    SELECT 
      s.id as signup_id,
      s.influencer_code_id,
      s.household_id,
      s.subscription_started_at,
      s.last_recurring_payout_at,
      s.subscription_tier_id
    FROM influencer_signups s
    WHERE s.is_active_subscriber = true
      AND s.subscription_started_at IS NOT NULL
  LOOP
    SELECT * INTO subscription_record
    FROM household_subscriptions
    WHERE household_id = signup_record.household_id
      AND status = 'active'
      AND tier_id = signup_record.subscription_tier_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    CONTINUE WHEN NOT FOUND;
    
    SELECT * INTO tier_record
    FROM subscription_tiers
    WHERE id = subscription_record.tier_id;
    
    CONTINUE WHEN NOT FOUND;
    CONTINUE WHEN tier_record.name IN ('free', 'infprem', 'infelite');
    CONTINUE WHEN tier_record.name = 'basic';
    
    should_create_payout := false;
    
    IF subscription_record.billing_period = 'monthly' THEN
      IF signup_record.last_recurring_payout_at IS NULL THEN
        days_since_last_payout := EXTRACT(DAY FROM (now() - signup_record.subscription_started_at));
        should_create_payout := days_since_last_payout >= 30;
      ELSE
        days_since_last_payout := EXTRACT(DAY FROM (now() - signup_record.last_recurring_payout_at));
        should_create_payout := days_since_last_payout >= 30;
      END IF;
    ELSIF subscription_record.billing_period = 'annual' THEN
      IF signup_record.last_recurring_payout_at IS NULL THEN
        days_since_last_payout := EXTRACT(DAY FROM (now() - signup_record.subscription_started_at));
        should_create_payout := days_since_last_payout >= 365;
      ELSE
        days_since_last_payout := EXTRACT(DAY FROM (now() - signup_record.last_recurring_payout_at));
        should_create_payout := days_since_last_payout >= 365;
      END IF;
    END IF;
    
    IF should_create_payout THEN
      SELECT * INTO code_record
      FROM influencer_codes
      WHERE id = signup_record.influencer_code_id;
      
      CONTINUE WHEN NOT FOUND;
      
      payout_amount := calculate_influencer_payout(
        tier_record.name,
        subscription_record.billing_period,
        'recurring'
      );
      
      IF payout_amount > 0 THEN
        INSERT INTO influencer_payouts (
          influencer_code_id,
          influencer_user_id,
          signup_id,
          household_subscription_id,
          payout_amount_cents,
          payout_type,
          subscription_tier_name,
          billing_period
        ) VALUES (
          code_record.id,
          code_record.user_id,
          signup_record.signup_id,
          subscription_record.id,
          payout_amount,
          'recurring',
          tier_record.name,
          subscription_record.billing_period
        );
        
        UPDATE influencer_signups
        SET last_recurring_payout_at = now()
        WHERE id = signup_record.signup_id;
        
        payouts_count := payouts_count + 1;
        total_amount := total_amount + payout_amount;
      END IF;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT payouts_count, total_amount;
END;
$$;

-- 2. Fix household_members duplicate INSERT policies
-- Drop the duplicate policies
DROP POLICY IF EXISTS "Users can add self as member during signup" ON household_members;
DROP POLICY IF EXISTS "Users can insert household members" ON household_members;

-- Create a single merged policy for INSERT with optimized auth check
CREATE POLICY "Users can insert household members"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Can insert self as member during signup
    user_id = (SELECT auth.uid())
    OR
    -- Or can insert if they're an admin of the household being inserted into
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = (SELECT auth.uid())
      AND hm.role = 'admin'
    )
  );

COMMENT ON POLICY "Users can insert household members" ON household_members IS 
  'Allows users to add themselves during signup or add others if they are household admin';

-- 3. Fix budget_categories duplicate INSERT policies
DROP POLICY IF EXISTS "Household members can create budget categories" ON budget_categories;
DROP POLICY IF EXISTS "Household members can insert budget categories" ON budget_categories;

-- Create a single merged policy for INSERT with optimized auth check
CREATE POLICY "Household members can insert budget categories"
  ON budget_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budget_categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "Household members can insert budget categories" ON budget_categories IS 
  'Allows household members to create budget categories';

-- 4. Fix paycheck_settings duplicate DELETE policies
DROP POLICY IF EXISTS "Household members can delete paycheck settings" ON paycheck_settings;
DROP POLICY IF EXISTS "Users can delete paycheck settings for their household" ON paycheck_settings;

-- Create a single merged policy for DELETE with optimized auth check
CREATE POLICY "Household members can delete paycheck settings"
  ON paycheck_settings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = paycheck_settings.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "Household members can delete paycheck settings" ON paycheck_settings IS 
  'Allows household members to delete paycheck settings';

-- 5. Fix paycheck_settings duplicate INSERT policies
DROP POLICY IF EXISTS "Household members can create paycheck settings" ON paycheck_settings;
DROP POLICY IF EXISTS "Users can insert paycheck settings for their household" ON paycheck_settings;

-- Create a single merged policy for INSERT with optimized auth check
CREATE POLICY "Household members can insert paycheck settings"
  ON paycheck_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = paycheck_settings.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "Household members can insert paycheck settings" ON paycheck_settings IS 
  'Allows household members to create paycheck settings';

-- 6. Fix paycheck_settings duplicate UPDATE policies (if they exist)
DROP POLICY IF EXISTS "Household members can update paycheck settings" ON paycheck_settings;
DROP POLICY IF EXISTS "Users can update paycheck settings for their household" ON paycheck_settings;

-- Create a single merged policy for UPDATE with optimized auth check
CREATE POLICY "Household members can update paycheck settings"
  ON paycheck_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = paycheck_settings.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = paycheck_settings.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "Household members can update paycheck settings" ON paycheck_settings IS 
  'Allows household members to update paycheck settings';

-- 7. Fix paycheck_settings duplicate SELECT policies (if they exist)
DROP POLICY IF EXISTS "Household members can view paycheck settings" ON paycheck_settings;
DROP POLICY IF EXISTS "Users can view paycheck settings for their household" ON paycheck_settings;

-- Create a single merged policy for SELECT with optimized auth check
CREATE POLICY "Household members can view paycheck settings"
  ON paycheck_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = paycheck_settings.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "Household members can view paycheck settings" ON paycheck_settings IS 
  'Allows household members to view paycheck settings';

-- 8. Fix user_settings duplicate INSERT policies
DROP POLICY IF EXISTS "Users can create own settings during signup" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;

-- Create a single merged policy for INSERT with optimized auth check
CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

COMMENT ON POLICY "Users can insert own settings" ON user_settings IS 
  'Allows users to create their own settings during signup or anytime';

-- 9. Fix users duplicate INSERT policies
DROP POLICY IF EXISTS "Users can insert own record" ON users;
DROP POLICY IF EXISTS "Users can insert own user record" ON users;

-- Create a single merged policy for INSERT with optimized auth check
CREATE POLICY "Users can insert own record"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    id = (SELECT auth.uid())
  );

COMMENT ON POLICY "Users can insert own record" ON users IS 
  'Allows users to create their own user record during signup';
