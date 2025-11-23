/*
  # Add Paycheck Planner to Subscription Tier Features

  Adds paycheck_planner feature flag to subscription tiers.
  Available for Premium and Elite tiers only.
*/

-- Add paycheck_planner feature to Premium tier
UPDATE subscription_tiers
SET 
  features = jsonb_set(features, '{paycheck_planner}', 'true'::jsonb),
  updated_at = now()
WHERE name = 'premium';

-- Add paycheck_planner feature to Elite tier
UPDATE subscription_tiers
SET 
  features = jsonb_set(features, '{paycheck_planner}', 'true'::jsonb),
  updated_at = now()
WHERE name = 'elite';

-- Add paycheck_planner feature to Influencer tiers
UPDATE subscription_tiers
SET 
  features = jsonb_set(features, '{paycheck_planner}', 'true'::jsonb),
  updated_at = now()
WHERE name IN ('infprem', 'infelite');

-- Ensure Basic and Free tiers don't have this feature
UPDATE subscription_tiers
SET 
  features = jsonb_set(features, '{paycheck_planner}', 'false'::jsonb),
  updated_at = now()
WHERE name IN ('basic', 'free');
