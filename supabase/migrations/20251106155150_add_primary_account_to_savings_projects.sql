/*
  # Add Primary Account Field to Savings Projects

  1. Changes
    - Add `primary_account_id` column to `savings_projects` table
    - Links directly to an account for quick reference
    - Optional field (can be null)
    - Does not replace the `project_accounts` junction table
    - Used for default account selection in budgets and savings plans

  2. Notes
    - The `project_accounts` table still exists for tracking multiple accounts
    - This new field provides a convenient primary account reference
    - Foreign key constraint ensures referential integrity
*/

-- Add primary_account_id column to savings_projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'savings_projects' AND column_name = 'primary_account_id'
  ) THEN
    ALTER TABLE savings_projects 
    ADD COLUMN primary_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_savings_projects_primary_account_id 
  ON savings_projects(primary_account_id);
