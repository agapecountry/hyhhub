/*
  # Update Influencer Payout Structure
  
  1. Updates
    - Update calculate_influencer_payout function with new amounts
    - Add support for recurring payouts
  
  2. New Payout Structure
    - Basic Monthly: $1.00 signup (no recurring)
    - Basic Annual: $5.00 signup (no recurring)
    - Premium Monthly: $5.00 signup + $1.00/month recurring
    - Premium Annual: $10.00 signup + $10.00/year recurring
    - Elite Monthly: $10.00 signup + $2.00/month recurring
    - Elite Annual: $15.00 signup + $15.00/year recurring
  
  3. Functions
    - Updated calculate_influencer_payout with new amounts
    - New function to generate recurring payouts
*/

-- Drop the old function first (it has 2 parameters)
DROP FUNCTION IF EXISTS calculate_influencer_payout(text, text);

-- Update the payout calculation function with new amounts
CREATE OR REPLACE FUNCTION calculate_influencer_payout(
  tier_name text,
  billing_period text,
  payout_type text DEFAULT 'signup'
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Basic tier payouts (signup only, no recurring)
  IF tier_name = 'basic' THEN
    IF payout_type = 'signup' THEN
      IF billing_period = 'monthly' THEN
        RETURN 100; -- $1.00
      ELSIF billing_period = 'annual' THEN
        RETURN 500; -- $5.00
      END IF;
    END IF;
    RETURN 0; -- No recurring for basic
  END IF;
  
  -- Premium tier payouts
  IF tier_name = 'premium' THEN
    IF payout_type = 'signup' THEN
      IF billing_period = 'monthly' THEN
        RETURN 500; -- $5.00 one-time
      ELSIF billing_period = 'annual' THEN
        RETURN 1000; -- $10.00 one-time
      END IF;
    ELSIF payout_type = 'recurring' THEN
      IF billing_period = 'monthly' THEN
        RETURN 100; -- $1.00 per month
      ELSIF billing_period = 'annual' THEN
        RETURN 1000; -- $10.00 per year
      END IF;
    END IF;
  END IF;
  
  -- Elite tier payouts
  IF tier_name = 'elite' THEN
    IF payout_type = 'signup' THEN
      IF billing_period = 'monthly' THEN
        RETURN 1000; -- $10.00 one-time
      ELSIF billing_period = 'annual' THEN
        RETURN 1500; -- $15.00 one-time
      END IF;
    ELSIF payout_type = 'recurring' THEN
      IF billing_period = 'monthly' THEN
        RETURN 200; -- $2.00 per month
      ELSIF billing_period = 'annual' THEN
        RETURN 1500; -- $15.00 per year
      END IF;
    END IF;
  END IF;
  
  -- Default: no payout
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add last_recurring_payout_at to track when we last created recurring payout
ALTER TABLE influencer_signups 
ADD COLUMN IF NOT EXISTS last_recurring_payout_at timestamptz DEFAULT NULL;

-- Add index for finding signups that need recurring payouts
CREATE INDEX IF NOT EXISTS idx_influencer_signups_active_subscribers 
  ON influencer_signups(is_active_subscriber, last_recurring_payout_at) 
  WHERE is_active_subscriber = true;

-- Function to generate recurring payouts for active subscriptions
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
  -- Loop through active subscriptions with influencer signups
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
    -- Get active subscription for this household
    SELECT * INTO subscription_record
    FROM household_subscriptions
    WHERE household_id = signup_record.household_id
      AND status = 'active'
      AND tier_id = signup_record.subscription_tier_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Skip if no active subscription found
    CONTINUE WHEN NOT FOUND;
    
    -- Get tier information
    SELECT * INTO tier_record
    FROM subscription_tiers
    WHERE id = subscription_record.tier_id;
    
    CONTINUE WHEN NOT FOUND;
    
    -- Skip free and influencer tiers
    CONTINUE WHEN tier_record.name IN ('free', 'infprem', 'infelite');
    
    -- Skip basic tier (no recurring payouts)
    CONTINUE WHEN tier_record.name = 'basic';
    
    -- Determine if we should create a recurring payout
    should_create_payout := false;
    
    IF subscription_record.billing_period = 'monthly' THEN
      -- Monthly: create payout if 30+ days since last payout (or never)
      IF signup_record.last_recurring_payout_at IS NULL THEN
        -- First recurring payout: wait 30 days after subscription start
        days_since_last_payout := EXTRACT(DAY FROM (now() - signup_record.subscription_started_at));
        should_create_payout := days_since_last_payout >= 30;
      ELSE
        days_since_last_payout := EXTRACT(DAY FROM (now() - signup_record.last_recurring_payout_at));
        should_create_payout := days_since_last_payout >= 30;
      END IF;
    ELSIF subscription_record.billing_period = 'annual' THEN
      -- Annual: create payout if 365+ days since last payout (or never)
      IF signup_record.last_recurring_payout_at IS NULL THEN
        -- First recurring payout: wait 365 days after subscription start
        days_since_last_payout := EXTRACT(DAY FROM (now() - signup_record.subscription_started_at));
        should_create_payout := days_since_last_payout >= 365;
      ELSE
        days_since_last_payout := EXTRACT(DAY FROM (now() - signup_record.last_recurring_payout_at));
        should_create_payout := days_since_last_payout >= 365;
      END IF;
    END IF;
    
    -- Create payout if conditions met
    IF should_create_payout THEN
      -- Get code record
      SELECT * INTO code_record
      FROM influencer_codes
      WHERE id = signup_record.influencer_code_id;
      
      CONTINUE WHEN NOT FOUND;
      
      -- Calculate payout amount
      payout_amount := calculate_influencer_payout(
        tier_record.name,
        subscription_record.billing_period,
        'recurring'
      );
      
      -- Only create if amount > 0
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
        
        -- Update last payout timestamp
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_recurring_influencer_payouts IS 
  'Generates recurring payouts for active Premium and Elite subscriptions. Should be run monthly via cron job.';

-- Add comment explaining the payout structure
COMMENT ON FUNCTION calculate_influencer_payout IS 
  'Calculates influencer payout amounts:
   Basic: $1 monthly signup, $5 annual signup (no recurring)
   Premium: $5 monthly signup + $1/mo recurring, $10 annual signup + $10/yr recurring
   Elite: $10 monthly signup + $2/mo recurring, $15 annual signup + $15/yr recurring';
