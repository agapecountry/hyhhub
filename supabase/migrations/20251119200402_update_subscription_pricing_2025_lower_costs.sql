/*
  # Update Subscription Tier Pricing - Lower Costs

  1. Changes
    - Basic tier: $7/month ($700 cents), $77/year ($7700 cents) - save $7 (1 month free)
    - Premium tier: $10/month ($1000 cents), $110/year ($11000 cents) - save $10 (1 month free)
    - Elite tier: $15/month ($1500 cents), $165/year ($16500 cents) - save $15 (1 month free)
    
  2. Pricing Philosophy
    - More accessible pricing for families
    - Annual plans save exactly 1 month (12 months for price of 11)
    - Competitive with other household management apps
*/

-- Update Basic tier pricing
UPDATE subscription_tiers
SET 
  monthly_price_cents = 700,
  annual_price_cents = 7700,
  updated_at = now()
WHERE name = 'basic';

-- Update Premium tier pricing
UPDATE subscription_tiers
SET 
  monthly_price_cents = 1000,
  annual_price_cents = 11000,
  updated_at = now()
WHERE name = 'premium';

-- Update Elite tier pricing
UPDATE subscription_tiers
SET 
  monthly_price_cents = 1500,
  annual_price_cents = 16500,
  updated_at = now()
WHERE name = 'elite';

-- Verify the changes
DO $$
DECLARE
  basic_monthly INTEGER;
  basic_annual INTEGER;
  premium_monthly INTEGER;
  premium_annual INTEGER;
  elite_monthly INTEGER;
  elite_annual INTEGER;
BEGIN
  SELECT monthly_price_cents, annual_price_cents INTO basic_monthly, basic_annual
  FROM subscription_tiers WHERE name = 'basic';
  
  SELECT monthly_price_cents, annual_price_cents INTO premium_monthly, premium_annual
  FROM subscription_tiers WHERE name = 'premium';
  
  SELECT monthly_price_cents, annual_price_cents INTO elite_monthly, elite_annual
  FROM subscription_tiers WHERE name = 'elite';
  
  RAISE NOTICE 'Basic: $%.2f monthly, $%.2f annually (saves $%.2f)', 
    basic_monthly::DECIMAL / 100, basic_annual::DECIMAL / 100, 
    ((basic_monthly * 12) - basic_annual)::DECIMAL / 100;
  
  RAISE NOTICE 'Premium: $%.2f monthly, $%.2f annually (saves $%.2f)', 
    premium_monthly::DECIMAL / 100, premium_annual::DECIMAL / 100, 
    ((premium_monthly * 12) - premium_annual)::DECIMAL / 100;
  
  RAISE NOTICE 'Elite: $%.2f monthly, $%.2f annually (saves $%.2f)', 
    elite_monthly::DECIMAL / 100, elite_annual::DECIMAL / 100, 
    ((elite_monthly * 12) - elite_annual)::DECIMAL / 100;
END $$;