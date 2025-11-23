/*
  # Add Projects/Savings Tracking Feature to Elite Tier
  
  1. Changes
    - Add projects_savings_tracking feature to Elite tier
    - Update InfElite to mirror Elite tier
  
  2. Feature Description
    - Elite tier users can create and track savings projects
    - Track vacations, purchases, or any savings goal
    - Link bank accounts, set goals, track progress
*/

-- Add projects_savings_tracking to Elite tier features
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{projects_savings_tracking}',
  'true'::jsonb
)
WHERE name = 'elite';

-- Add projects_savings_tracking to InfElite tier features
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{projects_savings_tracking}',
  'true'::jsonb
)
WHERE name = 'infelite';

-- Ensure other tiers don't have this feature
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{projects_savings_tracking}',
  'false'::jsonb
)
WHERE name IN ('free', 'basic', 'premium', 'infprem');
