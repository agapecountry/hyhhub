/*
  # Remove Unused Indexes

  1. Purpose
    - Remove indexes that haven't been used
    - Reduces storage overhead
    - Improves INSERT/UPDATE performance

  2. Changes
    - Drops unused indexes identified by Supabase analysis
    - Keeps only actively used indexes
*/

-- user_dashboard_preferences unused indexes
DROP INDEX IF EXISTS public.idx_user_dashboard_preferences_user;
DROP INDEX IF EXISTS public.idx_user_dashboard_preferences_household;
DROP INDEX IF EXISTS public.idx_user_dashboard_preferences_widget;

-- transactions unused indexes
DROP INDEX IF EXISTS public.idx_transactions_plaid_id;
DROP INDEX IF EXISTS public.idx_transactions_debt_id;
DROP INDEX IF EXISTS public.idx_transactions_payee_id;
DROP INDEX IF EXISTS public.idx_transactions_recurring_id;

-- transaction_categories unused indexes
DROP INDEX IF EXISTS public.idx_transaction_categories_household_id;

-- payees unused indexes
DROP INDEX IF EXISTS public.idx_payees_household_id;

-- recurring_transactions unused indexes
DROP INDEX IF EXISTS public.idx_recurring_transactions_household_id;
DROP INDEX IF EXISTS public.idx_recurring_transactions_next_due_date;

-- pantry_items unused indexes
DROP INDEX IF EXISTS public.idx_pantry_items_location_id;

-- access_reviews unused indexes
DROP INDEX IF EXISTS public.idx_access_reviews_reviewer_id;

-- influencer_codes unused indexes
DROP INDEX IF EXISTS public.idx_influencer_codes_tier_id;

-- influencer_signups unused indexes
DROP INDEX IF EXISTS public.idx_influencer_signups_subscription_tier_id;

-- project_transactions unused indexes
DROP INDEX IF EXISTS public.idx_project_transactions_created_by;

-- security_alerts unused indexes
DROP INDEX IF EXISTS public.idx_security_alerts_acknowledged_by;
DROP INDEX IF EXISTS public.idx_security_alerts_household_id;
DROP INDEX IF EXISTS public.idx_security_alerts_user_id;

-- security_incidents unused indexes
DROP INDEX IF EXISTS public.idx_security_incidents_assigned_to;
DROP INDEX IF EXISTS public.idx_security_incidents_detected_by;

-- security_risks unused indexes
DROP INDEX IF EXISTS public.idx_security_risks_owner;
