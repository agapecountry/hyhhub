/*
  # Add Elite Subscription Tier

  1. Changes
    - Add Elite tier to subscription_tiers table
    - Elite tier features:
      - 20 Plaid connections
      - Auto-refresh for both bank accounts and loans
      - All premium features included
    - Pricing: $10/month or $100/year

  2. Important Notes
    - Updates tier data if already exists
    - No changes to existing subscriptions
*/

-- Insert Elite tier
INSERT INTO subscription_tiers (name, display_name, monthly_price_cents, annual_price_cents, features)
VALUES 
  (
    'elite',
    'Elite',
    1000,
    10000,
    '{
      "plaid_enabled": true,
      "plaid_connection_limit": 20,
      "plaid_auto_refresh": true,
      "plaid_auto_refresh_loans": true,
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

-- Update Premium tier to clarify it doesn't have loan auto-refresh
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{plaid_auto_refresh_loans}',
  'false'::jsonb
)
WHERE name = 'premium';

-- Update Basic tier to clarify it doesn't have loan auto-refresh
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{plaid_auto_refresh_loans}',
  'false'::jsonb
)
WHERE name = 'basic';

-- Update Free tier to clarify it doesn't have loan auto-refresh
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{plaid_auto_refresh_loans}',
  'false'::jsonb
)
WHERE name = 'free';