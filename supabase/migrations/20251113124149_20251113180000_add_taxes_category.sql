/*
  # Add Taxes Transaction Category

  1. Purpose
    - Add "Taxes" as a new default expense category
    - Apply to all existing households

  2. Changes
    - Insert Taxes category for each household
    - Set as default category with 🏛️ icon
*/

-- Insert Taxes category for all households
INSERT INTO transaction_categories (household_id, name, type, icon, color, is_default)
SELECT 
  id as household_id,
  'Taxes' as name,
  'expense' as type,
  '🏛️' as icon,
  '#8b5cf6' as color,
  true as is_default
FROM households
WHERE NOT EXISTS (
  SELECT 1 
  FROM transaction_categories tc 
  WHERE tc.household_id = households.id 
  AND tc.name = 'Taxes'
);