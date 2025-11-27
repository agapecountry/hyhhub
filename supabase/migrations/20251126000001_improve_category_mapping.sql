/*
  # Improved Plaid Category Mapping
  
  This migration creates a more robust category mapping system that:
  1. Uses Plaid's detailed category hierarchy
  2. Maps common Plaid categories to user categories
  3. Can be run multiple times safely (idempotent)
  
  Plaid Category Format: ["Primary", "Detailed"]
  Examples:
  - ["Food and Drink", "Restaurants"]
  - ["Travel", "Airlines and Aviation Services"]
  - ["Shops", "Supermarkets and Groceries"]
*/

-- Update category mappings for unmodified transactions
-- This only updates transactions that haven't been manually edited
UPDATE plaid_transactions pt
SET 
  category_id = (
    SELECT tc.id
    FROM transaction_categories tc
    WHERE tc.household_id = pt.household_id
    AND (
      -- Food & Dining
      (pt.category::text ILIKE '%"Food and Drink"%' AND tc.name ILIKE ANY(ARRAY['%food%', '%dining%', '%restaurant%', '%groceries%']))
      OR (pt.category::text ILIKE '%Restaurants%' AND tc.name ILIKE ANY(ARRAY['%restaurant%', '%dining%', '%food%']))
      OR (pt.category::text ILIKE '%Supermarkets%' AND tc.name ILIKE ANY(ARRAY['%groceries%', '%food%', '%shopping%']))
      OR (pt.category::text ILIKE '%Fast Food%' AND tc.name ILIKE ANY(ARRAY['%fast food%', '%restaurant%', '%dining%']))
      
      -- Travel & Transportation
      OR (pt.category::text ILIKE '%Travel%' AND tc.name ILIKE ANY(ARRAY['%travel%', '%transportation%', '%gas%']))
      OR (pt.category::text ILIKE '%Airlines%' AND tc.name ILIKE ANY(ARRAY['%travel%', '%airline%', '%flight%']))
      OR (pt.category::text ILIKE '%Gas Stations%' AND tc.name ILIKE ANY(ARRAY['%gas%', '%fuel%', '%auto%', '%car%']))
      OR (pt.category::text ILIKE '%Taxi%' AND tc.name ILIKE ANY(ARRAY['%transportation%', '%taxi%', '%uber%', '%lyft%']))
      OR (pt.category::text ILIKE '%Public Transportation%' AND tc.name ILIKE ANY(ARRAY['%transportation%', '%transit%', '%bus%', '%train%']))
      
      -- Shopping & Retail
      OR (pt.category::text ILIKE '%Shops%' AND tc.name ILIKE ANY(ARRAY['%shopping%', '%retail%', '%store%']))
      OR (pt.category::text ILIKE '%Department Stores%' AND tc.name ILIKE ANY(ARRAY['%shopping%', '%retail%', '%store%']))
      OR (pt.category::text ILIKE '%Clothing%' AND tc.name ILIKE ANY(ARRAY['%clothing%', '%apparel%', '%shopping%']))
      OR (pt.category::text ILIKE '%Electronics%' AND tc.name ILIKE ANY(ARRAY['%electronics%', '%tech%', '%shopping%']))
      
      -- Entertainment & Recreation
      OR (pt.category::text ILIKE '%Recreation%' AND tc.name ILIKE ANY(ARRAY['%entertainment%', '%fun%', '%leisure%', '%recreation%']))
      OR (pt.category::text ILIKE '%Entertainment%' AND tc.name ILIKE ANY(ARRAY['%entertainment%', '%fun%', '%leisure%']))
      OR (pt.category::text ILIKE '%Gyms and Fitness%' AND tc.name ILIKE ANY(ARRAY['%gym%', '%fitness%', '%health%', '%recreation%']))
      OR (pt.category::text ILIKE '%Sports%' AND tc.name ILIKE ANY(ARRAY['%sports%', '%recreation%', '%entertainment%']))
      
      -- Bills & Utilities
      OR (pt.category::text ILIKE '%Service%' AND tc.name ILIKE ANY(ARRAY['%utilities%', '%services%', '%bills%']))
      OR (pt.category::text ILIKE '%Utilities%' AND tc.name ILIKE ANY(ARRAY['%utilities%', '%bills%']))
      OR (pt.category::text ILIKE '%Internet%' AND tc.name ILIKE ANY(ARRAY['%internet%', '%cable%', '%utilities%']))
      OR (pt.category::text ILIKE '%Phone%' AND tc.name ILIKE ANY(ARRAY['%phone%', '%mobile%', '%utilities%']))
      OR (pt.category::text ILIKE '%Electric%' AND tc.name ILIKE ANY(ARRAY['%electric%', '%utilities%', '%power%']))
      OR (pt.category::text ILIKE '%Water%' AND tc.name ILIKE ANY(ARRAY['%water%', '%utilities%']))
      
      -- Healthcare & Medical
      OR (pt.category::text ILIKE '%Healthcare%' AND tc.name ILIKE ANY(ARRAY['%health%', '%medical%', '%healthcare%']))
      OR (pt.category::text ILIKE '%Medical%' AND tc.name ILIKE ANY(ARRAY['%medical%', '%health%', '%doctor%']))
      OR (pt.category::text ILIKE '%Pharmacy%' AND tc.name ILIKE ANY(ARRAY['%pharmacy%', '%medical%', '%health%', '%drug%']))
      OR (pt.category::text ILIKE '%Dental%' AND tc.name ILIKE ANY(ARRAY['%dental%', '%dentist%', '%health%']))
      
      -- Personal Care
      OR (pt.category::text ILIKE '%Personal Care%' AND tc.name ILIKE ANY(ARRAY['%personal%', '%care%', '%beauty%', '%grooming%']))
      OR (pt.category::text ILIKE '%Hair%' AND tc.name ILIKE ANY(ARRAY['%hair%', '%salon%', '%personal%', '%beauty%']))
      
      -- Home & Garden
      OR (pt.category::text ILIKE '%Home Improvement%' AND tc.name ILIKE ANY(ARRAY['%home%', '%improvement%', '%repair%', '%maintenance%']))
      OR (pt.category::text ILIKE '%Furniture%' AND tc.name ILIKE ANY(ARRAY['%furniture%', '%home%', '%shopping%']))
      
      -- Financial
      OR (pt.category::text ILIKE '%Bank Fees%' AND tc.name ILIKE ANY(ARRAY['%bank%', '%fee%', '%financial%']))
      OR (pt.category::text ILIKE '%ATM%' AND tc.name ILIKE ANY(ARRAY['%atm%', '%cash%', '%bank%']))
      OR (pt.category::text ILIKE '%Interest%' AND tc.name ILIKE ANY(ARRAY['%interest%', '%finance%']))
      
      -- Payment & Transfer (Income)
      OR (pt.category::text ILIKE '%Payment%' AND pt.amount < 0 AND tc.name ILIKE ANY(ARRAY['%income%', '%salary%', '%paycheck%', '%payment%']))
      OR (pt.category::text ILIKE '%Deposit%' AND pt.amount < 0 AND tc.name ILIKE ANY(ARRAY['%income%', '%deposit%']))
    )
    ORDER BY 
      -- Prioritize more specific category names
      CASE 
        WHEN tc.name ILIKE CONCAT('%', SUBSTRING(pt.category::text FROM '"([^"]+)"'), '%') THEN 1
        ELSE 2
      END,
      tc.name
    LIMIT 1
  ),
  auto_matched = CASE 
    WHEN category_id IS NULL THEN true
    ELSE COALESCE(auto_matched, false)
  END,
  match_confidence = CASE 
    WHEN category_id IS NULL THEN 'medium'
    ELSE COALESCE(match_confidence, 'low')
  END
WHERE user_modified = false
AND category IS NOT NULL
AND category::text != '[]';

-- Add helpful comment
COMMENT ON TABLE plaid_transactions IS 'Stores Plaid transaction data. Auto-matched categories are updated during sync unless user_modified is true.';
