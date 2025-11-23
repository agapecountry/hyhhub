/*
  # Fix Existing Trigger Functions Search Paths

  1. Problem
    - Trigger functions have mutable search_path (security risk)
    
  2. Solution
    - Drop CASCADE and recreate with search_path = public, pg_temp
    
  3. Functions Fixed
    - update_paycheck_planner_payments_updated_at
    - update_journal_entries_updated_at
*/

-- Fix update_paycheck_planner_payments_updated_at
DROP FUNCTION IF EXISTS update_paycheck_planner_payments_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_paycheck_planner_payments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_paycheck_planner_payments_updated_at
  BEFORE UPDATE ON paycheck_planner_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_paycheck_planner_payments_updated_at();

-- Fix update_journal_entries_updated_at
DROP FUNCTION IF EXISTS update_journal_entries_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_journal_entries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_journal_entries_updated_at();

COMMENT ON FUNCTION update_paycheck_planner_payments_updated_at() IS 'Trigger function to update updated_at timestamp. Search path is fixed for security.';
COMMENT ON FUNCTION update_journal_entries_updated_at() IS 'Trigger function to update updated_at timestamp. Search path is fixed for security.';