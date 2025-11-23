/*
  # Subscription Tiers System

  1. New Tables
    - `subscription_tiers`
      - `id` (uuid, primary key)
      - `name` (text) - tier name (free, basic, premium)
      - `display_name` (text) - user-facing name
      - `monthly_price_cents` (integer) - monthly price in cents
      - `annual_price_cents` (integer) - annual price in cents
      - `features` (jsonb) - feature flags and limits
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `household_subscriptions`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key)
      - `tier_id` (uuid, foreign key)
      - `billing_period` (text) - monthly or annual
      - `status` (text) - active, canceled, past_due, trialing
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `cancel_at_period_end` (boolean)
      - `stripe_subscription_id` (text) - for future Stripe integration
      - `stripe_customer_id` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `plaid_connections`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key)
      - `plaid_item_id` (text) - Plaid item ID
      - `plaid_access_token` (text) - encrypted access token
      - `institution_name` (text)
      - `institution_id` (text)
      - `last_refresh` (timestamptz)
      - `status` (text) - active, error, disconnected
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for household members to view their subscription
    - Add policies for admins to manage subscriptions
    - Restrict Plaid connection access to household members only

  3. Important Notes
    - Free tier is default for all households
    - Feature limits enforced in application and edge functions
    - Plaid tokens should be encrypted at rest (application layer)
    - Subscription status checked on feature access
*/

-- Create subscription tiers table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  monthly_price_cents integer NOT NULL,
  annual_price_cents integer NOT NULL,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create household subscriptions table
CREATE TABLE IF NOT EXISTS household_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES subscription_tiers(id),
  billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'annual')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(household_id)
);

-- Create Plaid connections table
CREATE TABLE IF NOT EXISTS plaid_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  plaid_item_id text NOT NULL,
  plaid_access_token text NOT NULL,
  institution_name text NOT NULL,
  institution_id text NOT NULL,
  last_refresh timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_household_subscriptions_household ON household_subscriptions(household_id);
CREATE INDEX IF NOT EXISTS idx_household_subscriptions_tier ON household_subscriptions(tier_id);
CREATE INDEX IF NOT EXISTS idx_plaid_connections_household ON plaid_connections(household_id);
CREATE INDEX IF NOT EXISTS idx_plaid_connections_item ON plaid_connections(plaid_item_id);

-- Enable RLS
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_connections ENABLE ROW LEVEL SECURITY;

-- Subscription tiers policies (public read)
CREATE POLICY "Anyone can view subscription tiers"
  ON subscription_tiers FOR SELECT
  TO authenticated
  USING (true);

-- Household subscriptions policies
CREATE POLICY "Household members can view their subscription"
  ON household_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household admins can insert subscriptions"
  ON household_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Household admins can update subscriptions"
  ON household_subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Plaid connections policies
CREATE POLICY "Household members can view their Plaid connections"
  ON plaid_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household admins can manage Plaid connections"
  ON plaid_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Household admins can update Plaid connections"
  ON plaid_connections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Household admins can delete Plaid connections"
  ON plaid_connections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Insert subscription tier data
INSERT INTO subscription_tiers (name, display_name, monthly_price_cents, annual_price_cents, features)
VALUES 
  (
    'free',
    'Free',
    0,
    0,
    '{
      "plaid_enabled": false,
      "plaid_connection_limit": 0,
      "plaid_auto_refresh": false,
      "debt_strategies": ["avalanche", "snowball"],
      "pantry_tracking": false,
      "meal_pantry_integration": false
    }'::jsonb
  ),
  (
    'basic',
    'Basic',
    500,
    5000,
    '{
      "plaid_enabled": true,
      "plaid_connection_limit": 4,
      "plaid_auto_refresh": false,
      "debt_strategies": ["avalanche", "snowball", "snowflake"],
      "pantry_tracking": false,
      "meal_pantry_integration": false
    }'::jsonb
  ),
  (
    'premium',
    'Premium',
    800,
    8000,
    '{
      "plaid_enabled": true,
      "plaid_connection_limit": 12,
      "plaid_auto_refresh": true,
      "debt_strategies": ["avalanche", "snowball", "snowflake"],
      "pantry_tracking": true,
      "meal_pantry_integration": true
    }'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  annual_price_cents = EXCLUDED.annual_price_cents,
  features = EXCLUDED.features,
  updated_at = now();

-- Function to get household subscription with tier info
CREATE OR REPLACE FUNCTION get_household_subscription_info(p_household_id uuid)
RETURNS TABLE (
  tier_name text,
  tier_display_name text,
  features jsonb,
  status text,
  billing_period text,
  current_period_end timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.name,
    st.display_name,
    st.features,
    COALESCE(hs.status, 'active'),
    COALESCE(hs.billing_period, 'monthly'),
    hs.current_period_end
  FROM subscription_tiers st
  LEFT JOIN household_subscriptions hs 
    ON hs.tier_id = st.id 
    AND hs.household_id = p_household_id
  WHERE st.name = COALESCE(
    (SELECT t.name FROM household_subscriptions hss 
     JOIN subscription_tiers t ON t.id = hss.tier_id 
     WHERE hss.household_id = p_household_id),
    'free'
  );
END;
$$;

-- Function to check if household has feature access
CREATE OR REPLACE FUNCTION household_has_feature(p_household_id uuid, p_feature_key text)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_feature boolean;
BEGIN
  SELECT 
    CASE 
      WHEN st.features->p_feature_key = 'true'::jsonb THEN true
      ELSE false
    END
  INTO v_has_feature
  FROM subscription_tiers st
  LEFT JOIN household_subscriptions hs ON hs.tier_id = st.id AND hs.household_id = p_household_id
  WHERE st.name = COALESCE(
    (SELECT t.name FROM household_subscriptions hss 
     JOIN subscription_tiers t ON t.id = hss.tier_id 
     WHERE hss.household_id = p_household_id AND hss.status = 'active'),
    'free'
  )
  LIMIT 1;
  
  RETURN COALESCE(v_has_feature, false);
END;
$$;