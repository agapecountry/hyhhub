/*
  # Add Missing Foreign Key Indexes

  1. Purpose
    - Add indexes for all foreign keys that don't have covering indexes
    - Improves query performance for JOIN operations
    - Prevents table scans when querying by foreign key

  2. Changes
    - Creates indexes on all unindexed foreign key columns
    - Uses consistent naming pattern: idx_{table}_{column}
*/

-- account_view_permissions
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_granted_by ON public.account_view_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_household_id ON public.account_view_permissions(household_id);

-- budgets
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON public.budgets(category_id);

-- calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_color_category_id ON public.calendar_events(color_category_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public.calendar_events(created_by);

-- chore_assignments
CREATE INDEX IF NOT EXISTS idx_chore_assignments_chore_id ON public.chore_assignments(chore_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_claimed_by ON public.chore_assignments(claimed_by);

-- debt_payments
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON public.debt_payments(debt_id);

-- event_participants
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON public.event_participants(user_id);

-- events (old table if exists)
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);

-- family_challenges
CREATE INDEX IF NOT EXISTS idx_family_challenges_household_id ON public.family_challenges(household_id);

-- grocery_list_items
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_recipe_id ON public.grocery_list_items(recipe_id);

-- household_invites
CREATE INDEX IF NOT EXISTS idx_household_invites_created_by ON public.household_invites(created_by);
CREATE INDEX IF NOT EXISTS idx_household_invites_used_by ON public.household_invites(used_by);

-- household_subscriptions
CREATE INDEX IF NOT EXISTS idx_household_subscriptions_tier_id ON public.household_subscriptions(tier_id);

-- influencer_payouts
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_household_subscription_id ON public.influencer_payouts(household_subscription_id);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_influencer_code_id ON public.influencer_payouts(influencer_code_id);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_influencer_user_id ON public.influencer_payouts(influencer_user_id);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_signup_id ON public.influencer_payouts(signup_id);

-- influencer_signups
CREATE INDEX IF NOT EXISTS idx_influencer_signups_user_id ON public.influencer_signups(user_id);

-- ingredients
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON public.ingredients(recipe_id);

-- inventory_log
CREATE INDEX IF NOT EXISTS idx_inventory_log_household_id ON public.inventory_log(household_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_pantry_item_id ON public.inventory_log(pantry_item_id);

-- loan_payments
CREATE INDEX IF NOT EXISTS idx_loan_payments_household_id ON public.loan_payments(household_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);

-- meal_plans
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe_id ON public.meal_plans(recipe_id);

-- meals
CREATE INDEX IF NOT EXISTS idx_meals_recipe_id ON public.meals(recipe_id);

-- member_badges
CREATE INDEX IF NOT EXISTS idx_member_badges_badge_id ON public.member_badges(badge_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON public.notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_household_id ON public.notifications(household_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- payees
CREATE INDEX IF NOT EXISTS idx_payees_default_category_id ON public.payees(default_category_id);

-- payoff_scenarios
CREATE INDEX IF NOT EXISTS idx_payoff_scenarios_household_id ON public.payoff_scenarios(household_id);

-- plaid_accounts
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_plaid_item_id ON public.plaid_accounts(plaid_item_id);

-- plaid_transactions
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_household_id ON public.plaid_transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_plaid_account_id ON public.plaid_transactions(plaid_account_id);

-- project_accounts
CREATE INDEX IF NOT EXISTS idx_project_accounts_account_id ON public.project_accounts(account_id);

-- project_transactions
CREATE INDEX IF NOT EXISTS idx_project_transactions_account_id ON public.project_transactions(account_id);

-- recurring_transactions
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_category_id ON public.recurring_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_debt_id ON public.recurring_transactions(debt_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_payee_id ON public.recurring_transactions(payee_id);

-- redemptions
CREATE INDEX IF NOT EXISTS idx_redemptions_reward_id ON public.redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON public.redemptions(user_id);

-- reward_redemptions
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_member_id ON public.reward_redemptions(member_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON public.reward_redemptions(reward_id);

-- savings_projects
CREATE INDEX IF NOT EXISTS idx_savings_projects_created_by ON public.savings_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_savings_projects_primary_account_id ON public.savings_projects(primary_account_id);

-- security_audit_logs
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_household_id ON public.security_audit_logs(household_id);

-- transactions
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);

-- user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_default_household_id ON public.user_settings(default_household_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
