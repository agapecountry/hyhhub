/*
  # Automatic Recurring Chore Generation

  1. New Functions
    - `generate_recurring_chore_assignments()` - Creates new assignments for daily/weekly/monthly chores
    - Checks for chores that need new assignments based on their frequency
    - Preserves the last assigned member for consistent rotation

  2. Logic
    - Daily chores: Creates assignment if none exist for today
    - Weekly chores: Creates assignment if none exist for current week
    - Monthly chores: Creates assignment if none exist for current month
    - Uses the last assignment's member assignment for continuity

  3. Scheduling
    - Function designed to be called daily (can be scheduled via pg_cron or external cron)
    - Safe to run multiple times - won't create duplicates
*/

-- Function to generate recurring chore assignments
CREATE OR REPLACE FUNCTION generate_recurring_chore_assignments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chore_record RECORD;
  last_assignment RECORD;
  new_due_date date;
BEGIN
  -- Process all recurring chores (daily, weekly, monthly)
  FOR chore_record IN 
    SELECT * FROM chores 
    WHERE frequency IN ('daily', 'weekly', 'monthly')
  LOOP
    -- Get the most recent assignment for this chore
    SELECT * INTO last_assignment
    FROM chore_assignments
    WHERE chore_id = chore_record.id
    ORDER BY due_date DESC
    LIMIT 1;

    -- Determine if we need a new assignment and calculate due date
    IF chore_record.frequency = 'daily' THEN
      -- Check if there's an assignment for today
      IF last_assignment.id IS NULL OR last_assignment.due_date < CURRENT_DATE THEN
        new_due_date := CURRENT_DATE;
      END IF;
    
    ELSIF chore_record.frequency = 'weekly' THEN
      -- Check if there's an assignment for this week
      IF last_assignment.id IS NULL OR 
         date_trunc('week', last_assignment.due_date) < date_trunc('week', CURRENT_DATE) THEN
        new_due_date := CURRENT_DATE;
      END IF;
    
    ELSIF chore_record.frequency = 'monthly' THEN
      -- Check if there's an assignment for this month
      IF last_assignment.id IS NULL OR 
         date_trunc('month', last_assignment.due_date) < date_trunc('month', CURRENT_DATE) THEN
        new_due_date := CURRENT_DATE;
      END IF;
    END IF;

    -- Create new assignment if needed
    IF new_due_date IS NOT NULL THEN
      INSERT INTO chore_assignments (
        household_id,
        chore_id,
        assigned_to,
        due_date,
        completed
      ) VALUES (
        chore_record.household_id,
        chore_record.id,
        last_assignment.assigned_to, -- Use same member as last time (or NULL if was open)
        new_due_date,
        false
      );
      
      -- Reset for next iteration
      new_due_date := NULL;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_recurring_chore_assignments() TO authenticated;

-- Create a function that users can call to manually trigger generation
CREATE OR REPLACE FUNCTION trigger_chore_generation()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM generate_recurring_chore_assignments();
  RETURN json_build_object('success', true, 'message', 'Recurring chores generated');
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_chore_generation() TO authenticated;
