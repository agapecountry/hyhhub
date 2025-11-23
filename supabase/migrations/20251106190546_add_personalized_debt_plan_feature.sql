/*
  # Add personalized debt plan feature flag

  1. Changes
    - Update subscription tier features to include `personalized_debt_plan` flag
    - Free tier: Can view comparison but NOT generate personalized plan
    - Basic tier: Can view comparison but NOT generate personalized plan
    - Premium tier: Can generate personalized plans
    - Elite tier: Can generate personalized plans
    - Influencer tiers: Can generate personalized plans

  2. Notes
    - This controls access to the debt payoff strategy selection and personalized payment recommendations
    - Basic users can see the comparison to understand the value, but need to upgrade for the plan
*/

-- Update Free tier
UPDATE subscription_tiers
SET features = features || '{"personalized_debt_plan": false}'::jsonb
WHERE name = 'free';

-- Update Basic tier
UPDATE subscription_tiers
SET features = features || '{"personalized_debt_plan": false}'::jsonb
WHERE name = 'basic';

-- Update Premium tier
UPDATE subscription_tiers
SET features = features || '{"personalized_debt_plan": true}'::jsonb
WHERE name = 'premium';

-- Update Elite tier
UPDATE subscription_tiers
SET features = features || '{"personalized_debt_plan": true}'::jsonb
WHERE name = 'elite';

-- Update Influencer Premium tier
UPDATE subscription_tiers
SET features = features || '{"personalized_debt_plan": true}'::jsonb
WHERE name = 'infprem';

-- Update Influencer Elite tier
UPDATE subscription_tiers
SET features = features || '{"personalized_debt_plan": true}'::jsonb
WHERE name = 'infelite';