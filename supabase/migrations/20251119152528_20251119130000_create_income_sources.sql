/*
  # Create Income Sources Table

  1. New Tables
    - `income_sources`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `name` (text) - Name of the income source (e.g., "John's Salary", "Side Gig")
      - `monthly_amount` (decimal) - Monthly income amount
      - `notes` (text, optional) - Additional notes about the income source
      - `is_active` (boolean) - Whether this income source is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on `income_sources` table
    - Add policies for household members to manage their income sources

  3. Indexes
    - Index on household_id for fast lookups
    - Index on is_active for filtering active sources

  ## Notes
  - This table provides a simple income tracking system for Free, Basic, and Premium users
  - Elite users can choose to use this OR the advanced Paycheck Planner
  - The Budget Overview widget will pull from both sources
  - All tiers can now see accurate budget calculations
*/

-- Create income_sources table
CREATE TABLE IF NOT EXISTS income_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  monthly_amount decimal(12, 2) NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT positive_monthly_amount CHECK (monthly_amount >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_income_sources_household_id ON income_sources(household_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_is_active ON income_sources(household_id, is_active);

-- Enable RLS
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Household members can view income sources
CREATE POLICY "Household members can view income sources"
  ON income_sources FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = income_sources.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- RLS Policies: Household members can insert income sources
CREATE POLICY "Household members can create income sources"
  ON income_sources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = income_sources.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- RLS Policies: Household members can update income sources
CREATE POLICY "Household members can update income sources"
  ON income_sources FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = income_sources.household_id
      AND household_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = income_sources.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- RLS Policies: Household members can delete income sources
CREATE POLICY "Household members can delete income sources"
  ON income_sources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = income_sources.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE TRIGGER set_income_sources_updated_at
  BEFORE UPDATE ON income_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();