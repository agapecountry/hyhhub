/*
  # Fix Debt Payment Trigger Infinite Recursion

  1. Problem
    - Transaction trigger calls recalculate_debt_balance_with_interest()
    - recalculate_debt_balance_with_interest() UPDATEs debt_payments
    - debt_payments UPDATE triggers recalc_on_debt_payment_update
    - recalc_on_debt_payment_update calls recalculate_debt_balance_with_interest() again
    - INFINITE RECURSION → stack depth limit exceeded

  2. Solution
    - Drop the debt_payments UPDATE trigger (recalc_on_debt_payment_update)
    - The recalculation already happens from transaction trigger
    - Direct updates to debt_payments should not trigger another full recalculation
    - Keep DELETE trigger to handle manual deletion of debt_payments

  3. Changes
    - Drop recalc_on_debt_payment_update trigger and function
    - Keep recalc_on_debt_payment_delete for manual deletions
*/

-- Drop the UPDATE trigger that causes infinite recursion
DROP TRIGGER IF EXISTS recalc_on_debt_payment_update ON debt_payments;

-- Drop the function
DROP FUNCTION IF EXISTS handle_debt_payment_update();
