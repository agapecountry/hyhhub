/*
  # Consolidate Budget Categories with Transaction Categories

  1. Changes
    - Add `transaction_category_id` foreign key to budget_categories
    - Remove redundant `name`, `icon`, `color` columns from budget_categories
    - Budget categories now reference transaction_categories for display info
    - Migrate existing budget_categories to link with matching transaction_categories

  2. Migration Strategy
    - For each existing budget category, find or create matching transaction category
    - Link budget categories to transaction categories
    - Remove redundant columns after data migration

  3. Benefits
    - Single source of truth for category names, icons, and colors
    - Easier to maintain and update category lists
    - Users can budget any transaction category
    - Prevents duplicate category definitions
*/

-- Step 1: Add transaction_category_id column (nullable for migration)
ALTER TABLE budget_categories
ADD COLUMN IF NOT EXISTS transaction_category_id uuid REFERENCES transaction_categories(id) ON DELETE SET NULL;

-- Step 2: Migrate existing budget categories to link with transaction categories
DO $$
DECLARE
  budget_cat RECORD;
  matching_trans_cat_id uuid;
  household_id_var uuid;
BEGIN
  FOR budget_cat IN
    SELECT bc.id, bc.household_id, bc.name, bc.icon, bc.color
    FROM budget_categories bc
    WHERE bc.transaction_category_id IS NULL
  LOOP
    household_id_var := budget_cat.household_id;

    -- Try to find exact name match in transaction_categories for this household
    SELECT tc.id INTO matching_trans_cat_id
    FROM transaction_categories tc
    WHERE tc.household_id = household_id_var
    AND LOWER(TRIM(tc.name)) = LOWER(TRIM(budget_cat.name))
    LIMIT 1;

    -- If no exact match, try to find close matches
    IF matching_trans_cat_id IS NULL THEN
      -- Map common budget category names to transaction category names
      CASE
        WHEN LOWER(budget_cat.name) LIKE '%grocer%' THEN
          SELECT tc.id INTO matching_trans_cat_id
          FROM transaction_categories tc
          WHERE tc.household_id = household_id_var
          AND tc.name = 'Home Essentials'
          LIMIT 1;
        WHEN LOWER(budget_cat.name) LIKE '%gas%' OR LOWER(budget_cat.name) LIKE '%fuel%' THEN
          SELECT tc.id INTO matching_trans_cat_id
          FROM transaction_categories tc
          WHERE tc.household_id = household_id_var
          AND tc.name = 'Transportation'
          LIMIT 1;
        WHEN LOWER(budget_cat.name) LIKE '%fun%' OR LOWER(budget_cat.name) LIKE '%entertainment%' THEN
          SELECT tc.id INTO matching_trans_cat_id
          FROM transaction_categories tc
          WHERE tc.household_id = household_id_var
          AND tc.name = 'Leisure'
          LIMIT 1;
        WHEN LOWER(budget_cat.name) LIKE '%dine%' OR LOWER(budget_cat.name) LIKE '%food%' OR LOWER(budget_cat.name) LIKE '%restaurant%' THEN
          SELECT tc.id INTO matching_trans_cat_id
          FROM transaction_categories tc
          WHERE tc.household_id = household_id_var
          AND tc.name = 'Food & Dining'
          LIMIT 1;
        WHEN LOWER(budget_cat.name) LIKE '%cloth%' OR LOWER(budget_cat.name) LIKE '%apparel%' THEN
          SELECT tc.id INTO matching_trans_cat_id
          FROM transaction_categories tc
          WHERE tc.household_id = household_id_var
          AND tc.name = 'Personal Maintenance'
          LIMIT 1;
        WHEN LOWER(budget_cat.name) LIKE '%house%' OR LOWER(budget_cat.name) LIKE '%home%' THEN
          SELECT tc.id INTO matching_trans_cat_id
          FROM transaction_categories tc
          WHERE tc.household_id = household_id_var
          AND tc.name = 'Housing'
          LIMIT 1;
        ELSE
          -- If no match found, create a new transaction category
          INSERT INTO transaction_categories (household_id, name, type, icon, color, is_default)
          VALUES (
            household_id_var,
            budget_cat.name,
            'expense',
            COALESCE(budget_cat.icon, '📌'),
            COALESCE(budget_cat.color, '#64748b'),
            false
          )
          ON CONFLICT (household_id, name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id INTO matching_trans_cat_id;
      END CASE;
    END IF;

    -- Update budget category with the linked transaction category
    IF matching_trans_cat_id IS NOT NULL THEN
      UPDATE budget_categories
      SET transaction_category_id = matching_trans_cat_id
      WHERE id = budget_cat.id;
    END IF;
  END LOOP;
END $$;

-- Step 3: Make transaction_category_id required for future entries
-- (Keep nullable for now to avoid breaking existing data that couldn't be matched)
-- ALTER TABLE budget_categories ALTER COLUMN transaction_category_id SET NOT NULL;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_budget_categories_transaction_category_id
  ON budget_categories(transaction_category_id);

-- Step 5: Drop redundant columns (keep for backward compatibility for now)
-- We'll keep name, icon, color as fallbacks until we verify all frontend code is updated
-- ALTER TABLE budget_categories DROP COLUMN IF EXISTS name;
-- ALTER TABLE budget_categories DROP COLUMN IF EXISTS icon;
-- ALTER TABLE budget_categories DROP COLUMN IF EXISTS color;

-- Step 6: Add a view for easy querying of budget categories with their transaction category info
CREATE OR REPLACE VIEW budget_categories_with_details AS
SELECT
  bc.id,
  bc.household_id,
  bc.transaction_category_id,
  COALESCE(tc.name, bc.name) as name,
  COALESCE(tc.icon, bc.icon) as icon,
  COALESCE(tc.color, bc.color) as color,
  tc.type as category_type,
  bc.monthly_amount,
  bc.due_date,
  bc.is_active,
  bc.created_at,
  bc.created_by
FROM budget_categories bc
LEFT JOIN transaction_categories tc ON bc.transaction_category_id = tc.id;

-- Step 7: Grant access to the view
GRANT SELECT ON budget_categories_with_details TO authenticated;
