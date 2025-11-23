/*
  # Restore Indexes and Add Sample Data - Working Version

  Restores all 70+ performance indexes and adds sample data with correct schemas and constraints.

  ## Restored Indexes
  - All transaction, event, notification, and core table indexes
  
  ## Sample Data
  - Demo household with valid data across all major tables
*/

-- Restore all indexes
CREATE INDEX IF NOT EXISTS idx_transactions_household_id ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_household_id ON notifications(household_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_household_invites_code ON household_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_household_invites_created_by ON household_invites(created_by);
CREATE INDEX IF NOT EXISTS idx_household_invites_used_by ON household_invites(used_by);
CREATE INDEX IF NOT EXISTS idx_member_relationships_household ON member_relationships(household_id, parent_member_id);
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_account ON account_view_permissions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_granted_by ON account_view_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_household_id ON account_view_permissions(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_role ON household_members(role);
CREATE INDEX IF NOT EXISTS idx_payoff_scenarios_household_id ON payoff_scenarios(household_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_color_category_id ON calendar_events(color_category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_household_id ON budgets(household_id);
CREATE INDEX IF NOT EXISTS idx_categories_household_id ON categories(household_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_chore_id ON chore_assignments(chore_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_open_chores ON chore_assignments(household_id, completed) WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_chore_assignments_claimed_by ON chore_assignments(claimed_by);
CREATE INDEX IF NOT EXISTS idx_grocery_list_household_id ON grocery_list(household_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_household_id ON inventory_log(household_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_pantry_item_id ON inventory_log(pantry_item_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_household_id ON loan_payments(household_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_meals_household_id ON meals(household_id);
CREATE INDEX IF NOT EXISTS idx_meals_recipe_id ON meals(recipe_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe_id ON meal_plans(recipe_id);
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_recipe_id ON grocery_list_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_household_id ON redemptions(household_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_reward_id ON redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_member ON reward_redemptions(member_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_rewards_household_id ON rewards(household_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_default_household_id ON user_settings(default_household_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_active ON debts(household_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON debt_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by);
CREATE INDEX IF NOT EXISTS idx_member_badges_badge ON member_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_member_badges_household ON member_badges(household_id);
CREATE INDEX IF NOT EXISTS idx_member_badges_member ON member_badges(member_id);
CREATE INDEX IF NOT EXISTS idx_streaks_household ON member_streaks(household_id);
CREATE INDEX IF NOT EXISTS idx_streaks_member ON member_streaks(member_id);
CREATE INDEX IF NOT EXISTS idx_challenges_household ON family_challenges(household_id);
CREATE INDEX IF NOT EXISTS idx_household_subscriptions_tier ON household_subscriptions(tier_id);
CREATE INDEX IF NOT EXISTS idx_plaid_connections_item ON plaid_connections(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_household ON plaid_items(household_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_item ON plaid_accounts(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_account ON plaid_transactions(plaid_account_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_household ON plaid_transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_date ON plaid_transactions(date);

-- Insert sample data
INSERT INTO households (id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Household', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, household_id, name, type, color)
VALUES 
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Groceries', 'expense', '#10b981'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Utilities', 'expense', '#3b82f6'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Salary', 'income', '#22c55e')
ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, household_id, name, type, balance, created_at)
VALUES ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', 'Checking Account', 'checking', 5000.00, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO transactions (household_id, account_id, category_id, amount, description, date, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000001', -125.50, 'Weekly groceries', now() - interval '2 days', now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000002', -89.99, 'Electric bill', now() - interval '5 days', now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000003', 3500.00, 'Monthly salary', now() - interval '1 day', now())
ON CONFLICT DO NOTHING;

INSERT INTO chores (id, household_id, name, description, points, frequency)
VALUES 
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000001', 'Wash Dishes', 'Clean all dishes in the sink', 10, 'daily'),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000001', 'Take Out Trash', 'Empty all trash bins', 5, 'weekly'),
  ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000001', 'Vacuum Living Room', 'Vacuum the entire living room', 15, 'weekly')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rewards (id, household_id, name, description, cost)
VALUES 
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-000000000001', 'Movie Night', 'Choose the movie for family night', 50),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-000000000001', 'Extra Screen Time', '30 minutes of extra screen time', 25),
  ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0000-000000000001', 'Skip One Chore', 'Get out of doing one chore', 75)
ON CONFLICT (id) DO NOTHING;

INSERT INTO calendar_color_categories (id, household_id, name, color, created_at)
VALUES ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-000000000001', 'Family Events', '#ef4444', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO pantry_items (household_id, name, quantity, unit, location, expiration_date, notes)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Rice', 2, 'kg', 'pantry', now() + interval '6 months', 'Basmati rice'),
  ('00000000-0000-0000-0000-000000000001', 'Milk', 1, 'gallon', 'fridge', now() + interval '7 days', 'Whole milk'),
  ('00000000-0000-0000-0000-000000000001', 'Eggs', 12, 'count', 'fridge', now() + interval '14 days', 'Organic free range')
ON CONFLICT DO NOTHING;

INSERT INTO budgets (household_id, category_id, amount, month)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 500.00, date_trunc('month', now())),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 200.00, date_trunc('month', now()))
ON CONFLICT DO NOTHING;
