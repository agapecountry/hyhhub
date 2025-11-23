/*
  # Fix Tier Feature Mismatches

  1. Issues Found
    - Premium and InfPrem features don't match documentation
    - Elite and InfElite features don't match each other
    - Some Elite-only features incorrectly enabled on Premium tiers

  2. Corrections Based on Documentation (SUBSCRIPTION_TIERS.md)
    
    Premium tier should have:
    - auto_refresh_loans: false (Elite-only)
    - manual_refresh_loans: false (Elite-only)
    - plaid_connection_limit: 5
    - meal_pantry_integration: false (Elite-only)
    
    InfPrem should match Premium exactly
    
    Elite should have:
    - meal_pantry_grocery_integration: true (was missing)
    
    InfElite should match Elite exactly

  3. Impact
    - Ensures tier features match documentation
    - Maintains proper feature gates for Elite-only features
    - Keeps influencer tiers in sync with paid tiers
*/

-- Fix Premium tier features
UPDATE subscription_tiers
SET features = jsonb_build_object(
  'plaid_enabled', true,
  'plaid_connection_limit', 5,
  'manual_refresh_accounts', true,
  'auto_refresh_accounts', true,
  'manual_refresh_loans', false,
  'auto_refresh_loans', false,
  'debt_strategies', '["avalanche", "snowball", "snowflake"]'::jsonb,
  'personalized_debt_plan', true,
  'paycheck_planner', true,
  'pantry_tracking', true,
  'meal_pantry_integration', false,
  'projects_savings_tracking', false
)
WHERE name = 'premium';

-- Fix InfPrem to exactly match Premium
UPDATE subscription_tiers
SET features = (SELECT features FROM subscription_tiers WHERE name = 'premium')
WHERE name = 'infprem';

-- Fix Elite tier features (add meal_pantry_grocery_integration)
UPDATE subscription_tiers
SET features = jsonb_build_object(
  'plaid_enabled', true,
  'plaid_connection_limit', 20,
  'manual_refresh_accounts', true,
  'auto_refresh_accounts', true,
  'manual_refresh_loans', true,
  'auto_refresh_loans', true,
  'debt_strategies', '["avalanche", "snowball", "snowflake", "highest_balance", "custom"]'::jsonb,
  'personalized_debt_plan', true,
  'paycheck_planner', true,
  'pantry_tracking', true,
  'meal_pantry_integration', true,
  'meal_pantry_grocery_integration', true,
  'projects_savings_tracking', true
)
WHERE name = 'elite';

-- Fix InfElite to exactly match Elite
UPDATE subscription_tiers
SET features = (SELECT features FROM subscription_tiers WHERE name = 'elite')
WHERE name = 'infelite';