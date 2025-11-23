/*
  # Optimize RLS Policies for Scale - Part 3: Meal Planning

  ## Tables Updated
  - recipes
  - ingredients
  - recipe_ingredients
  - meals
  - meal_plans
  - grocery_list
  - grocery_list_items
  - pantry_items
  - inventory_log
*/

-- RECIPES
DROP POLICY IF EXISTS "Household members can view recipes" ON recipes;
CREATE POLICY "Household members can view recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recipes.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert recipes" ON recipes;
CREATE POLICY "Household members can insert recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recipes.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update recipes" ON recipes;
CREATE POLICY "Household members can update recipes"
  ON recipes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recipes.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete recipes" ON recipes;
CREATE POLICY "Household members can delete recipes"
  ON recipes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recipes.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- INGREDIENTS
DROP POLICY IF EXISTS "Users can view ingredients of household recipes" ON ingredients;
CREATE POLICY "Users can view ingredients of household recipes"
  ON ingredients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert ingredients to household recipes" ON ingredients;
CREATE POLICY "Users can insert ingredients to household recipes"
  ON ingredients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update ingredients of household recipes" ON ingredients;
CREATE POLICY "Users can update ingredients of household recipes"
  ON ingredients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete ingredients of household recipes" ON ingredients;
CREATE POLICY "Users can delete ingredients of household recipes"
  ON ingredients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- RECIPE_INGREDIENTS
DROP POLICY IF EXISTS "Users can view recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Users can view recipe ingredients"
  ON recipe_ingredients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Users can create recipe ingredients"
  ON recipe_ingredients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Users can update recipe ingredients"
  ON recipe_ingredients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Users can delete recipe ingredients"
  ON recipe_ingredients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- MEALS
DROP POLICY IF EXISTS "Household members can view meals" ON meals;
CREATE POLICY "Household members can view meals"
  ON meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meals.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert meals" ON meals;
CREATE POLICY "Household members can insert meals"
  ON meals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meals.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update meals" ON meals;
CREATE POLICY "Household members can update meals"
  ON meals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meals.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete meals" ON meals;
CREATE POLICY "Household members can delete meals"
  ON meals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meals.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- MEAL_PLANS
DROP POLICY IF EXISTS "Users can view household meal plans" ON meal_plans;
CREATE POLICY "Users can view household meal plans"
  ON meal_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meal_plans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create household meal plans" ON meal_plans;
CREATE POLICY "Users can create household meal plans"
  ON meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meal_plans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update household meal plans" ON meal_plans;
CREATE POLICY "Users can update household meal plans"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meal_plans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete household meal plans" ON meal_plans;
CREATE POLICY "Users can delete household meal plans"
  ON meal_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meal_plans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- GROCERY_LIST
DROP POLICY IF EXISTS "Household members can view grocery_list" ON grocery_list;
CREATE POLICY "Household members can view grocery_list"
  ON grocery_list FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can insert grocery items based on role" ON grocery_list;
CREATE POLICY "Members can insert grocery items based on role"
  ON grocery_list FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

DROP POLICY IF EXISTS "Household members can update grocery_list" ON grocery_list;
CREATE POLICY "Household members can update grocery_list"
  ON grocery_list FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete grocery_list" ON grocery_list;
CREATE POLICY "Household members can delete grocery_list"
  ON grocery_list FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- GROCERY_LIST_ITEMS
DROP POLICY IF EXISTS "Users can view household grocery items" ON grocery_list_items;
CREATE POLICY "Users can view household grocery items"
  ON grocery_list_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create household grocery items" ON grocery_list_items;
CREATE POLICY "Users can create household grocery items"
  ON grocery_list_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update household grocery items" ON grocery_list_items;
CREATE POLICY "Users can update household grocery items"
  ON grocery_list_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete household grocery items" ON grocery_list_items;
CREATE POLICY "Users can delete household grocery items"
  ON grocery_list_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- PANTRY_ITEMS
DROP POLICY IF EXISTS "Household members can view pantry_items" ON pantry_items;
CREATE POLICY "Household members can view pantry_items"
  ON pantry_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert pantry_items" ON pantry_items;
CREATE POLICY "Household members can insert pantry_items"
  ON pantry_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update pantry_items" ON pantry_items;
CREATE POLICY "Household members can update pantry_items"
  ON pantry_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete pantry_items" ON pantry_items;
CREATE POLICY "Household members can delete pantry_items"
  ON pantry_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- INVENTORY_LOG
DROP POLICY IF EXISTS "Household members can view inventory_log" ON inventory_log;
CREATE POLICY "Household members can view inventory_log"
  ON inventory_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = inventory_log.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert inventory_log" ON inventory_log;
CREATE POLICY "Household members can insert inventory_log"
  ON inventory_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = inventory_log.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update inventory_log" ON inventory_log;
CREATE POLICY "Household members can update inventory_log"
  ON inventory_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = inventory_log.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete inventory_log" ON inventory_log;
CREATE POLICY "Household members can delete inventory_log"
  ON inventory_log FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = inventory_log.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );
