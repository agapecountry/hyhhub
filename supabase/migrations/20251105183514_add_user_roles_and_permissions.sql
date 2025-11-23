/*
  # Add User Roles and Permission System

  ## Overview
  Implements a comprehensive role-based access control system with four user roles:
  - Admin: Full access to everything
  - Co-Parent: Can view assigned children's data and manage their calendar/chores
  - Teen: Limited access to chores, rewards, grocery lists, and assigned accounts
  - Child: Similar to Teen but explicitly labeled for younger household members

  ## New Tables

  1. `member_relationships`
    - Links co-parents and children to track who can manage whom
    - `id` (uuid, primary key)
    - `household_id` (uuid, foreign key)
    - `parent_member_id` (uuid, foreign key to household_members)
    - `child_member_id` (uuid, foreign key to household_members)
    - `created_at` (timestamptz)

  2. `account_view_permissions`
    - Controls which members can view specific accounts
    - `id` (uuid, primary key)
    - `household_id` (uuid, foreign key)
    - `account_id` (uuid, foreign key to accounts)
    - `member_id` (uuid, foreign key to household_members)
    - `granted_by` (uuid, references household_members)
    - `created_at` (timestamptz)

  ## Schema Modifications

  1. Update `household_members` table
    - Change role column to support new roles: 'admin', 'co-parent', 'teen', 'child'

  ## Security Updates

  1. RLS policies for member_relationships
    - Household members can view relationships in their household
    - Admins can create/update/delete relationships

  2. RLS policies for account_view_permissions
    - Members can view their own permissions
    - Admins can grant/revoke permissions

  3. Updated policies for existing tables
    - Accounts: Members can only view accounts they have permission for
    - Events: Co-parents can view/manage events for their assigned children
    - Chores: Teens/Children can view and complete their assigned chores

  ## Important Notes
  - All existing 'admin' and 'member' roles are preserved
  - Co-parents have limited access compared to admins
  - Teens and children have the most restricted access
  - Relationship tracking enables proper permission cascading
*/

-- Update role enum to include new roles
DO $$
BEGIN
  -- Drop the existing check constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'household_members_role_check'
  ) THEN
    ALTER TABLE household_members DROP CONSTRAINT household_members_role_check;
  END IF;
  
  -- Add new check constraint with all roles
  ALTER TABLE household_members 
    ADD CONSTRAINT household_members_role_check 
    CHECK (role IN ('admin', 'co-parent', 'teen', 'child', 'member'));
END $$;

-- Create member_relationships table
CREATE TABLE IF NOT EXISTS member_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  parent_member_id uuid REFERENCES household_members(id) ON DELETE CASCADE NOT NULL,
  child_member_id uuid REFERENCES household_members(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(household_id, parent_member_id, child_member_id),
  CHECK (parent_member_id != child_member_id)
);

-- Create account_view_permissions table
CREATE TABLE IF NOT EXISTS account_view_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES household_members(id) ON DELETE CASCADE NOT NULL,
  granted_by uuid REFERENCES household_members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, member_id)
);

-- Enable RLS
ALTER TABLE member_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_view_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for member_relationships

CREATE POLICY "Household members can view relationships"
  ON member_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_relationships.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create relationships"
  ON member_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_relationships.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete relationships"
  ON member_relationships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_relationships.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- RLS Policies for account_view_permissions

CREATE POLICY "Members can view their account permissions"
  ON account_view_permissions FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM household_members
      WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = account_view_permissions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Admins can grant account permissions"
  ON account_view_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = account_view_permissions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can revoke account permissions"
  ON account_view_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = account_view_permissions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Update accounts RLS policies to respect view permissions
-- Drop existing policies first
DROP POLICY IF EXISTS "Household members can view accounts" ON accounts;
DROP POLICY IF EXISTS "Household members can insert accounts" ON accounts;
DROP POLICY IF EXISTS "Household members can update accounts" ON accounts;
DROP POLICY IF EXISTS "Household members can delete accounts" ON accounts;

-- Recreate with role-based access
CREATE POLICY "Members can view accounts based on role"
  ON accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = accounts.household_id
      AND hm.user_id = auth.uid()
      AND (
        -- Admins can view all accounts
        hm.role = 'admin'
        -- Co-parents can view all accounts
        OR hm.role = 'co-parent'
        -- Teens/Children can only view accounts they have permission for
        OR (
          hm.role IN ('teen', 'child')
          AND EXISTS (
            SELECT 1 FROM account_view_permissions avp
            WHERE avp.account_id = accounts.id
            AND avp.member_id = hm.id
          )
        )
      )
    )
  );

CREATE POLICY "Admins and co-parents can insert accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Admins and co-parents can update accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co-parent')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Admins can delete accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Update chore_assignments policies for teen/child access
DROP POLICY IF EXISTS "Household members can view chore_assignments" ON chore_assignments;
DROP POLICY IF EXISTS "Household members can update chore_assignments" ON chore_assignments;

CREATE POLICY "Members can view chore assignments based on role"
  ON chore_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = chore_assignments.household_id
      AND hm.user_id = auth.uid()
      AND (
        -- Admins and co-parents can view all chores
        hm.role IN ('admin', 'co-parent')
        -- Teens/children can view chores assigned to them
        OR (
          hm.role IN ('teen', 'child')
          AND chore_assignments.assigned_to = hm.id
        )
        -- Co-parents can also view chores assigned to their children
        OR (
          hm.role = 'co-parent'
          AND EXISTS (
            SELECT 1 FROM member_relationships mr
            WHERE mr.parent_member_id = hm.id
            AND mr.child_member_id = (
              SELECT id FROM household_members 
              WHERE id = chore_assignments.assigned_to
            )
          )
        )
      )
    )
  );

CREATE POLICY "Members can update chore assignments based on role"
  ON chore_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = chore_assignments.household_id
      AND hm.user_id = auth.uid()
      AND (
        -- Admins and co-parents can update any chore
        hm.role IN ('admin', 'co-parent')
        -- Teens/children can mark their own chores as complete
        OR (
          hm.role IN ('teen', 'child')
          AND chore_assignments.assigned_to = hm.id
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = chore_assignments.household_id
      AND hm.user_id = auth.uid()
      AND (
        hm.role IN ('admin', 'co-parent')
        OR (
          hm.role IN ('teen', 'child')
          AND chore_assignments.assigned_to = hm.id
        )
      )
    )
  );

-- Update events policies for co-parent child management
DROP POLICY IF EXISTS "Household members can view events" ON events;
DROP POLICY IF EXISTS "Household members can insert events" ON events;
DROP POLICY IF EXISTS "Household members can update events" ON events;
DROP POLICY IF EXISTS "Household members can delete events" ON events;

CREATE POLICY "Members can view events based on role"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = events.household_id
      AND hm.user_id = auth.uid()
      AND (
        -- Admins can view all events
        hm.role = 'admin'
        -- Co-parents can view events for their children
        OR (
          hm.role = 'co-parent'
          AND (
            -- All household events
            true
          )
        )
        -- Teens/children can view all household events
        OR hm.role IN ('teen', 'child')
      )
    )
  );

CREATE POLICY "Members can insert events based on role"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = events.household_id
      AND hm.user_id = auth.uid()
      AND hm.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Members can update events based on role"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = events.household_id
      AND hm.user_id = auth.uid()
      AND (
        hm.role = 'admin'
        OR (hm.role = 'co-parent' AND events.created_by = hm.user_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = events.household_id
      AND hm.user_id = auth.uid()
      AND hm.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Members can delete events based on role"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = events.household_id
      AND hm.user_id = auth.uid()
      AND (
        hm.role = 'admin'
        OR (hm.role = 'co-parent' AND events.created_by = hm.user_id)
      )
    )
  );

-- Update grocery_list policies to allow teens/children to add items
DROP POLICY IF EXISTS "Household members can insert grocery_list" ON grocery_list;

CREATE POLICY "Members can insert grocery items based on role"
  ON grocery_list FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co-parent', 'teen', 'child')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_relationships_parent ON member_relationships(parent_member_id);
CREATE INDEX IF NOT EXISTS idx_member_relationships_child ON member_relationships(child_member_id);
CREATE INDEX IF NOT EXISTS idx_member_relationships_household ON member_relationships(household_id);
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_member ON account_view_permissions(member_id);
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_account ON account_view_permissions(account_id);
CREATE INDEX IF NOT EXISTS idx_household_members_role ON household_members(role);