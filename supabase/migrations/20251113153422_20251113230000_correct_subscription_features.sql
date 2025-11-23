/*
  # Correct Subscription Tier Features Based on Official PDF

  1. Key Corrections
    
    **Free Tier:**
    - No debt strategies at all (empty)
    - No auto-refresh features at all (both empty)
    
    **Basic Tier:**
    - No debt strategies (empty in PDF)
    - Auto-Refresh Accounts: Manual only
    - Auto-Refresh Loans: Empty (no access)
    
    **Premium Tier:**
    - Projects & Plans Tracking: YES (✅ in PDF)
    - Debt Strategies: Avalanche, Snowball + Snowflake
    - Auto-Refresh Accounts: On Account Load
    - Auto-Refresh Loans: Manual
    
    **Elite Tier:**
    - All features as before
    - Debt Payoff Strategies includes paycheck planner integration

  2. Changes Applied
    - Free: Empty debt_strategies array, no auto-refresh
    - Basic: Empty debt_strategies array, manual refresh accounts only
    - Premium: Added projects_savings_tracking = true
    - All tiers: Properly configured auto-refresh settings
*/

-- Update Free tier - no debt strategies, no auto-refresh
UPDATE subscription_tiers
SET features = jsonb_build_object(
  'calendar_enabled', true,
  'meal_planning_enabled', true,
  'chores_enabled', true,
  'household_multi_user', false,
  'plaid_enabled', false,
  'plaid_connection_limit', 0,
  'manual_refresh_accounts', false,
  'auto_refresh_accounts', false,
  'auto_refresh_on_load', false,
  'manual_refresh_loans', false,
  'auto_refresh_loans', false,
  'debt_strategies', '[]'::jsonb,
  'personalized_debt_plan', false,
  'paycheck_planner', false,
  'pantry_tracking', false,
  'meal_pantry_integration', false,
  'meal_pantry_grocery_integration', false,
  'projects_savings_tracking', false
)
WHERE name = 'free';

-- Update Basic tier - NO debt strategies, manual refresh accounts only
UPDATE subscription_tiers
SET features = jsonb_build_object(
  'calendar_enabled', true,
  'meal_planning_enabled', true,
  'chores_enabled', true,
  'household_multi_user', false,
  'plaid_enabled', true,
  'plaid_connection_limit', 2,
  'manual_refresh_accounts', true,
  'auto_refresh_accounts', false,
  'auto_refresh_on_load', false,
  'manual_refresh_loans', false,
  'auto_refresh_loans', false,
  'debt_strategies', '[]'::jsonb,
  'personalized_debt_plan', false,
  'paycheck_planner', false,
  'pantry_tracking', false,
  'meal_pantry_integration', false,
  'meal_pantry_grocery_integration', false,
  'projects_savings_tracking', false
)
WHERE name = 'basic';

-- Update Premium tier - ADD projects tracking, debt strategies included
UPDATE subscription_tiers
SET features = jsonb_build_object(
  'calendar_enabled', true,
  'meal_planning_enabled', true,
  'chores_enabled', true,
  'household_multi_user', true,
  'plaid_enabled', true,
  'plaid_connection_limit', 4,
  'manual_refresh_accounts', true,
  'auto_refresh_accounts', false,
  'auto_refresh_on_load', true,
  'manual_refresh_loans', true,
  'auto_refresh_loans', false,
  'debt_strategies', '["avalanche", "snowball", "snowflake"]'::jsonb,
  'personalized_debt_plan', false,
  'paycheck_planner', false,
  'pantry_tracking', true,
  'meal_pantry_integration', false,
  'meal_pantry_grocery_integration', false,
  'projects_savings_tracking', true
)
WHERE name = 'premium';

-- Update Elite tier - all features, includes paycheck planner
UPDATE subscription_tiers
SET features = jsonb_build_object(
  'calendar_enabled', true,
  'meal_planning_enabled', true,
  'chores_enabled', true,
  'household_multi_user', true,
  'plaid_enabled', true,
  'plaid_connection_limit', 10,
  'manual_refresh_accounts', true,
  'auto_refresh_accounts', true,
  'auto_refresh_on_load', true,
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

-- Sync InfPrem with Premium
UPDATE subscription_tiers
SET features = (SELECT features FROM subscription_tiers WHERE name = 'premium')
WHERE name = 'infprem';

-- Sync InfElite with Elite
UPDATE subscription_tiers
SET features = (SELECT features FROM subscription_tiers WHERE name = 'elite')
WHERE name = 'infelite';