/*
  # Backfill Auto-Matching for Existing Plaid Transactions
  
  This is a one-time migration to add auto-matching data to existing Plaid transactions.
  It will be replaced by a more sophisticated version in the sync function.
*/

-- Simple category matching based on Plaid category keywords
UPDATE plaid_transactions pt
SET 
  category_id = (
    SELECT tc.id
    FROM transaction_categories tc
    WHERE tc.household_id = pt.household_id
    AND (
      -- Food & Dining
      (pt.category::text ILIKE '%food%' AND tc.name ILIKE ANY(ARRAY['%food%', '%dining%', '%restaurant%', '%groceries%']))
      OR
      -- Travel & Transportation
      (pt.category::text ILIKE '%travel%' AND tc.name ILIKE ANY(ARRAY['%travel%', '%transportation%', '%gas%', '%fuel%']))
      OR
      -- Shopping
      (pt.category::text ILIKE '%shop%' AND tc.name ILIKE ANY(ARRAY['%shopping%', '%retail%']))
      OR
      -- Entertainment
      (pt.category::text ILIKE '%recreation%' AND tc.name ILIKE ANY(ARRAY['%entertainment%', '%fun%', '%leisure%']))
      OR
      -- Utilities & Services
      (pt.category::text ILIKE '%service%' AND tc.name ILIKE ANY(ARRAY['%utilities%', '%services%']))
      OR
      -- Healthcare
      (pt.category::text ILIKE '%health%' AND tc.name ILIKE ANY(ARRAY['%health%', '%medical%']))
    )
    LIMIT 1
  ),
  auto_matched = CASE 
    WHEN category_id IS NULL AND EXISTS (
      SELECT 1 FROM transaction_categories tc
      WHERE tc.household_id = pt.household_id
      AND (
        (pt.category::text ILIKE '%food%' AND tc.name ILIKE ANY(ARRAY['%food%', '%dining%', '%restaurant%', '%groceries%']))
        OR (pt.category::text ILIKE '%travel%' AND tc.name ILIKE ANY(ARRAY['%travel%', '%transportation%', '%gas%', '%fuel%']))
        OR (pt.category::text ILIKE '%shop%' AND tc.name ILIKE ANY(ARRAY['%shopping%', '%retail%']))
        OR (pt.category::text ILIKE '%recreation%' AND tc.name ILIKE ANY(ARRAY['%entertainment%', '%fun%', '%leisure%']))
        OR (pt.category::text ILIKE '%service%' AND tc.name ILIKE ANY(ARRAY['%utilities%', '%services%']))
        OR (pt.category::text ILIKE '%health%' AND tc.name ILIKE ANY(ARRAY['%health%', '%medical%']))
      )
    ) THEN true
    ELSE COALESCE(auto_matched, false)
  END,
  match_confidence = CASE 
    WHEN category_id IS NULL AND EXISTS (
      SELECT 1 FROM transaction_categories tc
      WHERE tc.household_id = pt.household_id
      AND (
        (pt.category::text ILIKE '%food%' AND tc.name ILIKE ANY(ARRAY['%food%', '%dining%', '%restaurant%', '%groceries%']))
        OR (pt.category::text ILIKE '%travel%' AND tc.name ILIKE ANY(ARRAY['%travel%', '%transportation%', '%gas%', '%fuel%']))
        OR (pt.category::text ILIKE '%shop%' AND tc.name ILIKE ANY(ARRAY['%shopping%', '%retail%']))
        OR (pt.category::text ILIKE '%recreation%' AND tc.name ILIKE ANY(ARRAY['%entertainment%', '%fun%', '%leisure%']))
        OR (pt.category::text ILIKE '%service%' AND tc.name ILIKE ANY(ARRAY['%utilities%', '%services%']))
        OR (pt.category::text ILIKE '%health%' AND tc.name ILIKE ANY(ARRAY['%health%', '%medical%']))
      )
    ) THEN 'low'
    ELSE match_confidence
  END
WHERE category_id IS NULL
AND user_modified = false
AND category IS NOT NULL;
