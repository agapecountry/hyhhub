-- Run this to check if the view still has SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  definition,
  viewowner
FROM pg_views
WHERE viewname = 'budget_categories_with_details';

-- Also check the actual view options
SELECT 
  c.relname as view_name,
  c.reloptions as options
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'budget_categories_with_details'
  AND n.nspname = 'public'
  AND c.relkind = 'v';
