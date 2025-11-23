/*
  # Create Paycheck Planner Schema

  Creates tables to support paycheck planning feature for Premium and Elite users.
  
  ## Tables Created
  
  ### `paycheck_settings`
  Stores user's paycheck configuration
  - `id` (uuid, primary key)
  - `household_id` (uuid, foreign key to households)
  - `net_pay_amount` (decimal) - Amount of net pay per paycheck
  - `payment_frequency` (text) - weekly, biweekly, semimonthly, monthly
  - `next_paycheck_date` (date) - Date of next expected paycheck
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## Security
  - Enable RLS on all tables
  - Add policies for household members to manage their paycheck settings
  
  ## Notes
  - One paycheck setting per household
  - Premium and Elite tier feature
*/

-- Create paycheck_settings table
CREATE TABLE IF NOT EXISTS paycheck_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  net_pay_amount decimal(10, 2) NOT NULL,
  payment_frequency text NOT NULL CHECK (payment_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  next_paycheck_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(household_id)
);

-- Add index for household lookups
CREATE INDEX IF NOT EXISTS idx_paycheck_settings_household_id ON paycheck_settings(household_id);

-- Enable RLS
ALTER TABLE paycheck_settings ENABLE ROW LEVEL SECURITY;

-- Policies for paycheck_settings
CREATE POLICY "Users can view paycheck settings for their household"
  ON paycheck_settings FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert paycheck settings for their household"
  ON paycheck_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update paycheck settings for their household"
  ON paycheck_settings FOR UPDATE
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

CREATE POLICY "Users can delete paycheck settings for their household"
  ON paycheck_settings FOR DELETE
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );
