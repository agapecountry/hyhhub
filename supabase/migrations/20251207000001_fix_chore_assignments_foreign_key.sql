/*
  # Fix chore_assignments assigned_to foreign key

  1. Problem
    - assigned_to currently references auth.users(id) but code uses household_members.id
    - assigned_to is NOT NULL but code needs to allow NULL for "open" assignments

  2. Solution
    - Drop the existing foreign key constraint
    - Add new foreign key referencing household_members(id)
    - Allow NULL values for open/unassigned chores
*/

-- First, drop the existing foreign key constraint on assigned_to
ALTER TABLE chore_assignments 
  DROP CONSTRAINT IF EXISTS chore_assignments_assigned_to_fkey;

-- Allow NULL values for assigned_to (for open assignments)
ALTER TABLE chore_assignments 
  ALTER COLUMN assigned_to DROP NOT NULL;

-- Add new foreign key referencing household_members instead of auth.users
ALTER TABLE chore_assignments
  ADD CONSTRAINT chore_assignments_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES household_members(id) ON DELETE SET NULL;

-- Also fix claimed_by if it exists and references auth.users
ALTER TABLE chore_assignments 
  DROP CONSTRAINT IF EXISTS chore_assignments_claimed_by_fkey;

-- Add claimed_by column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chore_assignments' AND column_name = 'claimed_by'
  ) THEN
    ALTER TABLE chore_assignments ADD COLUMN claimed_by uuid REFERENCES household_members(id) ON DELETE SET NULL;
    ALTER TABLE chore_assignments ADD COLUMN claimed_at timestamptz;
  ELSE
    -- Update existing claimed_by to reference household_members
    ALTER TABLE chore_assignments
      ADD CONSTRAINT chore_assignments_claimed_by_fkey 
      FOREIGN KEY (claimed_by) REFERENCES household_members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_chore_assignments_assigned_to 
  ON chore_assignments(assigned_to);
