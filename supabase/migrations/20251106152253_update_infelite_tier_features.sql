/*
  # Update InfElite Tier Features
  
  1. Changes
    - Update InfElite tier to mirror Elite tier features exactly
    - Ensures influencers with Elite tier get full Elite functionality
  
  2. Features
    - 999 Plaid connection limit
    - Auto-refresh accounts and loans
    - All debt strategies
    - Pantry tracking
    - Meal, pantry, grocery integration
*/

-- Update InfElite tier features to match Elite
UPDATE subscription_tiers
SET features = jsonb_build_object(
  'plaid_connection_limit', 999,
  'manual_refresh_accounts', true,
  'auto_refresh_accounts', true,
  'auto_refresh_loans', true,
  'debt_strategies', ARRAY['avalanche', 'snowball', 'highest_balance', 'custom'],
  'pantry_tracking', true,
  'meal_pantry_grocery_integration', true
)
WHERE name = 'infelite';
