/*
  # Make Budget Category Name Nullable

  1. Problem
    - budget_categories.name is NOT NULL but no longer used
    - Code now uses transaction_category_id to reference transaction_categories
    - Insert fails because name is required but not provided

  2. Solution
    - Make name column nullable
    - This allows new budget categories to be created using only transaction_category_id
    - Existing data remains intact
    - View (budget_categories_with_details) already handles the name display

  3. Future Consideration
    - Can drop name, icon, color columns entirely once verified safe
*/

-- Make name column nullable since it's no longer the primary way to identify budget categories
ALTER TABLE budget_categories 
ALTER COLUMN name DROP NOT NULL;

-- Also make icon and color nullable if they aren't already
ALTER TABLE budget_categories 
ALTER COLUMN icon DROP NOT NULL;

ALTER TABLE budget_categories 
ALTER COLUMN color DROP NOT NULL;