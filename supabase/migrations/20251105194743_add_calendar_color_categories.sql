/*
  # Add Calendar Color Categories

  ## Overview
  Adds support for customizable color categories that users can name and assign to events.
  For example, users can create a "Sports" category with a blue color.

  ## Changes

  1. New Tables
    - `calendar_color_categories`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `name` (text) - User-defined name like "Sports", "Work", "Family"
      - `color` (text) - Hex color code
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Table Updates
    - Add `color_category_id` to calendar_events (optional, nullable)
    - Keep existing `color` field for backward compatibility

  3. Security
    - Enable RLS on calendar_color_categories
    - Household members can view, create, update, and delete color categories
    - Only household members can access their household's categories

  ## Important Notes
  - Events can use either a direct color or reference a color category
  - If color_category_id is set, it takes precedence over the color field
  - This allows flexible color management across events
*/

-- Create calendar_color_categories table
CREATE TABLE IF NOT EXISTS calendar_color_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add color_category_id to calendar_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'color_category_id'
  ) THEN
    ALTER TABLE calendar_events ADD COLUMN color_category_id uuid REFERENCES calendar_color_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_calendar_color_categories_household_id ON calendar_color_categories(household_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_color_category_id ON calendar_events(color_category_id);

-- Enable RLS
ALTER TABLE calendar_color_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_color_categories
CREATE POLICY "Household members can view color categories"
  ON calendar_color_categories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_color_categories.household_id
      AND hm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Household members can create color categories"
  ON calendar_color_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_color_categories.household_id
      AND hm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Household members can update color categories"
  ON calendar_color_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_color_categories.household_id
      AND hm.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_color_categories.household_id
      AND hm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Household members can delete color categories"
  ON calendar_color_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_color_categories.household_id
      AND hm.user_id = (select auth.uid())
    )
  );