/*
  # Fix Missing Features in Influencer Tiers

  1. Problem
    - Influencer tiers missing critical features that paid tiers have
    - Missing: plaid_enabled, manual_refresh_loans, meal_pantry_integration (infprem)
    - This causes feature checks to fail even though influencers should have full access

  2. Solution
    - Add missing features to infprem tier
    - Add missing features to infelite tier
    - Ensure feature parity with equivalent paid tiers

  3. Features Updated
    - infprem: Add plaid_enabled, manual_refresh_loans, meal_pantry_integration
    - infelite: Add plaid_enabled, manual_refresh_loans, meal_pantry_integration
*/

-- Update Influencer Premium tier with missing features
UPDATE subscription_tiers
SET features = features || jsonb_build_object(
  'plaid_enabled', true,
  'manual_refresh_loans', true,
  'meal_pantry_integration', true
)
WHERE name = 'infprem';

-- Update Influencer Elite tier with missing features  
UPDATE subscription_tiers
SET features = features || jsonb_build_object(
  'plaid_enabled', true,
  'manual_refresh_loans', true,
  'meal_pantry_integration', true
)
WHERE name = 'infelite';