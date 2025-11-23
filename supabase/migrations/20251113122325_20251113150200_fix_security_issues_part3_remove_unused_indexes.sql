/*
  # Fix Security Issues - Part 3: Remove Unused Indexes

  1. Problem
    - Many indexes exist but are never used by queries
    - Unused indexes waste storage space
    - Slow down INSERT, UPDATE, DELETE operations
    - Create maintenance overhead

  2. Solution
    - Remove all unused indexes
    - Keep only indexes that improve query performance
    - Foreign key indexes were already added in Part 1

  3. Indexes Removed
    - 52+ unused indexes across multiple tables
    - Primarily covering foreign keys that aren't queried
    - Or covering columns that aren't in WHERE/JOIN clauses
*/

-- Remove unused indexes from bills
DROP INDEX IF EXISTS idx_bills_category_id;
DROP INDEX IF EXISTS idx_bills_due_date;
DROP INDEX IF EXISTS idx_bills_is_active;

-- Remove unused indexes from payees
DROP INDEX IF EXISTS idx_payees_debt_id;
DROP INDEX IF EXISTS idx_payees_bill_id;
DROP INDEX IF EXISTS idx_payees_default_category_id;

-- Remove unused indexes from paycheck_settings
DROP INDEX IF EXISTS idx_paycheck_settings_household_active;

-- Remove unused indexes from account_view_permissions
DROP INDEX IF EXISTS idx_account_view_permissions_household_id;

-- Remove unused indexes from budgets
DROP INDEX IF EXISTS idx_budgets_category_id;

-- Remove unused indexes from budget_categories
DROP INDEX IF EXISTS idx_budget_categories_active;

-- Remove unused indexes from calendar_events
DROP INDEX IF EXISTS idx_calendar_events_color_category_id;
DROP INDEX IF EXISTS idx_calendar_events_created_by;

-- Remove unused indexes from chore_assignments
DROP INDEX IF EXISTS idx_chore_assignments_chore_id;
DROP INDEX IF EXISTS idx_chore_assignments_claimed_by;

-- Remove unused indexes from debt_payments
DROP INDEX IF EXISTS idx_debt_payments_debt_id;

-- Remove unused indexes from event_participants
DROP INDEX IF EXISTS idx_event_participants_user_id;

-- Remove unused indexes from events
DROP INDEX IF EXISTS idx_events_created_by;

-- Remove unused indexes from family_challenges
DROP INDEX IF EXISTS idx_family_challenges_household_id;

-- Remove unused indexes from grocery_list_items
DROP INDEX IF EXISTS idx_grocery_list_items_recipe_id;

-- Remove unused indexes from household_invites
DROP INDEX IF EXISTS idx_household_invites_created_by;
DROP INDEX IF EXISTS idx_household_invites_used_by;

-- Remove unused indexes from household_subscriptions
DROP INDEX IF EXISTS idx_household_subscriptions_tier_id;

-- Remove unused indexes from influencer_payouts
DROP INDEX IF EXISTS idx_influencer_payouts_household_subscription_id;
DROP INDEX IF EXISTS idx_influencer_payouts_influencer_code_id;
DROP INDEX IF EXISTS idx_influencer_payouts_signup_id;

-- Remove unused indexes from influencer_signups
DROP INDEX IF EXISTS idx_influencer_signups_user_id;

-- Remove unused indexes from ingredients
DROP INDEX IF EXISTS idx_ingredients_recipe_id;

-- Remove unused indexes from inventory_log
DROP INDEX IF EXISTS idx_inventory_log_household_id;
DROP INDEX IF EXISTS idx_inventory_log_pantry_item_id;

-- Remove unused indexes from loan_payments
DROP INDEX IF EXISTS idx_loan_payments_household_id;
DROP INDEX IF EXISTS idx_loan_payments_loan_id;

-- Remove unused indexes from meal_plans
DROP INDEX IF EXISTS idx_meal_plans_recipe_id;

-- Remove unused indexes from meals
DROP INDEX IF EXISTS idx_meals_recipe_id;

-- Remove unused indexes from member_badges
DROP INDEX IF EXISTS idx_member_badges_badge_id;

-- Remove unused indexes from notifications
DROP INDEX IF EXISTS idx_notifications_event_id;
DROP INDEX IF EXISTS idx_notifications_household_id;
DROP INDEX IF EXISTS idx_notifications_user_id;

-- Remove unused indexes from payoff_scenarios
DROP INDEX IF EXISTS idx_payoff_scenarios_household_id;

-- Remove unused indexes from plaid_accounts
DROP INDEX IF EXISTS idx_plaid_accounts_plaid_item_id;

-- Remove unused indexes from plaid_transactions
DROP INDEX IF EXISTS idx_plaid_transactions_household_id;
DROP INDEX IF EXISTS idx_plaid_transactions_plaid_account_id;

-- Remove unused indexes from recurring_transactions
DROP INDEX IF EXISTS idx_recurring_transactions_category_id;

-- Remove unused indexes from redemptions
DROP INDEX IF EXISTS idx_redemptions_reward_id;
DROP INDEX IF EXISTS idx_redemptions_user_id;

-- Remove unused indexes from reward_redemptions
DROP INDEX IF EXISTS idx_reward_redemptions_member_id;
DROP INDEX IF EXISTS idx_reward_redemptions_reward_id;

-- Remove unused indexes from savings_projects
DROP INDEX IF EXISTS idx_savings_projects_created_by;
DROP INDEX IF EXISTS idx_savings_projects_primary_account_id;

-- Remove unused indexes from security_audit_logs
DROP INDEX IF EXISTS idx_security_audit_logs_household_id;

-- Remove unused indexes from transactions
DROP INDEX IF EXISTS idx_transactions_category_id;

-- Remove unused indexes from user_settings
DROP INDEX IF EXISTS idx_user_settings_default_household_id;
DROP INDEX IF EXISTS idx_user_settings_user_id;