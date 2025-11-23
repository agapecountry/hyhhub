/*
  # Drop Orphaned Debt Payment Triggers

  1. Problem
    - Triggers still exist that reference deleted function recalculate_debt_balance_with_interest
    - These triggers cause errors when debt_payments table is modified
    
  2. Solution
    - Drop the orphaned triggers
    - Drop the orphaned trigger functions
    
  3. Changes
    - Drop recalc_on_debt_payment_update trigger
    - Drop recalc_on_debt_payment_delete trigger
    - Drop handle_debt_payment_update function
    - Drop handle_debt_payment_deletion function
*/

-- Drop the triggers
DROP TRIGGER IF EXISTS recalc_on_debt_payment_update ON debt_payments;
DROP TRIGGER IF EXISTS recalc_on_debt_payment_delete ON debt_payments;

-- Drop the trigger functions
DROP FUNCTION IF EXISTS handle_debt_payment_update();
DROP FUNCTION IF EXISTS handle_debt_payment_deletion();
