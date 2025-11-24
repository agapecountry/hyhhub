/*
  # Add Debt Strategies to Basic Tier
  
  1. Changes
    - Add avalanche and snowball strategies to Basic tier
    - Update features JSON for 'basic' subscription tier
    
  2. Notes
    - Basic tier users can now access avalanche and snowball debt payoff methods
    - Snowflake remains Premium+ only
    - Personalized debt plans remain Elite only
*/

-- Add debt strategies to Basic tier
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{debt_strategies}',
  '["avalanche", "snowball"]'::jsonb
)
WHERE name = 'basic';
