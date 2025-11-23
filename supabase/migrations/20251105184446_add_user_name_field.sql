/*
  # Add Name Field to Users Table

  ## Overview
  Adds a name field to the users table to allow users to set their display name.

  ## Changes

  1. Schema Modifications
    - Add `name` column to `users` table
    - Name is optional (nullable) as existing users won't have it set

  ## Important Notes
  - Users can update their name through profile settings
  - Name is used for display throughout the application
  - Falls back to email if name is not set
*/

-- Add name column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'name'
  ) THEN
    ALTER TABLE users ADD COLUMN name text;
  END IF;
END $$;