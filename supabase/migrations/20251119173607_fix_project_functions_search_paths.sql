/*
  # Fix Savings Project Functions Search Paths

  1. Functions Fixed
    - update_project_amount
    - check_project_completion
*/

-- Fix update_project_amount
DROP FUNCTION IF EXISTS update_project_amount() CASCADE;
CREATE OR REPLACE FUNCTION update_project_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.savings_projects
  SET current_amount = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.savings_project_contributions
    WHERE project_id = NEW.project_id
  )
  WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$;

-- Only create trigger if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'savings_project_contributions') THEN
    CREATE TRIGGER update_project_amount_trigger 
      AFTER INSERT OR UPDATE OR DELETE ON savings_project_contributions 
      FOR EACH ROW 
      EXECUTE FUNCTION update_project_amount();
  END IF;
END $$;

COMMENT ON FUNCTION update_project_amount() IS 'Trigger function to recalculate project amount. Search path is fixed for security.';

-- Fix check_project_completion
DROP FUNCTION IF EXISTS check_project_completion() CASCADE;
CREATE OR REPLACE FUNCTION check_project_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.current_amount >= NEW.target_amount AND OLD.current_amount < OLD.target_amount THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Only create trigger if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'savings_projects') THEN
    CREATE TRIGGER check_project_completion_trigger 
      BEFORE UPDATE ON savings_projects 
      FOR EACH ROW 
      EXECUTE FUNCTION check_project_completion();
  END IF;
END $$;

COMMENT ON FUNCTION check_project_completion() IS 'Trigger function to mark project as completed. Search path is fixed for security.';