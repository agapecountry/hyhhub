/*
  # Update Budget Categories Default Due Date to Last Day of Month

  1. Changes
    - Update default due_date for budget_categories from 15 to 31 (last day of month)
    - This allows the paycheck planner to schedule budget items flexibly throughout the month
    - Bills and debts keep their specific due dates
    - Budget items can now be planned anytime within the month

  2. Reasoning
    - Budget expenses (groceries, gas, etc.) are flexible and don't have strict due dates
    - Setting to end of month gives maximum flexibility in scheduling
    - Prioritizes bills/debts with specific due dates
*/

-- Update the default value for due_date column in budget_categories
ALTER TABLE budget_categories
  ALTER COLUMN due_date SET DEFAULT 31;

-- Update any existing budget categories that are using the old default of 15
-- to the new default of 31 (only if they haven't been manually changed)
-- This is optional - only do it if we want to update existing records
UPDATE budget_categories
SET due_date = 31
WHERE due_date = 15
  AND is_active = true;
