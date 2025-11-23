/*
  # Create Influencer Payouts System
  
  1. New Tables
    - `influencer_payouts`
      - Tracks individual payout events for influencer signups
      - Records payout amounts based on subscription tier and billing period
      - Links to influencer codes and signups
  
  2. Payout Structure
    - Basic Monthly: $1.00 immediate payout, no recurring
    - Basic Annual: $5.00 immediate payout, no recurring
    - Premium Monthly: TBD (to be defined later)
    - Premium Annual: TBD (to be defined later)
    - Elite Monthly: TBD (to be defined later)
    - Elite Annual: TBD (to be defined later)
  
  3. Functions
    - `calculate_influencer_payout` - Calculates payout amount based on tier and billing period
    - Trigger to automatically create payout records when subscriptions start
  
  4. Security
    - Enable RLS on payouts table
    - Influencers can view their own payouts
    - System can create payout records
*/

-- Create influencer_payouts table
CREATE TABLE IF NOT EXISTS influencer_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_code_id uuid REFERENCES influencer_codes(id) ON DELETE CASCADE,
  influencer_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  signup_id uuid REFERENCES influencer_signups(id) ON DELETE CASCADE,
  household_subscription_id uuid REFERENCES household_subscriptions(id) ON DELETE SET NULL,
  payout_amount_cents integer NOT NULL,
  payout_type text NOT NULL CHECK (payout_type IN ('signup', 'recurring', 'bonus')),
  subscription_tier_name text NOT NULL,
  billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'annual')),
  is_paid boolean DEFAULT false,
  paid_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Add indexes for influencer_payouts
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_code_id ON influencer_payouts(influencer_code_id);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_influencer_user_id ON influencer_payouts(influencer_user_id);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_signup_id ON influencer_payouts(signup_id);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_subscription_id ON influencer_payouts(household_subscription_id);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_is_paid ON influencer_payouts(is_paid) WHERE is_paid = false;

-- Enable RLS
ALTER TABLE influencer_payouts ENABLE ROW LEVEL SECURITY;

-- Policies for influencer_payouts

-- Influencers can view their own payouts
CREATE POLICY "Influencers can view own payouts"
  ON influencer_payouts FOR SELECT
  TO authenticated
  USING (auth.uid() = influencer_user_id);

-- System can insert payouts
CREATE POLICY "Authenticated users can insert payouts"
  ON influencer_payouts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- System can update payout status
CREATE POLICY "System can update payouts"
  ON influencer_payouts FOR UPDATE
  TO authenticated
  USING (auth.uid() = influencer_user_id)
  WITH CHECK (auth.uid() = influencer_user_id);

-- Function to calculate payout amount based on tier and billing period
CREATE OR REPLACE FUNCTION calculate_influencer_payout(
  tier_name text,
  billing_period text
)
RETURNS integer AS $$
BEGIN
  -- Basic tier payouts
  IF tier_name = 'basic' THEN
    IF billing_period = 'monthly' THEN
      RETURN 100; -- $1.00 in cents
    ELSIF billing_period = 'annual' THEN
      RETURN 500; -- $5.00 in cents
    END IF;
  END IF;
  
  -- Premium tier payouts (to be defined)
  IF tier_name = 'premium' THEN
    IF billing_period = 'monthly' THEN
      RETURN 0; -- TBD
    ELSIF billing_period = 'annual' THEN
      RETURN 0; -- TBD
    END IF;
  END IF;
  
  -- Elite tier payouts (to be defined)
  IF tier_name = 'elite' THEN
    IF billing_period = 'monthly' THEN
      RETURN 0; -- TBD
    ELSIF billing_period = 'annual' THEN
      RETURN 0; -- TBD
    END IF;
  END IF;
  
  -- Default: no payout
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create payout record when subscription starts
CREATE OR REPLACE FUNCTION create_influencer_payout_on_subscription()
RETURNS TRIGGER AS $$
DECLARE
  signup_record influencer_signups%ROWTYPE;
  code_record influencer_codes%ROWTYPE;
  tier_record subscription_tiers%ROWTYPE;
  payout_amount integer;
BEGIN
  -- Find the signup record for this household
  SELECT * INTO signup_record
  FROM influencer_signups
  WHERE household_id = NEW.household_id
  AND subscription_started_at IS NULL
  ORDER BY signed_up_at DESC
  LIMIT 1;
  
  -- If no signup record or already has subscription_started_at, skip
  IF NOT FOUND OR signup_record.subscription_started_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get the influencer code
  SELECT * INTO code_record
  FROM influencer_codes
  WHERE id = signup_record.influencer_code_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Get the tier information
  SELECT * INTO tier_record
  FROM subscription_tiers
  WHERE id = NEW.tier_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Skip if it's a free or influencer tier
  IF tier_record.name IN ('free', 'infprem', 'infelite') THEN
    RETURN NEW;
  END IF;
  
  -- Calculate payout
  payout_amount := calculate_influencer_payout(tier_record.name, NEW.billing_period);
  
  -- Only create payout if amount > 0
  IF payout_amount > 0 THEN
    -- Create payout record
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
      signup_record.id,
      NEW.id,
      payout_amount,
      'signup',
      tier_record.name,
      NEW.billing_period
    );
    
    -- Update signup record
    UPDATE influencer_signups
    SET 
      subscription_started_at = NEW.created_at,
      subscription_tier_id = NEW.tier_id,
      is_active_subscriber = true
    WHERE id = signup_record.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic payout creation
DROP TRIGGER IF EXISTS trigger_create_influencer_payout ON household_subscriptions;
CREATE TRIGGER trigger_create_influencer_payout
  AFTER INSERT ON household_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION create_influencer_payout_on_subscription();
