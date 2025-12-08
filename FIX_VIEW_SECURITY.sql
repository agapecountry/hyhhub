-- More explicit fix - set SECURITY INVOKER

-- Drop the existing view
DROP VIEW IF EXISTS budget_categories_with_details CASCADE;

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

-- Verify the setting
SELECT 
  c.relname as view_name,
  c.reloptions as options,
  CASE 
    WHEN 'security_invoker=true' = ANY(c.reloptions) THEN 'SECURITY INVOKER'
    WHEN 'security_invoker=false' = ANY(c.reloptions) THEN 'SECURITY DEFINER'
    ELSE 'DEFAULT (SECURITY DEFINER)'
  END as security_mode
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'budget_categories_with_details'
  AND n.nspname = 'public'
  AND c.relkind = 'v';
