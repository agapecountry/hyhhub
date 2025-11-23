/*
  # Add Navigation Preferences

  1. New Tables
    - `user_navigation_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `household_id` (uuid, foreign key to households)
      - `hidden_sections` (jsonb array of section names)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_navigation_preferences` table
    - Add policies for authenticated users to manage their own preferences
*/

CREATE TABLE IF NOT EXISTS user_navigation_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  hidden_sections jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, household_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_navigation_preferences_user_household 
  ON user_navigation_preferences(user_id, household_id);

-- Enable RLS
ALTER TABLE user_navigation_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own navigation preferences"
  ON user_navigation_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own navigation preferences"
  ON user_navigation_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own navigation preferences"
  ON user_navigation_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own navigation preferences"
  ON user_navigation_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_navigation_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_user_navigation_preferences_updated_at ON user_navigation_preferences;
CREATE TRIGGER update_user_navigation_preferences_updated_at
  BEFORE UPDATE ON user_navigation_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_navigation_preferences_updated_at();