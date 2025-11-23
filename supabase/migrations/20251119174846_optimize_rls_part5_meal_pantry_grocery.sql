/*
  # Optimize RLS Policies - Part 5: Meal, Pantry, Grocery
  
  Tables optimized:
  - recipes, recipe_ingredients
  - meals, meal_plans
  - pantry_items, pantry_locations
  - grocery_list, grocery_list_items
  - inventory_log
*/

-- RECIPES
DROP POLICY IF EXISTS "Household members can view recipes" ON recipes;
DROP POLICY IF EXISTS "Household members can create recipes" ON recipes;
DROP POLICY IF EXISTS "Household members can update recipes" ON recipes;
DROP POLICY IF EXISTS "Household members can delete recipes" ON recipes;

CREATE POLICY "Household members can view recipes" ON recipes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = recipes.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can create recipes" ON recipes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = recipes.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can update recipes" ON recipes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = recipes.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can delete recipes" ON recipes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = recipes.household_id AND household_members.user_id = (SELECT auth.uid())));

-- RECIPE_INGREDIENTS
DROP POLICY IF EXISTS "Household members can view recipe ingredients" ON recipe_ingredients;
DROP POLICY IF EXISTS "Household members can create recipe ingredients" ON recipe_ingredients;
DROP POLICY IF EXISTS "Household members can update recipe ingredients" ON recipe_ingredients;
DROP POLICY IF EXISTS "Household members can delete recipe ingredients" ON recipe_ingredients;

CREATE POLICY "Household members can view recipe ingredients" ON recipe_ingredients FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM recipes JOIN household_members ON household_members.household_id = recipes.household_id WHERE recipes.id = recipe_ingredients.recipe_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can create recipe ingredients" ON recipe_ingredients FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM recipes JOIN household_members ON household_members.household_id = recipes.household_id WHERE recipes.id = recipe_ingredients.recipe_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can update recipe ingredients" ON recipe_ingredients FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM recipes JOIN household_members ON household_members.household_id = recipes.household_id WHERE recipes.id = recipe_ingredients.recipe_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can delete recipe ingredients" ON recipe_ingredients FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM recipes JOIN household_members ON household_members.household_id = recipes.household_id WHERE recipes.id = recipe_ingredients.recipe_id AND household_members.user_id = (SELECT auth.uid())));

-- MEALS
DROP POLICY IF EXISTS "Household members can view meals" ON meals;
DROP POLICY IF EXISTS "Household members can create meals" ON meals;
DROP POLICY IF EXISTS "Household members can update meals" ON meals;
DROP POLICY IF EXISTS "Household members can delete meals" ON meals;

CREATE POLICY "Household members can view meals" ON meals FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = meals.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can create meals" ON meals FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = meals.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can update meals" ON meals FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = meals.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can delete meals" ON meals FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = meals.household_id AND household_members.user_id = (SELECT auth.uid())));

-- MEAL_PLANS
DROP POLICY IF EXISTS "Household members can view meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Household members can create meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Household members can update meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Household members can delete meal plans" ON meal_plans;

CREATE POLICY "Household members can view meal plans" ON meal_plans FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = meal_plans.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can create meal plans" ON meal_plans FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = meal_plans.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can update meal plans" ON meal_plans FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = meal_plans.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can delete meal plans" ON meal_plans FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = meal_plans.household_id AND household_members.user_id = (SELECT auth.uid())));

-- PANTRY_ITEMS
DROP POLICY IF EXISTS "Household members can view pantry items" ON pantry_items;
DROP POLICY IF EXISTS "Household members can create pantry items" ON pantry_items;
DROP POLICY IF EXISTS "Household members can update pantry items" ON pantry_items;
DROP POLICY IF EXISTS "Household members can delete pantry items" ON pantry_items;

CREATE POLICY "Household members can view pantry items" ON pantry_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = pantry_items.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can create pantry items" ON pantry_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = pantry_items.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can update pantry items" ON pantry_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = pantry_items.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can delete pantry items" ON pantry_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = pantry_items.household_id AND household_members.user_id = (SELECT auth.uid())));

-- PANTRY_LOCATIONS
DROP POLICY IF EXISTS "Household members can view pantry locations" ON pantry_locations;
DROP POLICY IF EXISTS "Household members can create pantry locations" ON pantry_locations;
DROP POLICY IF EXISTS "Household members can update pantry locations" ON pantry_locations;
DROP POLICY IF EXISTS "Household members can delete pantry locations" ON pantry_locations;

CREATE POLICY "Household members can view pantry locations" ON pantry_locations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = pantry_locations.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can create pantry locations" ON pantry_locations FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = pantry_locations.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can update pantry locations" ON pantry_locations FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = pantry_locations.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can delete pantry locations" ON pantry_locations FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = pantry_locations.household_id AND household_members.user_id = (SELECT auth.uid())));

-- GROCERY_LIST
DROP POLICY IF EXISTS "Household members can view grocery list" ON grocery_list;
DROP POLICY IF EXISTS "Household members can create grocery list" ON grocery_list;
DROP POLICY IF EXISTS "Household members can update grocery list" ON grocery_list;
DROP POLICY IF EXISTS "Household members can delete grocery list" ON grocery_list;

CREATE POLICY "Household members can view grocery list" ON grocery_list FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = grocery_list.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can create grocery list" ON grocery_list FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = grocery_list.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can update grocery list" ON grocery_list FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = grocery_list.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can delete grocery list" ON grocery_list FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = grocery_list.household_id AND household_members.user_id = (SELECT auth.uid())));

-- GROCERY_LIST_ITEMS
DROP POLICY IF EXISTS "Household members can view grocery list items" ON grocery_list_items;
DROP POLICY IF EXISTS "Household members can create grocery list items" ON grocery_list_items;
DROP POLICY IF EXISTS "Household members can update grocery list items" ON grocery_list_items;
DROP POLICY IF EXISTS "Household members can delete grocery list items" ON grocery_list_items;

CREATE POLICY "Household members can view grocery list items" ON grocery_list_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = grocery_list_items.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can create grocery list items" ON grocery_list_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = grocery_list_items.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can update grocery list items" ON grocery_list_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = grocery_list_items.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can delete grocery list items" ON grocery_list_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = grocery_list_items.household_id AND household_members.user_id = (SELECT auth.uid())));

-- INVENTORY_LOG
DROP POLICY IF EXISTS "Household members can view inventory log" ON inventory_log;
DROP POLICY IF EXISTS "Household members can create inventory log" ON inventory_log;
DROP POLICY IF EXISTS "Household members can update inventory log" ON inventory_log;
DROP POLICY IF EXISTS "Household members can delete inventory log" ON inventory_log;

CREATE POLICY "Household members can view inventory log" ON inventory_log FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = inventory_log.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can create inventory log" ON inventory_log FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = inventory_log.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can update inventory log" ON inventory_log FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = inventory_log.household_id AND household_members.user_id = (SELECT auth.uid())));
CREATE POLICY "Household members can delete inventory log" ON inventory_log FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = inventory_log.household_id AND household_members.user_id = (SELECT auth.uid())));