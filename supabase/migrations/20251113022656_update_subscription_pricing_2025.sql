/*
  # Update Subscription Tier Pricing

  Updates subscription tier pricing to new pricing structure:
  - Basic: $10/month or $100/year
  - Premium: $15/month or $150/year
  - Elite: $20/month or $200/year

  Note: Prices are stored in cents
*/

-- Update Basic tier pricing
UPDATE subscription_tiers
SET 
  monthly_price_cents = 1000,
  annual_price_cents = 10000,
  updated_at = now()
WHERE name = 'basic';

-- Update Premium tier pricing
UPDATE subscription_tiers
SET 
  monthly_price_cents = 1500,
  annual_price_cents = 15000,
  updated_at = now()
WHERE name = 'premium';

-- Update Elite tier pricing
UPDATE subscription_tiers
SET 
  monthly_price_cents = 2000,
  annual_price_cents = 20000,
  updated_at = now()
WHERE name = 'elite';
