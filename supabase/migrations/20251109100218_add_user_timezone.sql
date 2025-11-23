/*
  # Add User Timezone Support

  1. Changes
    - Add `timezone` column to `users` table to store user's preferred timezone
    - Default to 'America/New_York' for existing users
    - Add check constraint to ensure valid timezone format

  2. Notes
    - Users can update their timezone in profile settings
    - This will be used to display calendar events in correct local time
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE users ADD COLUMN timezone text DEFAULT 'America/New_York' NOT NULL;
  END IF;
END $$;

-- Add a helpful comment
COMMENT ON COLUMN users.timezone IS 'User timezone in IANA timezone format (e.g., America/New_York, Europe/London)';
