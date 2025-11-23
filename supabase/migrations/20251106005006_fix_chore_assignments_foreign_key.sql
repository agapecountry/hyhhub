/*
  # Fix Chore Assignments Foreign Key

  1. Changes
    - Drop the existing foreign key constraint that references auth.users
    - Add new foreign key constraint that references household_members
    - This allows assigning chores to any household member (including non-account members)
  
  2. Notes
    - Uses safe operations to handle constraint changes
    - Preserves existing data if the member IDs are valid
*/

-- Drop the old foreign key constraint
ALTER TABLE chore_assignments
DROP CONSTRAINT IF EXISTS chore_assignments_assigned_to_fkey;

-- There's also a typo in the constraint name, so drop that too if it exists
ALTER TABLE chore_assignments
DROP CONSTRAINT IF EXISTS chore_assisgnments_assigned_to_fkey;

-- Add the correct foreign key constraint pointing to household_members
ALTER TABLE chore_assignments
ADD CONSTRAINT chore_assignments_assigned_to_fkey
FOREIGN KEY (assigned_to)
REFERENCES household_members(id)
ON DELETE CASCADE;
