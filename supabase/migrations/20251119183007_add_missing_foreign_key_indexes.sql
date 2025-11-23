/*
  # Add Missing Foreign Key Indexes

  1. Problem
    - 20+ foreign key columns lack indexes
    - This causes slow JOIN queries and poor RLS policy performance
    - Foreign keys without indexes severely impact database performance at scale
    
  2. Solution
    - Add indexes on all foreign key columns that are missing them
    - Use CREATE INDEX IF NOT EXISTS to prevent errors
    - Indexes improve JOIN performance and RLS policy execution
    
  3. Performance Impact
    - Significantly faster JOINs
    - Faster RLS policy evaluation
    - Better query planning by PostgreSQL
    - Critical for household_id lookups in RLS policies
*/

-- Bills table
CREATE INDEX IF NOT EXISTS idx_bills_category_id 
  ON bills(category_id);

-- Budgets table
CREATE INDEX IF NOT EXISTS idx_budgets_category_id 
  ON budgets(category_id);

-- Calendar events table
CREATE INDEX IF NOT EXISTS idx_calendar_events_color_category_id 
  ON calendar_events(color_category_id);

-- Chore assignments table
CREATE INDEX IF NOT EXISTS idx_chore_assignments_chore_id 
  ON chore_assignments(chore_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_claimed_by 
  ON chore_assignments(claimed_by);

-- Debt payments table
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id 
  ON debt_payments(debt_id);

-- Family challenges table
CREATE INDEX IF NOT EXISTS idx_family_challenges_household_id 
  ON family_challenges(household_id);

-- Grocery list items table
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_recipe_id 
  ON grocery_list_items(recipe_id);

-- Household subscriptions table
CREATE INDEX IF NOT EXISTS idx_household_subscriptions_tier_id 
  ON household_subscriptions(tier_id);

-- Influencer payouts table
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_household_subscription_id 
  ON influencer_payouts(household_subscription_id);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_influencer_code_id 
  ON influencer_payouts(influencer_code_id);
CREATE INDEX IF NOT EXISTS idx_influencer_payouts_signup_id 
  ON influencer_payouts(signup_id);

-- Ingredients table
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id 
  ON ingredients(recipe_id);

-- Inventory log table
CREATE INDEX IF NOT EXISTS idx_inventory_log_household_id 
  ON inventory_log(household_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_pantry_item_id 
  ON inventory_log(pantry_item_id);

-- Loan payments table
CREATE INDEX IF NOT EXISTS idx_loan_payments_household_id 
  ON loan_payments(household_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id 
  ON loan_payments(loan_id);

-- Meal plans table
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe_id 
  ON meal_plans(recipe_id);

-- Meals table
CREATE INDEX IF NOT EXISTS idx_meals_recipe_id 
  ON meals(recipe_id);

-- Notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_event_id 
  ON notifications(event_id);

-- Add comments for documentation
COMMENT ON INDEX idx_bills_category_id IS 'Performance: Speeds up category lookups and JOINs';
COMMENT ON INDEX idx_debt_payments_debt_id IS 'Performance: Critical for debt payment queries and RLS';
COMMENT ON INDEX idx_family_challenges_household_id IS 'Performance: Improves household challenge queries';
COMMENT ON INDEX idx_household_subscriptions_tier_id IS 'Performance: Faster subscription tier lookups';
COMMENT ON INDEX idx_inventory_log_household_id IS 'Performance: Essential for household inventory queries';