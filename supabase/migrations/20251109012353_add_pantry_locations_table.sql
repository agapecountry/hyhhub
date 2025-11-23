/*
  # Add Pantry Locations Table

  1. New Tables
    - `pantry_locations`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `name` (text, location name like "Pantry", "Fridge", "Freezer")
      - `icon` (text, optional emoji or icon identifier)
      - `created_at` (timestamptz)
  
  2. Changes
    - Remove CHECK constraint from pantry_items.location
    - Add foreign key to pantry_locations
    - Migrate existing data to pantry_locations table
    - Insert default locations for existing households
  
  3. Security
    - Enable RLS on `pantry_locations` table
    - Add policies for household members to view, insert, update, and delete locations
*/

-- Create pantry_locations table
CREATE TABLE IF NOT EXISTS pantry_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  icon text DEFAULT '📦',
  created_at timestamptz DEFAULT now()
);

-- Add index for household_id lookups
CREATE INDEX IF NOT EXISTS idx_pantry_locations_household_id ON pantry_locations(household_id);

-- Enable RLS
ALTER TABLE pantry_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pantry_locations
CREATE POLICY "Household members can view pantry_locations"
  ON pantry_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_locations.household_id
        AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can insert pantry_locations"
  ON pantry_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_locations.household_id
        AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update pantry_locations"
  ON pantry_locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_locations.household_id
        AND household_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_locations.household_id
        AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete pantry_locations"
  ON pantry_locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_locations.household_id
        AND household_members.user_id = auth.uid()
    )
  );

-- Insert default locations for all existing households
INSERT INTO pantry_locations (household_id, name, icon)
SELECT id, 'Pantry', '📦' FROM households
ON CONFLICT DO NOTHING;

INSERT INTO pantry_locations (household_id, name, icon)
SELECT id, 'Fridge', '🧊' FROM households
ON CONFLICT DO NOTHING;

INSERT INTO pantry_locations (household_id, name, icon)
SELECT id, 'Freezer', '❄️' FROM households
ON CONFLICT DO NOTHING;

-- Add a new column to pantry_items for the location_id
ALTER TABLE pantry_items ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES pantry_locations(id) ON DELETE SET NULL;

-- Migrate existing data: map text locations to location_id
DO $$
DECLARE
  household_rec RECORD;
  pantry_loc_id uuid;
  fridge_loc_id uuid;
  freezer_loc_id uuid;
BEGIN
  FOR household_rec IN SELECT DISTINCT household_id FROM pantry_items LOOP
    -- Get location IDs for this household
    SELECT id INTO pantry_loc_id FROM pantry_locations 
    WHERE household_id = household_rec.household_id AND name = 'Pantry' LIMIT 1;
    
    SELECT id INTO fridge_loc_id FROM pantry_locations 
    WHERE household_id = household_rec.household_id AND name = 'Fridge' LIMIT 1;
    
    SELECT id INTO freezer_loc_id FROM pantry_locations 
    WHERE household_id = household_rec.household_id AND name = 'Freezer' LIMIT 1;
    
    -- Update pantry_items with the new location_id
    UPDATE pantry_items 
    SET location_id = pantry_loc_id 
    WHERE household_id = household_rec.household_id AND location = 'pantry';
    
    UPDATE pantry_items 
    SET location_id = fridge_loc_id 
    WHERE household_id = household_rec.household_id AND location = 'fridge';
    
    UPDATE pantry_items 
    SET location_id = freezer_loc_id 
    WHERE household_id = household_rec.household_id AND location = 'freezer';
  END LOOP;
END $$;

-- Add index for location_id lookups
CREATE INDEX IF NOT EXISTS idx_pantry_items_location_id ON pantry_items(location_id);

-- Remove the CHECK constraint on the old location column
ALTER TABLE pantry_items DROP CONSTRAINT IF EXISTS pantry_items_location_check;

-- Keep the old location column for now (for backward compatibility), but it's no longer enforced
-- In a future migration, we can drop the location column entirely
