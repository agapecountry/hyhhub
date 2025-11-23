/*
  # Add Open Chore Pickup Feature

  1. Changes
    - Make assigned_to column nullable in chore_assignments
    - Add claimed_by column to track who claimed an open chore
    - Add claimed_at timestamp for audit trail
    
  2. Notes
    - NULL assigned_to means the chore is "Open for Pickup"
    - Once claimed, claimed_by is set to the member who claimed it
    - assigned_to gets updated to the claimed_by member
    - This allows tracking both original assignment and claims
*/

-- Make assigned_to nullable to allow open chores
ALTER TABLE chore_assignments
ALTER COLUMN assigned_to DROP NOT NULL;

-- Add claimed_by column to track who claimed an open chore
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chore_assignments' AND column_name = 'claimed_by'
  ) THEN
    ALTER TABLE chore_assignments ADD COLUMN claimed_by uuid REFERENCES household_members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add claimed_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chore_assignments' AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE chore_assignments ADD COLUMN claimed_at timestamptz;
  END IF;
END $$;

-- Create index for efficient queries of open chores
CREATE INDEX IF NOT EXISTS idx_chore_assignments_open_chores 
ON chore_assignments(household_id, assigned_to) 
WHERE assigned_to IS NULL AND completed = false;
