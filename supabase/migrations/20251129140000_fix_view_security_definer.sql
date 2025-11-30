/*
  # Fix Security Definer View
  
  1. Purpose
    - Remove SECURITY DEFINER from budget_categories_with_details view
    - Security Definer is unnecessary and potentially risky for this view
    - The view should run with the permissions of the querying user
  
  2. Changes
    - Drop and recreate the view without SECURITY DEFINER
    - Maintains all existing functionality
*/

-- Drop the existing view
DROP VIEW IF EXISTS budget_categories_with_details;

-- Recreate with explicit SECURITY INVOKER (runs with querying user's permissions)
CREATE VIEW budget_categories_with_details 
WITH (security_invoker = true) AS
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

-- Grant access to authenticated users
GRANT SELECT ON budget_categories_with_details TO authenticated;

COMMENT ON VIEW budget_categories_with_details IS 'Budget categories with transaction category details, runs with querying user permissions';
