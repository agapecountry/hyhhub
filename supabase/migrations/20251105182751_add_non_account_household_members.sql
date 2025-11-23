/*
  # Add Support for Household Members Without Accounts

  ## Overview
  Enables household members to exist without requiring a Supabase authentication account.
  This is useful for tracking children, pets, or other household members who don't need
  system access.

  ## Changes

  1. Schema Modifications
    - Make `user_id` nullable in `household_members` table
    - Add `name` column for storing member display name (required when user_id is null)
    - Add `is_account_member` boolean to easily distinguish account vs non-account members
    - Add check constraint to ensure either user_id exists OR name is provided

  2. Updated Constraints
    - Modified UNIQUE constraint to handle null user_id properly
    - Added CHECK constraint: if user_id is null, name must be provided

  3. Security Updates
    - Updated RLS policies to handle nullable user_id
    - Non-account members can be viewed by household members
    - Only admins can create/delete non-account members

  ## Important Notes
  - Non-account members cannot log in or perform actions
  - Non-account members are primarily for display and assignment purposes
  - The `name` field is required when `user_id` is NULL
  - Existing data is preserved (all current members have user_id)
*/

-- First, drop the existing unique constraint that includes user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'household_members_household_id_user_id_key'
  ) THEN
    ALTER TABLE household_members DROP CONSTRAINT household_members_household_id_user_id_key;
  END IF;
END $$;

-- Make user_id nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'household_members' 
    AND column_name = 'user_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE household_members ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Add name column for non-account members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'household_members' AND column_name = 'name'
  ) THEN
    ALTER TABLE household_members ADD COLUMN name text;
  END IF;
END $$;

-- Add is_account_member helper column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'household_members' AND column_name = 'is_account_member'
  ) THEN
    ALTER TABLE household_members ADD COLUMN is_account_member boolean GENERATED ALWAYS AS (user_id IS NOT NULL) STORED;
  END IF;
END $$;

-- Add check constraint: must have either user_id OR name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'household_members_user_or_name_check'
  ) THEN
    ALTER TABLE household_members 
      ADD CONSTRAINT household_members_user_or_name_check 
      CHECK (
        (user_id IS NOT NULL) OR (name IS NOT NULL AND trim(name) != '')
      );
  END IF;
END $$;

-- Add new unique constraint that handles nullable user_id
-- For account members: household_id + user_id must be unique
-- For non-account members: household_id + name must be unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'household_members_unique_account'
  ) THEN
    CREATE UNIQUE INDEX household_members_unique_account 
      ON household_members(household_id, user_id) 
      WHERE user_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'household_members_unique_name'
  ) THEN
    CREATE UNIQUE INDEX household_members_unique_name 
      ON household_members(household_id, lower(trim(name))) 
      WHERE user_id IS NULL;
  END IF;
END $$;

-- Update RLS policy for inserting members to allow admins to create non-account members
DROP POLICY IF EXISTS "Users can add themselves to households" ON household_members;

CREATE POLICY "Users can add themselves to households"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to add themselves
    (user_id = auth.uid())
    OR
    -- Allow admins to add non-account members
    (
      user_id IS NULL 
      AND EXISTS (
        SELECT 1 FROM household_members hm
        WHERE hm.household_id = household_members.household_id
        AND hm.user_id = auth.uid()
        AND hm.role = 'admin'
      )
    )
  );

-- Update delete policy to allow admins to remove non-account members
DROP POLICY IF EXISTS "Admins can manage household members" ON household_members;

CREATE POLICY "Admins can manage household members"
  ON household_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
    OR
    -- Users can remove themselves
    (household_members.user_id = auth.uid())
  );