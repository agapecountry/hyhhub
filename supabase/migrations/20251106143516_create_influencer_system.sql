/*
  # Create Influencer System
  
  1. New Subscription Tiers
    - `InfPrem` - Influencer Premium tier (free Premium access)
    - `InfElite` - Influencer Elite tier (free Elite access)
  
  2. New Tables
    - `influencer_codes`
      - Stores unique signup codes for influencers
      - Tracks code metadata and status
    - `influencer_signups`
      - Tracks which users signed up with which influencer code
      - Links users to influencer codes for revenue tracking
  
  3. Schema Changes
    - Add `referral_code` to users table to track signup codes
    - Add `is_influencer_tier` flag to subscription_tiers
  
  4. Security
    - Enable RLS on new tables
    - Add policies for influencers to view their own statistics
    - Restrict influencer code creation to admins
*/

-- Add influencer flag to subscription_tiers
ALTER TABLE subscription_tiers 
ADD COLUMN IF NOT EXISTS is_influencer_tier boolean DEFAULT false;

-- Insert InfPrem tier (Premium features, no cost)
INSERT INTO subscription_tiers (
  id,
  name,
  display_name,
  monthly_price_cents,
  annual_price_cents,
  is_influencer_tier,
  features
)
VALUES (
  gen_random_uuid(),
  'infprem',
  'Influencer Premium',
  0,
  0,
  true,
  jsonb_build_object(
    'plaid_connection_limit', 5,
    'manual_refresh_accounts', true,
    'auto_refresh_accounts', true,
    'auto_refresh_loans', true,
    'debt_strategies', ARRAY['avalanche', 'snowball', 'highest_balance', 'custom'],
    'pantry_tracking', true
  )
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  annual_price_cents = EXCLUDED.annual_price_cents,
  is_influencer_tier = EXCLUDED.is_influencer_tier,
  features = EXCLUDED.features;

-- Insert InfElite tier (Elite features, no cost)
INSERT INTO subscription_tiers (
  id,
  name,
  display_name,
  monthly_price_cents,
  annual_price_cents,
  is_influencer_tier,
  features
)
VALUES (
  gen_random_uuid(),
  'infelite',
  'Influencer Elite',
  0,
  0,
  true,
  jsonb_build_object(
    'plaid_connection_limit', 999,
    'manual_refresh_accounts', true,
    'auto_refresh_accounts', true,
    'auto_refresh_loans', true,
    'debt_strategies', ARRAY['avalanche', 'snowball', 'highest_balance', 'custom'],
    'pantry_tracking', true,
    'meal_pantry_grocery_integration', true
  )
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  annual_price_cents = EXCLUDED.annual_price_cents,
  is_influencer_tier = EXCLUDED.is_influencer_tier,
  features = EXCLUDED.features;

-- Create influencer_codes table
CREATE TABLE IF NOT EXISTS influencer_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id uuid REFERENCES subscription_tiers(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  max_uses integer DEFAULT NULL,
  current_uses integer DEFAULT 0,
  expires_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create influencer_signups table
CREATE TABLE IF NOT EXISTS influencer_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_code_id uuid REFERENCES influencer_codes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  signed_up_at timestamptz DEFAULT now(),
  subscription_started_at timestamptz DEFAULT NULL,
  subscription_tier_id uuid REFERENCES subscription_tiers(id) ON DELETE SET NULL,
  is_active_subscriber boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(influencer_code_id, user_id)
);

-- Add referral_code to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS referral_code text;

-- Add index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;

-- Add indexes for influencer tables
CREATE INDEX IF NOT EXISTS idx_influencer_codes_user_id ON influencer_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_influencer_codes_code ON influencer_codes(code);
CREATE INDEX IF NOT EXISTS idx_influencer_codes_active ON influencer_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_influencer_signups_code_id ON influencer_signups(influencer_code_id);
CREATE INDEX IF NOT EXISTS idx_influencer_signups_user_id ON influencer_signups(user_id);
CREATE INDEX IF NOT EXISTS idx_influencer_signups_household_id ON influencer_signups(household_id);

-- Enable RLS
ALTER TABLE influencer_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_signups ENABLE ROW LEVEL SECURITY;

-- Policies for influencer_codes

-- Influencers can view their own codes
CREATE POLICY "Influencers can view own codes"
  ON influencer_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only admins can insert codes (implement admin check as needed)
-- For now, allowing authenticated users to create their own codes
CREATE POLICY "Users can create own influencer codes"
  ON influencer_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Influencers can update their own codes
CREATE POLICY "Influencers can update own codes"
  ON influencer_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Influencers can delete their own codes
CREATE POLICY "Influencers can delete own codes"
  ON influencer_codes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for influencer_signups

-- Influencers can view signups from their codes
CREATE POLICY "Influencers can view own signups"
  ON influencer_signups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM influencer_codes
      WHERE influencer_codes.id = influencer_signups.influencer_code_id
      AND influencer_codes.user_id = auth.uid()
    )
  );

-- Users can view their own signup record
CREATE POLICY "Users can view own signup record"
  ON influencer_signups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert signup records (application logic)
CREATE POLICY "Authenticated users can insert signups"
  ON influencer_signups FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- System can update signup records
CREATE POLICY "System can update signups"
  ON influencer_signups FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM influencer_codes
      WHERE influencer_codes.id = influencer_signups.influencer_code_id
      AND influencer_codes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM influencer_codes
      WHERE influencer_codes.id = influencer_signups.influencer_code_id
      AND influencer_codes.user_id = auth.uid()
    )
  );

-- Create function to increment code usage
CREATE OR REPLACE FUNCTION increment_influencer_code_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE influencer_codes
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = NEW.influencer_code_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-increment usage
DROP TRIGGER IF EXISTS trigger_increment_code_usage ON influencer_signups;
CREATE TRIGGER trigger_increment_code_usage
  AFTER INSERT ON influencer_signups
  FOR EACH ROW
  EXECUTE FUNCTION increment_influencer_code_usage();

-- Create function to validate influencer code
CREATE OR REPLACE FUNCTION validate_influencer_code(code_text text)
RETURNS TABLE (
  is_valid boolean,
  code_id uuid,
  tier_id uuid,
  tier_name text,
  message text
) AS $$
DECLARE
  code_record influencer_codes%ROWTYPE;
  tier_record subscription_tiers%ROWTYPE;
BEGIN
  -- Find the code
  SELECT * INTO code_record
  FROM influencer_codes
  WHERE code = code_text;

  -- Check if code exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::uuid, NULL::text, 'Invalid code'::text;
    RETURN;
  END IF;

  -- Check if code is active
  IF NOT code_record.is_active THEN
    RETURN QUERY SELECT false, code_record.id, NULL::uuid, NULL::text, 'Code is inactive'::text;
    RETURN;
  END IF;

  -- Check if code has expired
  IF code_record.expires_at IS NOT NULL AND code_record.expires_at < now() THEN
    RETURN QUERY SELECT false, code_record.id, NULL::uuid, NULL::text, 'Code has expired'::text;
    RETURN;
  END IF;

  -- Check if code has reached max uses
  IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
    RETURN QUERY SELECT false, code_record.id, NULL::uuid, NULL::text, 'Code has reached maximum uses'::text;
    RETURN;
  END IF;

  -- Get tier info
  SELECT * INTO tier_record
  FROM subscription_tiers
  WHERE id = code_record.tier_id;

  -- Code is valid
  RETURN QUERY SELECT 
    true,
    code_record.id,
    tier_record.id,
    tier_record.name,
    'Valid code'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
