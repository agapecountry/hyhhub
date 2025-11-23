/*
  # Update Debt Strategies by Tier
  
  1. Changes
    - Basic tier: Avalanche and Snowball only
    - Premium tier: Adds Snowflake (custom) strategy
    - Elite tier: All strategies including Snowflake
  
  2. Notes
    - Free tier keeps basic strategies
    - InfPrem mirrors Premium tier strategies
    - InfElite mirrors Elite tier strategies
*/

-- Update Basic tier to only have avalanche and snowball
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{debt_strategies}',
  '["avalanche", "snowball"]'::jsonb
)
WHERE name = 'basic';

-- Update Premium tier to have avalanche, snowball, and snowflake
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{debt_strategies}',
  '["avalanche", "snowball", "snowflake"]'::jsonb
)
WHERE name = 'premium';

-- Update Elite tier to have all strategies
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{debt_strategies}',
  '["avalanche", "snowball", "snowflake", "highest_balance", "custom"]'::jsonb
)
WHERE name = 'elite';

-- Update InfPrem to mirror Premium
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{debt_strategies}',
  '["avalanche", "snowball", "snowflake"]'::jsonb
)
WHERE name = 'infprem';

-- Update InfElite to mirror Elite
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{debt_strategies}',
  '["avalanche", "snowball", "snowflake", "highest_balance", "custom"]'::jsonb
)
WHERE name = 'infelite';
