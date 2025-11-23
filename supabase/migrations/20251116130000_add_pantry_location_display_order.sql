/*
  # Add Display Order to Pantry Locations

  1. Changes
    - Add `display_order` column to `pantry_locations` table
    - Set default values based on current alphabetical order
    - Add index for efficient ordering queries

  2. Purpose
    - Enable custom ordering of pantry location tabs
    - Allow users to reorder locations via drag-and-drop
*/

-- Add display_order column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pantry_locations' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE pantry_locations ADD COLUMN display_order integer DEFAULT 0;
  END IF;
END $$;

-- Set initial display_order values based on alphabetical order within each household
DO $$
DECLARE
  loc RECORD;
  order_num integer;
BEGIN
  FOR loc IN
    SELECT DISTINCT household_id
    FROM pantry_locations
    ORDER BY household_id
  LOOP
    order_num := 0;
    UPDATE pantry_locations
    SET display_order = order_num + row_num - 1
    FROM (
      SELECT id, ROW_NUMBER() OVER (ORDER BY name) as row_num
      FROM pantry_locations
      WHERE household_id = loc.household_id
    ) AS ordered
    WHERE pantry_locations.id = ordered.id
      AND pantry_locations.household_id = loc.household_id;
  END LOOP;
END $$;

-- Add index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_pantry_locations_household_order
  ON pantry_locations(household_id, display_order);
