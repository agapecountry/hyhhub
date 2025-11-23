/*
  # Enable pg_cron and Schedule Daily Chore Generation

  1. Extension Setup
    - Enable pg_cron extension for scheduled tasks
  
  2. Scheduled Job
    - Creates a daily cron job at 12:01 AM to generate recurring chore assignments
    - Runs automatically without any external services needed
  
  3. Security
    - Job runs with appropriate permissions to call the chore generation function
*/

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the daily chore generation to run at 12:01 AM every day
SELECT cron.schedule(
  'generate-daily-chores',           -- job name
  '1 0 * * *',                        -- cron expression: 12:01 AM daily
  $$SELECT generate_recurring_chore_assignments()$$
);
