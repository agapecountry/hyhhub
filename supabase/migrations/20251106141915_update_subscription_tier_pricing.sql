/*
  # Update Subscription Tier Pricing
  
  1. Changes
    - Update Basic tier: $8.00/mo ($800 cents), $80.00/year ($8000 cents)
    - Update Premium tier: $10.00/mo ($1000 cents), $100.00/year ($10000 cents)
    - Update Elite tier: $15.00/mo ($1500 cents), $120.00/year ($12000 cents)
  
  2. Notes
    - Prices are stored in cents to avoid floating-point precision issues
    - Free tier remains unchanged at $0
*/

-- Update Basic tier pricing
UPDATE subscription_tiers
SET 
  monthly_price_cents = 800,
  annual_price_cents = 8000
WHERE name = 'basic';

-- Update Premium tier pricing
UPDATE subscription_tiers
SET 
  monthly_price_cents = 1000,
  annual_price_cents = 10000
WHERE name = 'premium';

-- Update Elite tier pricing
UPDATE subscription_tiers
SET 
  monthly_price_cents = 1500,
  annual_price_cents = 12000
WHERE name = 'elite';
