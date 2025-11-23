/*
  # Add Exclude from Payoff Plan Feature

  1. Changes
    - Add `exclude_from_payoff` boolean column to debts table
    - Defaults to false (included in payoff plans)
    - Allows users to exclude specific debts from avalanche/snowball/snowflake calculations
    
  2. Use Cases
    - Mortgages that users want to track but not pay off aggressively
    - Debts with special payment terms
    - Low-interest debts users prefer to keep
    - Student loans with specific repayment plans
*/

-- Add exclude_from_payoff column to debts table
ALTER TABLE debts 
ADD COLUMN IF NOT EXISTS exclude_from_payoff boolean DEFAULT false NOT NULL;

-- Add index for filtering queries
CREATE INDEX IF NOT EXISTS idx_debts_exclude_from_payoff 
  ON debts(household_id, exclude_from_payoff)
  WHERE exclude_from_payoff = false;

-- Add helpful comment
COMMENT ON COLUMN debts.exclude_from_payoff IS 
  'When true, this debt is excluded from avalanche, snowball, and snowflake payoff plan calculations';