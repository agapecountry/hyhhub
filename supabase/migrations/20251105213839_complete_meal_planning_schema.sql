/*
  # Complete Meal Planning System

  ## Overview
  Completes the meal planning system by adding missing fields to recipes table
  and creating related tables for ingredients, meal plans, and grocery lists.

  ## Changes to Existing Tables

  ### `recipes` table updates
  - Add `notes` (text, optional notes)
  - Add `image_url` (text, optional image URL)
  - Add `category` (text, optional category like breakfast, lunch, dinner, dessert)
  - Add `created_by` (uuid, user id who created)
  - Add `created_at` (timestamptz)
  - Add `updated_at` (timestamptz)

  ## New Tables

  ### `recipe_ingredients`
  Stores ingredients for each recipe
  - `id` (uuid, primary key)
  - `recipe_id` (uuid, foreign key to recipes)
  - `name` (text, ingredient name)
  - `quantity` (text, amount like "2 cups", "1 tbsp")
  - `order_index` (integer, display order)
  - `created_at` (timestamptz)

  ### `meal_plans`
  Schedules meals for specific dates and meal times
  - `id` (uuid, primary key)
  - `household_id` (uuid, foreign key to households)
  - `recipe_id` (uuid, foreign key to recipes, optional)
  - `meal_name` (text, name if no recipe linked)
  - `meal_type` (text, breakfast/lunch/dinner/snack)
  - `meal_date` (date)
  - `notes` (text, optional)
  - `created_by` (uuid, user id who created)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `grocery_list_items`
  Tracks items needed for grocery shopping
  - `id` (uuid, primary key)
  - `household_id` (uuid, foreign key to households)
  - `name` (text, item name)
  - `quantity` (text, optional amount)
  - `category` (text, optional category like produce, dairy, meat)
  - `is_purchased` (boolean, default false)
  - `recipe_id` (uuid, optional reference to source recipe)
  - `added_by` (uuid, user id who added)
  - `purchased_by` (uuid, optional, user id who purchased)
  - `purchased_at` (timestamptz, optional)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all new tables
  - Users can only access data for households they belong to
  - All operations require authentication

  ## Indexes
  - Index household_id on all tables for efficient queries
  - Index meal_date on meal_plans for calendar views
  - Index recipe_id on recipe_ingredients for ingredient lookups
*/

-- Add missing columns to recipes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'notes'
  ) THEN
    ALTER TABLE recipes ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE recipes ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'category'
  ) THEN
    ALTER TABLE recipes ADD COLUMN category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE recipes ADD COLUMN created_by uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE recipes ADD COLUMN created_at timestamptz DEFAULT now() NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE recipes ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Create recipe_ingredients table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity text,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  meal_name text,
  meal_type text NOT NULL,
  meal_date date NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT meal_name_or_recipe CHECK (recipe_id IS NOT NULL OR meal_name IS NOT NULL)
);

-- Create grocery_list_items table
CREATE TABLE IF NOT EXISTS grocery_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity text,
  category text,
  is_purchased boolean DEFAULT false NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  added_by uuid,
  purchased_by uuid,
  purchased_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recipes_household_id ON recipes(household_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_household_id ON meal_plans(household_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_date ON meal_plans(meal_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe_id ON meal_plans(recipe_id);
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_household_id ON grocery_list_items(household_id);
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_recipe_id ON grocery_list_items(recipe_id);

-- Enable RLS
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_list_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipe_ingredients
CREATE POLICY "Users can view recipe ingredients"
  ON recipe_ingredients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN household_members hm ON hm.household_id = r.household_id
      WHERE r.id = recipe_ingredients.recipe_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recipe ingredients"
  ON recipe_ingredients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN household_members hm ON hm.household_id = r.household_id
      WHERE r.id = recipe_ingredients.recipe_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recipe ingredients"
  ON recipe_ingredients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN household_members hm ON hm.household_id = r.household_id
      WHERE r.id = recipe_ingredients.recipe_id
      AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN household_members hm ON hm.household_id = r.household_id
      WHERE r.id = recipe_ingredients.recipe_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recipe ingredients"
  ON recipe_ingredients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN household_members hm ON hm.household_id = r.household_id
      WHERE r.id = recipe_ingredients.recipe_id
      AND hm.user_id = auth.uid()
    )
  );

-- RLS Policies for meal_plans
CREATE POLICY "Users can view household meal plans"
  ON meal_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = meal_plans.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create household meal plans"
  ON meal_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = meal_plans.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household meal plans"
  ON meal_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = meal_plans.household_id
      AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = meal_plans.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household meal plans"
  ON meal_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = meal_plans.household_id
      AND hm.user_id = auth.uid()
    )
  );

-- RLS Policies for grocery_list_items
CREATE POLICY "Users can view household grocery items"
  ON grocery_list_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = grocery_list_items.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create household grocery items"
  ON grocery_list_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = grocery_list_items.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household grocery items"
  ON grocery_list_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = grocery_list_items.household_id
      AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = grocery_list_items.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household grocery items"
  ON grocery_list_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = grocery_list_items.household_id
      AND hm.user_id = auth.uid()
    )
  );