/*
  # Create household preferences table

  1. New Table
    - `household_preferences`
      - `id` (uuid, primary key)
      - `household_id` (uuid, references households)
      - `preference_key` (text) - e.g., 'budget_503020_data'
      - `preference_value` (jsonb) - flexible storage for any preference data
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - UNIQUE constraint on (household_id, preference_key)

  2. Security
    - Enable RLS
    - Household members can read/write their own household's preferences
*/

-- Drop table if it exists (for development - removes all data)
DROP TABLE IF EXISTS household_preferences CASCADE;

-- Create household_preferences table
CREATE TABLE IF NOT EXISTS household_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  preference_key text NOT NULL,
  preference_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_household_preference UNIQUE (household_id, preference_key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_household_preferences_household_id 
  ON household_preferences(household_id);

CREATE INDEX IF NOT EXISTS idx_household_preferences_key 
  ON household_preferences(household_id, preference_key);

-- Enable RLS
ALTER TABLE household_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Household members can view preferences" ON household_preferences;
DROP POLICY IF EXISTS "Household members can insert preferences" ON household_preferences;
DROP POLICY IF EXISTS "Household members can update preferences" ON household_preferences;
DROP POLICY IF EXISTS "Household members can delete preferences" ON household_preferences;

-- RLS Policies: Household members can view their household's preferences
CREATE POLICY "Household members can view preferences"
  ON household_preferences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_preferences.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policies: Household members can insert preferences
CREATE POLICY "Household members can insert preferences"
  ON household_preferences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_preferences.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policies: Household members can update their household's preferences
CREATE POLICY "Household members can update preferences"
  ON household_preferences FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_preferences.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policies: Household members can delete their household's preferences
CREATE POLICY "Household members can delete preferences"
  ON household_preferences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_preferences.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS update_household_preferences_updated_at ON household_preferences;
DROP FUNCTION IF EXISTS update_household_preferences_updated_at();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_household_preferences_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_household_preferences_updated_at
  BEFORE UPDATE ON household_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_household_preferences_updated_at();
