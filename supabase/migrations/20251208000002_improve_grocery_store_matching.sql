/*
  # Improve Grocery Store Category Matching
  
  This migration improves the category matching for grocery stores.
  Many grocery stores come through Plaid as "Food and Drink" but should
  be categorized as "Groceries" instead of "Food/Dining".
  
  We match based on:
  1. Merchant name patterns (Food Lion, Kroger, Walmart, etc.)
  2. Plaid's detailed category "Supermarkets and Groceries"
*/

-- First, update existing transactions that are from grocery stores
-- but incorrectly categorized as Food/Dining
UPDATE plaid_transactions pt
SET 
  category_id = (
    SELECT tc.id
    FROM transaction_categories tc
    WHERE tc.household_id = pt.household_id
    AND tc.name ILIKE '%grocer%'
    LIMIT 1
  ),
  auto_matched = true,
  match_confidence = 'high'
WHERE user_modified = false
AND (
  -- Match by merchant name - common grocery stores
  LOWER(COALESCE(merchant_name, name)) LIKE '%food lion%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%kroger%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%walmart%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%wal-mart%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%sam''s club%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%sams club%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%costco%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%target%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%aldi%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%lidl%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%publix%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%safeway%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%albertsons%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%whole foods%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%trader joe%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%wegmans%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%h-e-b%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%heb %'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%meijer%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%winco%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%piggly wiggly%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%harris teeter%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%giant%food%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%giant eagle%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%stop & shop%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%stop and shop%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%shoprite%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%winn-dixie%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%winn dixie%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%bi-lo%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%bilo%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%ingles%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%sprouts%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%fresh market%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%grocery%'
  OR LOWER(COALESCE(merchant_name, name)) LIKE '%supermarket%'
  -- Match by Plaid category
  OR category::text ILIKE '%Supermarkets%'
  OR category::text ILIKE '%Groceries%'
  OR (personal_finance_category::text ILIKE '%GROCERIES%')
)
-- Only update if there's a groceries category available
AND EXISTS (
  SELECT 1 FROM transaction_categories tc 
  WHERE tc.household_id = pt.household_id 
  AND tc.name ILIKE '%grocer%'
);

-- Update existing transfer transactions
UPDATE plaid_transactions pt
SET 
  category_id = (
    SELECT tc.id
    FROM transaction_categories tc
    WHERE tc.household_id = pt.household_id
    AND (tc.name ILIKE '%transfer%' OR tc.name ILIKE '%p2p%')
    LIMIT 1
  ),
  auto_matched = true,
  match_confidence = 'high'
WHERE user_modified = false
AND (
  LOWER(COALESCE(name, '')) LIKE '%transfer%'
  OR LOWER(COALESCE(name, '')) LIKE '%p2p%'
  OR LOWER(COALESCE(name, '')) LIKE '%zelle%'
  OR LOWER(COALESCE(name, '')) LIKE '%venmo%'
  OR LOWER(COALESCE(name, '')) LIKE '%cash app%'
  OR LOWER(COALESCE(name, '')) LIKE '%cashapp%'
  OR LOWER(COALESCE(name, '')) LIKE '%paypal%'
  OR LOWER(COALESCE(merchant_name, '')) LIKE '%zelle%'
  OR LOWER(COALESCE(merchant_name, '')) LIKE '%venmo%'
  OR LOWER(COALESCE(merchant_name, '')) LIKE '%cash app%'
  OR LOWER(COALESCE(merchant_name, '')) LIKE '%paypal%'
  OR category::text ILIKE '%Transfer%'
  OR (personal_finance_category::text ILIKE '%TRANSFER%')
)
AND EXISTS (
  SELECT 1 FROM transaction_categories tc 
  WHERE tc.household_id = pt.household_id 
  AND (tc.name ILIKE '%transfer%' OR tc.name ILIKE '%p2p%')
);

-- Create or replace a function to categorize transactions on insert/update
CREATE OR REPLACE FUNCTION categorize_plaid_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id uuid;
  v_merchant text;
  v_name text;
BEGIN
  -- Skip if user has manually modified
  IF NEW.user_modified = true THEN
    RETURN NEW;
  END IF;
  
  -- Get merchant name and transaction name
  v_merchant := LOWER(COALESCE(NEW.merchant_name, NEW.name, ''));
  v_name := LOWER(COALESCE(NEW.name, ''));
  
  -- Check for transfers first (highest priority)
  IF v_name LIKE '%transfer%'
    OR v_name LIKE '%p2p%'
    OR v_name LIKE '%zelle%'
    OR v_name LIKE '%venmo%'
    OR v_name LIKE '%cash app%'
    OR v_name LIKE '%cashapp%'
    OR v_name LIKE '%paypal%'
    OR v_merchant LIKE '%zelle%'
    OR v_merchant LIKE '%venmo%'
    OR v_merchant LIKE '%cash app%'
    OR v_merchant LIKE '%paypal%'
    OR NEW.category::text ILIKE '%Transfer%'
    OR (NEW.personal_finance_category::text ILIKE '%TRANSFER%')
  THEN
    SELECT id INTO v_category_id
    FROM transaction_categories
    WHERE household_id = NEW.household_id
    AND (name ILIKE '%transfer%' OR name ILIKE '%p2p%')
    LIMIT 1;
    
    IF v_category_id IS NOT NULL THEN
      NEW.category_id := v_category_id;
      NEW.auto_matched := true;
      NEW.match_confidence := 'high';
      RETURN NEW;
    END IF;
  END IF;
  
  -- Check for grocery stores (high priority)
  IF v_merchant LIKE '%food lion%'
    OR v_merchant LIKE '%kroger%'
    OR v_merchant LIKE '%walmart%'
    OR v_merchant LIKE '%wal-mart%'
    OR v_merchant LIKE '%sam''s club%'
    OR v_merchant LIKE '%sams club%'
    OR v_merchant LIKE '%costco%'
    OR v_merchant LIKE '%target%'
    OR v_merchant LIKE '%aldi%'
    OR v_merchant LIKE '%lidl%'
    OR v_merchant LIKE '%publix%'
    OR v_merchant LIKE '%safeway%'
    OR v_merchant LIKE '%albertsons%'
    OR v_merchant LIKE '%whole foods%'
    OR v_merchant LIKE '%trader joe%'
    OR v_merchant LIKE '%wegmans%'
    OR v_merchant LIKE '%h-e-b%'
    OR v_merchant LIKE '%meijer%'
    OR v_merchant LIKE '%winco%'
    OR v_merchant LIKE '%piggly wiggly%'
    OR v_merchant LIKE '%harris teeter%'
    OR v_merchant LIKE '%giant eagle%'
    OR v_merchant LIKE '%stop & shop%'
    OR v_merchant LIKE '%shoprite%'
    OR v_merchant LIKE '%winn-dixie%'
    OR v_merchant LIKE '%ingles%'
    OR v_merchant LIKE '%sprouts%'
    OR v_merchant LIKE '%fresh market%'
    OR v_merchant LIKE '%grocery%'
    OR v_merchant LIKE '%supermarket%'
    OR NEW.category::text ILIKE '%Supermarkets%'
    OR NEW.category::text ILIKE '%Groceries%'
    OR (NEW.personal_finance_category::text ILIKE '%GROCERIES%')
  THEN
    SELECT id INTO v_category_id
    FROM transaction_categories
    WHERE household_id = NEW.household_id
    AND name ILIKE '%grocer%'
    LIMIT 1;
    
    IF v_category_id IS NOT NULL THEN
      NEW.category_id := v_category_id;
      NEW.auto_matched := true;
      NEW.match_confidence := 'high';
      RETURN NEW;
    END IF;
  END IF;
  
  -- If no match, let the existing category mapping handle it
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS categorize_plaid_transaction_trigger ON plaid_transactions;
CREATE TRIGGER categorize_plaid_transaction_trigger
  BEFORE INSERT OR UPDATE ON plaid_transactions
  FOR EACH ROW
  EXECUTE FUNCTION categorize_plaid_transaction();

COMMENT ON FUNCTION categorize_plaid_transaction IS 
  'Automatically categorizes Plaid transactions, with special handling for grocery stores';
