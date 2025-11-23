/*
  # Create Budget Categories Schema

  1. New Tables
    - `budget_categories`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `name` (text) - Category name (e.g., "Groceries", "Gas", "Fun Money")
      - `monthly_amount` (numeric) - Budgeted amount per month
      - `due_date` (integer, 1-31) - Day of month for planning (defaults to 15)
      - `icon` (text) - Optional icon name
      - `color` (text) - Optional color for UI
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key to users)

  2. Security
    - Enable RLS on `budget_categories` table
    - Add policies for household members to manage budget categories

  3. Indexes
    - Index on household_id for fast queries
    - Index on is_active for filtering active categories
*/

-- Create budget_categories table
CREATE TABLE IF NOT EXISTS budget_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  monthly_amount numeric(10, 2) NOT NULL DEFAULT 0,
  due_date integer NOT NULL DEFAULT 15 CHECK (due_date >= 1 AND due_date <= 31),
  icon text,
  color text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_budget_categories_household_id 
  ON budget_categories(household_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_budget_categories_active 
  ON budget_categories(is_active);

-- Enable RLS
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- Policies for budget_categories
CREATE POLICY "Household members can view budget categories"
  ON budget_categories FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can create budget categories"
  ON budget_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update budget categories"
  ON budget_categories FOR UPDATE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete budget categories"
  ON budget_categories FOR DELETE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );
