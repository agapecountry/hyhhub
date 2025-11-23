/*
  # Sync Influencer Tier Features with Premium and Elite

  1. Problem
    - Influencer tiers (infprem, infelite) may be missing some features that were added to Premium/Elite tiers
    - Need to ensure influencer tiers have exact same features as their corresponding paid tiers

  2. Solution
    - Update infprem to have ALL Premium tier features
    - Update infelite to have ALL Elite tier features
    - Ensure feature parity is maintained

  3. Features to Sync
    - plaid_auto_refresh_loans (Elite only)
    - paycheck_planner (Premium and Elite)
    - personalized_debt_plan (Premium and Elite)
    - projects_savings_tracking (Elite only)
    - All Plaid settings
    - All debt strategies
    - Pantry and meal integration settings
*/

-- First, let's get the current Premium tier features and apply to infprem
DO $$
DECLARE
  premium_features jsonb;
BEGIN
  -- Get Premium tier features
  SELECT features INTO premium_features
  FROM subscription_tiers
  WHERE name = 'premium';

  -- Update infprem to match Premium exactly
  UPDATE subscription_tiers
  SET features = premium_features,
      updated_at = now()
  WHERE name = 'infprem';
END $$;

-- Then, get the current Elite tier features and apply to infelite
DO $$
DECLARE
  elite_features jsonb;
BEGIN
  -- Get Elite tier features
  SELECT features INTO elite_features
  FROM subscription_tiers
  WHERE name = 'elite';

  -- Update infelite to match Elite exactly
  UPDATE subscription_tiers
  SET features = elite_features,
      updated_at = now()
  WHERE name = 'infelite';
END $$;

-- Verify and log the synchronization
DO $$
DECLARE
  infprem_features jsonb;
  infelite_features jsonb;
  premium_features jsonb;
  elite_features jsonb;
BEGIN
  SELECT features INTO premium_features FROM subscription_tiers WHERE name = 'premium';
  SELECT features INTO elite_features FROM subscription_tiers WHERE name = 'elite';
  SELECT features INTO infprem_features FROM subscription_tiers WHERE name = 'infprem';
  SELECT features INTO infelite_features FROM subscription_tiers WHERE name = 'infelite';

  RAISE NOTICE 'Premium features: %', premium_features;
  RAISE NOTICE 'InfPrem features: %', infprem_features;
  RAISE NOTICE 'Elite features: %', elite_features;
  RAISE NOTICE 'InfElite features: %', infelite_features;

  -- Check if they match
  IF premium_features = infprem_features THEN
    RAISE NOTICE 'SUCCESS: InfPrem features match Premium';
  ELSE
    RAISE WARNING 'MISMATCH: InfPrem features do not match Premium';
  END IF;

  IF elite_features = infelite_features THEN
    RAISE NOTICE 'SUCCESS: InfElite features match Elite';
  ELSE
    RAISE WARNING 'MISMATCH: InfElite features do not match Elite';
  END IF;
END $$;
