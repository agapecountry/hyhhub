/*
  # Fix Missing Foreign Key Indexes

  ## Overview
  Adds indexes to all foreign key columns to improve query performance.
  Foreign keys without indexes can cause significant performance degradation.

  ## Changes
  - Add indexes for all unindexed foreign key columns across all tables
  - This improves JOIN performance and foreign key constraint checking

  ## Tables Affected
  - account_view_permissions
  - accounts
  - budgets
  - categories
  - chore_assignments
  - chores
  - event_participants
  - events
  - grocery_list
  - household_invites
  - ingredients
  - inventory_log
  - loan_payments
  - loans
  - meals
  - notifications
  - pantry_items
  - payoff_scenarios
  - recipes
  - redemptions
  - rewards
  - transactions
  - user_settings
*/

-- account_view_permissions indexes
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_granted_by ON account_view_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_household_id ON account_view_permissions(household_id);

-- accounts indexes
CREATE INDEX IF NOT EXISTS idx_accounts_household_id ON accounts(household_id);

-- budgets indexes
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_household_id ON budgets(household_id);

-- categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_household_id ON categories(household_id);

-- chore_assignments indexes
CREATE INDEX IF NOT EXISTS idx_chore_assignments_chore_id ON chore_assignments(chore_id);

-- chores indexes
CREATE INDEX IF NOT EXISTS idx_chores_household_id ON chores(household_id);

-- event_participants indexes
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);

-- events indexes
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- grocery_list indexes
CREATE INDEX IF NOT EXISTS idx_grocery_list_household_id ON grocery_list(household_id);

-- household_invites indexes
CREATE INDEX IF NOT EXISTS idx_household_invites_created_by ON household_invites(created_by);
CREATE INDEX IF NOT EXISTS idx_household_invites_used_by ON household_invites(used_by);

-- ingredients indexes
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);

-- inventory_log indexes
CREATE INDEX IF NOT EXISTS idx_inventory_log_household_id ON inventory_log(household_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_pantry_item_id ON inventory_log(pantry_item_id);

-- loan_payments indexes
CREATE INDEX IF NOT EXISTS idx_loan_payments_household_id ON loan_payments(household_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);

-- loans indexes
CREATE INDEX IF NOT EXISTS idx_loans_household_id ON loans(household_id);

-- meals indexes
CREATE INDEX IF NOT EXISTS idx_meals_household_id ON meals(household_id);
CREATE INDEX IF NOT EXISTS idx_meals_recipe_id ON meals(recipe_id);

-- notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_household_id ON notifications(household_id);

-- pantry_items indexes
CREATE INDEX IF NOT EXISTS idx_pantry_items_household_id ON pantry_items(household_id);

-- payoff_scenarios indexes
CREATE INDEX IF NOT EXISTS idx_payoff_scenarios_household_id ON payoff_scenarios(household_id);

-- recipes indexes
CREATE INDEX IF NOT EXISTS idx_recipes_household_id ON recipes(household_id);

-- redemptions indexes
CREATE INDEX IF NOT EXISTS idx_redemptions_household_id ON redemptions(household_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_reward_id ON redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON redemptions(user_id);

-- rewards indexes
CREATE INDEX IF NOT EXISTS idx_rewards_household_id ON rewards(household_id);

-- transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- user_settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_default_household_id ON user_settings(default_household_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);