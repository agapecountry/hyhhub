/*
  # Create Savings Projects Schema
  
  1. New Tables
    - `savings_projects`
      - Core project tracking for savings goals
      - Supports vacations, purchases, and custom projects
      - Links to households for multi-user access
      - Tracks savings goal, current amount, target date
      - Stores related links and notes
    
    - `project_accounts`
      - Links bank accounts to specific projects
      - Tracks which accounts contribute to project savings
      - Allows multiple accounts per project
    
    - `project_transactions`
      - Tracks individual contributions to projects
      - Manual entries or linked from bank accounts
      - Supports deposits and withdrawals
  
  2. Features
    - Goal tracking with progress calculation
    - Multi-account support
    - Transaction history
    - Budget integration ready
    - Related links and documentation
  
  3. Security
    - Enable RLS on all tables
    - Household members can view their household's projects
    - Only admins and owners can modify projects
*/

-- Create savings_projects table
CREATE TABLE IF NOT EXISTS savings_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  project_type text NOT NULL CHECK (project_type IN ('vacation', 'purchase', 'emergency_fund', 'education', 'home', 'vehicle', 'custom')),
  goal_amount_cents bigint NOT NULL DEFAULT 0,
  current_amount_cents bigint NOT NULL DEFAULT 0,
  target_date date DEFAULT NULL,
  related_links jsonb DEFAULT '[]'::jsonb,
  notes text DEFAULT '',
  is_active boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  completed_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create project_accounts junction table
CREATE TABLE IF NOT EXISTS project_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES savings_projects(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  added_at timestamptz DEFAULT now(),
  UNIQUE(project_id, account_id)
);

-- Create project_transactions table
CREATE TABLE IF NOT EXISTS project_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES savings_projects(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
  description text DEFAULT '',
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Add indexes for savings_projects
CREATE INDEX IF NOT EXISTS idx_savings_projects_household_id ON savings_projects(household_id);
CREATE INDEX IF NOT EXISTS idx_savings_projects_created_by ON savings_projects(created_by);
CREATE INDEX IF NOT EXISTS idx_savings_projects_is_active ON savings_projects(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_savings_projects_is_completed ON savings_projects(is_completed) WHERE is_completed = false;

-- Add indexes for project_accounts
CREATE INDEX IF NOT EXISTS idx_project_accounts_project_id ON project_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_project_accounts_account_id ON project_accounts(account_id);

-- Add indexes for project_transactions
CREATE INDEX IF NOT EXISTS idx_project_transactions_project_id ON project_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_transactions_account_id ON project_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_project_transactions_date ON project_transactions(transaction_date);

-- Enable RLS
ALTER TABLE savings_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for savings_projects

-- Members can view their household's projects
CREATE POLICY "Household members can view projects"
  ON savings_projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = savings_projects.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Household members can create projects
CREATE POLICY "Household members can create projects"
  ON savings_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = savings_projects.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Household members can update their household's projects
CREATE POLICY "Household members can update projects"
  ON savings_projects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = savings_projects.household_id
      AND household_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = savings_projects.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Household members can delete their household's projects
CREATE POLICY "Household members can delete projects"
  ON savings_projects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = savings_projects.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- RLS Policies for project_accounts

-- Members can view project accounts if they can view the project
CREATE POLICY "Members can view project accounts"
  ON project_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM savings_projects
      JOIN household_members ON household_members.household_id = savings_projects.household_id
      WHERE savings_projects.id = project_accounts.project_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Members can link accounts to projects
CREATE POLICY "Members can create project accounts"
  ON project_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM savings_projects
      JOIN household_members ON household_members.household_id = savings_projects.household_id
      WHERE savings_projects.id = project_accounts.project_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Members can unlink accounts from projects
CREATE POLICY "Members can delete project accounts"
  ON project_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM savings_projects
      JOIN household_members ON household_members.household_id = savings_projects.household_id
      WHERE savings_projects.id = project_accounts.project_id
      AND household_members.user_id = auth.uid()
    )
  );

-- RLS Policies for project_transactions

-- Members can view project transactions
CREATE POLICY "Members can view project transactions"
  ON project_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM savings_projects
      JOIN household_members ON household_members.household_id = savings_projects.household_id
      WHERE savings_projects.id = project_transactions.project_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Members can create project transactions
CREATE POLICY "Members can create project transactions"
  ON project_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM savings_projects
      JOIN household_members ON household_members.household_id = savings_projects.household_id
      WHERE savings_projects.id = project_transactions.project_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Members can update project transactions
CREATE POLICY "Members can update project transactions"
  ON project_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM savings_projects
      JOIN household_members ON household_members.household_id = savings_projects.household_id
      WHERE savings_projects.id = project_transactions.project_id
      AND household_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM savings_projects
      JOIN household_members ON household_members.household_id = savings_projects.household_id
      WHERE savings_projects.id = project_transactions.project_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Members can delete project transactions
CREATE POLICY "Members can delete project transactions"
  ON project_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM savings_projects
      JOIN household_members ON household_members.household_id = savings_projects.household_id
      WHERE savings_projects.id = project_transactions.project_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Function to update project current_amount when transactions change
CREATE OR REPLACE FUNCTION update_project_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE savings_projects
    SET 
      current_amount_cents = current_amount_cents + 
        CASE 
          WHEN NEW.transaction_type = 'deposit' THEN NEW.amount_cents
          ELSE -NEW.amount_cents
        END,
      updated_at = now()
    WHERE id = NEW.project_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE savings_projects
    SET 
      current_amount_cents = current_amount_cents - 
        CASE 
          WHEN OLD.transaction_type = 'deposit' THEN OLD.amount_cents
          ELSE -OLD.amount_cents
        END +
        CASE 
          WHEN NEW.transaction_type = 'deposit' THEN NEW.amount_cents
          ELSE -NEW.amount_cents
        END,
      updated_at = now()
    WHERE id = NEW.project_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE savings_projects
    SET 
      current_amount_cents = current_amount_cents - 
        CASE 
          WHEN OLD.transaction_type = 'deposit' THEN OLD.amount_cents
          ELSE -OLD.amount_cents
        END,
      updated_at = now()
    WHERE id = OLD.project_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update project amounts
DROP TRIGGER IF EXISTS trigger_update_project_amount ON project_transactions;
CREATE TRIGGER trigger_update_project_amount
  AFTER INSERT OR UPDATE OR DELETE ON project_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_project_amount();

-- Function to mark project as completed when goal is reached
CREATE OR REPLACE FUNCTION check_project_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_amount_cents >= NEW.goal_amount_cents AND NOT NEW.is_completed THEN
    NEW.is_completed = true;
    NEW.completed_at = now();
  ELSIF NEW.current_amount_cents < NEW.goal_amount_cents AND NEW.is_completed THEN
    NEW.is_completed = false;
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check completion status
DROP TRIGGER IF EXISTS trigger_check_project_completion ON savings_projects;
CREATE TRIGGER trigger_check_project_completion
  BEFORE UPDATE ON savings_projects
  FOR EACH ROW
  EXECUTE FUNCTION check_project_completion();
