/*
  # Remove Redundant Indexes

  ## Strategy
  Remove indexes that are redundant with foreign key constraints or provide minimal benefit.
  Keep indexes that are critical for:
  - Date range queries (start_time, date fields)
  - Frequently filtered fields (household_id on main tables already has FK index)
  - Unique lookups (invite codes)
  - Role-based queries

  ## Indexes Being Removed
  These are either redundant with FK indexes or unlikely to be queried independently:
  - Many household_id indexes (FK already indexed)
  - Some foreign key indexes that are rarely queried independently
  - Single-column indexes on low-selectivity fields

  ## Indexes Being Kept
  - Date/time indexes for range queries
  - Unique lookup indexes (invite codes)
  - Composite indexes for complex queries
  - Role-based filtering indexes
*/

-- Remove redundant household_id indexes (FK already indexed)
DROP INDEX IF EXISTS idx_notifications_household_id;
DROP INDEX IF EXISTS idx_payoff_scenarios_household_id;
DROP INDEX IF EXISTS idx_budgets_household_id;
DROP INDEX IF EXISTS idx_categories_household_id;
DROP INDEX IF EXISTS idx_grocery_list_household_id;
DROP INDEX IF EXISTS idx_inventory_log_household_id;
DROP INDEX IF EXISTS idx_loan_payments_household_id;
DROP INDEX IF EXISTS idx_meals_household_id;
DROP INDEX IF EXISTS idx_redemptions_household_id;
DROP INDEX IF EXISTS idx_rewards_household_id;
DROP INDEX IF EXISTS idx_streaks_household;
DROP INDEX IF EXISTS idx_challenges_household;
DROP INDEX IF EXISTS idx_plaid_items_household;
DROP INDEX IF EXISTS idx_plaid_transactions_household;

-- Remove redundant foreign key indexes that duplicate FK
DROP INDEX IF EXISTS idx_account_view_permissions_account;
DROP INDEX IF EXISTS idx_account_view_permissions_granted_by;
DROP INDEX IF EXISTS idx_account_view_permissions_household_id;
DROP INDEX IF EXISTS idx_budgets_category_id;
DROP INDEX IF EXISTS idx_chore_assignments_chore_id;
DROP INDEX IF EXISTS idx_event_participants_user_id;
DROP INDEX IF EXISTS idx_household_invites_created_by;
DROP INDEX IF EXISTS idx_household_invites_used_by;
DROP INDEX IF EXISTS idx_ingredients_recipe_id;
DROP INDEX IF EXISTS idx_inventory_log_pantry_item_id;
DROP INDEX IF EXISTS idx_loan_payments_loan_id;
DROP INDEX IF EXISTS idx_meals_recipe_id;
DROP INDEX IF EXISTS idx_notifications_event_id;
DROP INDEX IF EXISTS idx_redemptions_reward_id;
DROP INDEX IF EXISTS idx_redemptions_user_id;
DROP INDEX IF EXISTS idx_transactions_account_id;
DROP INDEX IF EXISTS idx_transactions_category_id;
DROP INDEX IF EXISTS idx_user_settings_default_household_id;
DROP INDEX IF EXISTS idx_user_settings_user_id;
DROP INDEX IF EXISTS idx_calendar_events_color_category_id;
DROP INDEX IF EXISTS idx_calendar_events_created_by;
DROP INDEX IF EXISTS idx_debt_payments_debt;
DROP INDEX IF EXISTS idx_recipes_created_by;
DROP INDEX IF EXISTS idx_meal_plans_recipe_id;
DROP INDEX IF EXISTS idx_grocery_list_items_recipe_id;
DROP INDEX IF EXISTS idx_member_badges_badge;
DROP INDEX IF EXISTS idx_redemptions_member;
DROP INDEX IF EXISTS idx_streaks_member;
DROP INDEX IF EXISTS idx_plaid_connections_item;
DROP INDEX IF EXISTS idx_member_badges_household;
DROP INDEX IF EXISTS idx_member_badges_member;
DROP INDEX IF EXISTS idx_plaid_accounts_item;
DROP INDEX IF EXISTS idx_plaid_transactions_account;

-- Remove low-value indexes
DROP INDEX IF EXISTS idx_events_created_by;
DROP INDEX IF EXISTS idx_member_relationships_household;
DROP INDEX IF EXISTS idx_household_members_role;
DROP INDEX IF EXISTS idx_household_subscriptions_tier;

-- KEEP these important indexes for performance:
-- idx_transactions_household_id - For household transaction queries
-- idx_transactions_date - For date range queries
-- idx_events_start_time - For calendar queries
-- idx_calendar_events_start_time - For calendar queries
-- idx_notifications_user_id - For user notification queries
-- idx_notifications_read - For unread notification queries
-- idx_household_invites_code - For invite code lookups
-- idx_debts_active - For active debt queries
-- idx_debt_payments_date - For payment history
-- idx_chore_assignments_open_chores - For open chore queries
-- idx_chore_assignments_claimed_by - For user's claimed chores
-- idx_reward_redemptions_reward_id - For reward redemption queries
-- idx_plaid_transactions_date - For transaction date queries
