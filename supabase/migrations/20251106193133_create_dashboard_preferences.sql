/*
  # Create dashboard preferences system

  1. New Tables
    - `dashboard_widgets`
      - `id` (uuid, primary key)
      - `widget_key` (text, unique identifier for the widget type)
      - `default_enabled` (boolean, whether enabled by default)
      - `display_name` (text, human-readable name)
      - `description` (text, description of what the widget shows)
      - `category` (text, for grouping widgets)
      
    - `user_dashboard_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `household_id` (uuid, references households)
      - `widget_key` (text, references dashboard_widgets)
      - `is_visible` (boolean, whether user wants this widget shown)
      - `sort_order` (integer, for custom ordering)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can read widget definitions
    - Users can manage their own dashboard preferences

  3. Data
    - Insert default widget definitions for all dashboard cards
*/

-- Create dashboard_widgets table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_key text UNIQUE NOT NULL,
  default_enabled boolean DEFAULT true,
  display_name text NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_dashboard_preferences table
CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  widget_key text NOT NULL REFERENCES dashboard_widgets(widget_key) ON DELETE CASCADE,
  is_visible boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, household_id, widget_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_dashboard_preferences_user ON user_dashboard_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dashboard_preferences_household ON user_dashboard_preferences(household_id);
CREATE INDEX IF NOT EXISTS idx_user_dashboard_preferences_widget ON user_dashboard_preferences(widget_key);

-- Enable RLS
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Dashboard widgets policies (public read)
CREATE POLICY "Anyone can view dashboard widgets"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (true);

-- User dashboard preferences policies
CREATE POLICY "Users can view their own dashboard preferences"
  ON user_dashboard_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard preferences"
  ON user_dashboard_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard preferences"
  ON user_dashboard_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dashboard preferences"
  ON user_dashboard_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default widget definitions
INSERT INTO dashboard_widgets (widget_key, default_enabled, display_name, description, category)
VALUES
  ('total_balance', true, 'Total Balance', 'Shows your total account balances', 'financial'),
  ('active_loans', true, 'Active Loans', 'Shows your debt accounts', 'financial'),
  ('recipes', true, 'Recipes', 'Shows saved recipe count', 'household'),
  ('upcoming_events', true, 'Upcoming Events', 'Shows events on your calendar', 'household'),
  ('pending_chores', true, 'Pending Chores', 'Shows incomplete chores', 'household'),
  ('pantry_items', true, 'Pantry Items', 'Shows your pantry inventory count', 'household')
ON CONFLICT (widget_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;