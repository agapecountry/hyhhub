/*
  # Remove Unused Indexes - Part 2

  1. Performance Improvements
    - Continue removing unused indexes
    - Further reduces storage and maintenance overhead
  
  2. Indexes Removed (Part 2 - Feature Tables)
    - chore_assignments indexes
    - ingredients indexes
    - inventory_log indexes
    - loan_payments indexes
    - meals indexes
    - meal_plans indexes
    - grocery_list_items indexes
    - redemptions indexes
    - reward_redemptions indexes
    - user_settings indexes
    - debt_payments indexes
    - recipes indexes
*/

-- Chore Assignments
DROP INDEX IF EXISTS idx_chore_assignments_chore_id;
DROP INDEX IF EXISTS idx_chore_assignments_claimed_by;

-- Ingredients
DROP INDEX IF EXISTS idx_ingredients_recipe_id;

-- Inventory Log
DROP INDEX IF EXISTS idx_inventory_log_household_id;
DROP INDEX IF EXISTS idx_inventory_log_pantry_item_id;

-- Loan Payments
DROP INDEX IF EXISTS idx_loan_payments_household_id;
DROP INDEX IF EXISTS idx_loan_payments_loan_id;

-- Meals
DROP INDEX IF EXISTS idx_meals_recipe_id;

-- Meal Plans
DROP INDEX IF EXISTS idx_meal_plans_recipe_id;

-- Grocery List Items
DROP INDEX IF EXISTS idx_grocery_list_items_recipe_id;

-- Redemptions
DROP INDEX IF EXISTS idx_redemptions_reward_id;
DROP INDEX IF EXISTS idx_redemptions_user_id;
DROP INDEX IF EXISTS idx_redemptions_member;

-- Reward Redemptions
DROP INDEX IF EXISTS idx_reward_redemptions_reward_id;

-- User Settings
DROP INDEX IF EXISTS idx_user_settings_default_household_id;
DROP INDEX IF EXISTS idx_user_settings_user_id;

-- Debt Payments
DROP INDEX IF EXISTS idx_debt_payments_debt;
DROP INDEX IF EXISTS idx_debt_payments_date;

-- Recipes
DROP INDEX IF EXISTS idx_recipes_created_by;