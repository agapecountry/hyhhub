/*
  # Remove Duplicate Transaction Categories

  1. Problem
    - Multiple similar categories exist with slightly different names:
      - "Insurance" vs "Insurances"
      - "Pet Care" vs "Pets"
      - "Subscriptions" vs "Service Subscriptions"
      - "Dining Out" vs "Food & Dining"
      - "Rent/Mortgage" vs "Housing"

  2. Solution
    - Keep the streamlined category names (newer, more comprehensive)
    - Migrate any bills/transactions using old categories to new ones
    - Remove the old duplicate categories

  3. Migration Strategy
    - For each household, find matching old/new category pairs
    - Update bills and transactions to use the new category
    - Update budget_categories if they reference old categories
    - Delete the old duplicate categories

  4. Mappings
    - "Insurance" → "Insurances"
    - "Pet Care" → "Pets"
    - "Subscriptions" → "Service Subscriptions"
    - "Dining Out" → "Food & Dining"
    - "Rent/Mortgage" → "Housing"
*/

-- Step 1: Create a temporary mapping table
CREATE TEMP TABLE category_mappings AS
SELECT
  old_cat.id as old_id,
  new_cat.id as new_id,
  old_cat.household_id,
  old_cat.name as old_name,
  new_cat.name as new_name
FROM transaction_categories old_cat
JOIN transaction_categories new_cat ON old_cat.household_id = new_cat.household_id
WHERE
  (old_cat.name = 'Insurance' AND new_cat.name = 'Insurances') OR
  (old_cat.name = 'Pet Care' AND new_cat.name = 'Pets') OR
  (old_cat.name = 'Subscriptions' AND new_cat.name = 'Service Subscriptions') OR
  (old_cat.name = 'Dining Out' AND new_cat.name = 'Food & Dining') OR
  (old_cat.name = 'Rent/Mortgage' AND new_cat.name = 'Housing');

-- Step 2: Update bills table to use new categories
UPDATE bills
SET category_id = cm.new_id
FROM category_mappings cm
WHERE bills.category_id = cm.old_id;

-- Step 3: Update transactions table to use new categories
UPDATE transactions
SET category_id = cm.new_id
FROM category_mappings cm
WHERE transactions.category_id = cm.old_id;

-- Step 4: Update recurring_transactions table to use new categories
UPDATE recurring_transactions
SET category_id = cm.new_id
FROM category_mappings cm
WHERE recurring_transactions.category_id = cm.old_id;

-- Step 5: Update budget_categories that reference old transaction categories
UPDATE budget_categories
SET transaction_category_id = cm.new_id
FROM category_mappings cm
WHERE budget_categories.transaction_category_id = cm.old_id;

-- Step 6: Delete the old duplicate categories
DELETE FROM transaction_categories
WHERE id IN (SELECT old_id FROM category_mappings);

-- Step 7: Also clean up any exact duplicates that may exist
-- (In case both old and new were created in some households)
DO $$
DECLARE
  household_record RECORD;
  category_record RECORD;
  keeper_id uuid;
  duplicate_id uuid;
BEGIN
  -- For each household
  FOR household_record IN SELECT DISTINCT id FROM households
  LOOP
    -- Check for duplicates of each target category name
    FOR category_record IN
      SELECT name, COUNT(*) as cnt
      FROM transaction_categories
      WHERE household_id = household_record.id
      AND name IN ('Insurances', 'Pets', 'Service Subscriptions', 'Food & Dining', 'Housing')
      GROUP BY name
      HAVING COUNT(*) > 1
    LOOP
      -- Keep the is_default=true version, or the first one if none are default
      SELECT id INTO keeper_id
      FROM transaction_categories
      WHERE household_id = household_record.id
      AND name = category_record.name
      ORDER BY is_default DESC NULLS LAST, created_at ASC
      LIMIT 1;

      -- Get all duplicates except the keeper
      FOR duplicate_id IN
        SELECT id
        FROM transaction_categories
        WHERE household_id = household_record.id
        AND name = category_record.name
        AND id != keeper_id
      LOOP
        -- Update references to point to keeper
        UPDATE bills SET category_id = keeper_id WHERE category_id = duplicate_id;
        UPDATE transactions SET category_id = keeper_id WHERE category_id = duplicate_id;
        UPDATE recurring_transactions SET category_id = keeper_id WHERE category_id = duplicate_id;
        UPDATE budget_categories SET transaction_category_id = keeper_id WHERE transaction_category_id = duplicate_id;

        -- Delete the duplicate
        DELETE FROM transaction_categories WHERE id = duplicate_id;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Step 8: Log what was cleaned up
DO $$
BEGIN
  RAISE NOTICE 'Duplicate transaction categories have been consolidated';
  RAISE NOTICE 'Old categories migrated: Insurance→Insurances, Pet Care→Pets, Subscriptions→Service Subscriptions, Dining Out→Food & Dining, Rent/Mortgage→Housing';
END $$;
