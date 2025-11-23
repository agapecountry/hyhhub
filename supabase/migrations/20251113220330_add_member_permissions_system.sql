/*
  # Add Member Permissions System

  1. Purpose
    - Implement granular permission control for household members
    - Enforce subscription tier limits on account members
    - Allow admins to control which app sections each member can access

  2. New Tables
    - `member_permissions` - stores which app sections each member can access
    - `app_sections` - defines all available app sections

  3. Changes
    - Add permission checking for each major app section
    - Add functions to validate member limits based on subscription tier
    - Add RLS policies to enforce permissions

  4. App Sections
    - dashboard (always accessible)
    - accounts
    - budget
    - debt
    - calendar
    - meals
    - pantry
    - chores
    - projects

  5. Subscription Tier Member Limits
    - free: 1 account member
    - basic: 1 account member
    - premium: 4 account members
    - elite: 8 account members
    - All tiers: unlimited non-account members
*/

-- Create app_sections table (reference table)
CREATE TABLE IF NOT EXISTS app_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  icon text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_sections ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can view app sections" ON app_sections;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- App sections are read-only for everyone
CREATE POLICY "Anyone can view app sections"
  ON app_sections FOR SELECT
  TO authenticated
  USING (true);

-- Insert default app sections
INSERT INTO app_sections (name, display_name, description, icon, is_default) VALUES
  ('dashboard', 'Dashboard', 'Main dashboard overview', '📊', true),
  ('accounts', 'Accounts', 'Financial accounts and transactions', '💳', false),
  ('budget', 'Budget', 'Budget planning and tracking', '💰', false),
  ('debt', 'Debt', 'Debt tracking and payoff planning', '📉', false),
  ('calendar', 'Calendar', 'Family calendar and events', '📅', false),
  ('meals', 'Meals', 'Meal planning and recipes', '🍽️', false),
  ('pantry', 'Pantry', 'Pantry inventory management', '🥫', false),
  ('chores', 'Chores', 'Chore assignments and rewards', '✅', false),
  ('projects', 'Projects', 'Savings projects and goals', '🎯', false)
ON CONFLICT (name) DO NOTHING;

-- Create member_permissions table
CREATE TABLE IF NOT EXISTS member_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES household_members(id) ON DELETE CASCADE,
  section_name text NOT NULL REFERENCES app_sections(name) ON DELETE CASCADE,
  can_view boolean DEFAULT true,
  can_edit boolean DEFAULT false,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id, section_name)
);

CREATE INDEX IF NOT EXISTS idx_member_permissions_member ON member_permissions(member_id);
CREATE INDEX IF NOT EXISTS idx_member_permissions_household ON member_permissions(household_id);
CREATE INDEX IF NOT EXISTS idx_member_permissions_section ON member_permissions(section_name);

ALTER TABLE member_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view permissions in their households" ON member_permissions;
  DROP POLICY IF EXISTS "Admins can manage permissions" ON member_permissions;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- RLS Policies for member_permissions
CREATE POLICY "Users can view permissions in their households"
  ON member_permissions FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage permissions"
  ON member_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_permissions.household_id
        AND household_members.user_id = auth.uid()
        AND household_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_permissions.household_id
        AND household_members.user_id = auth.uid()
        AND household_members.role = 'admin'
    )
  );

-- Function to check if user has permission for a section
CREATE OR REPLACE FUNCTION has_section_permission(
  p_household_id uuid,
  p_user_id uuid,
  p_section_name text,
  p_permission_type text DEFAULT 'view'
)
RETURNS boolean AS $$
DECLARE
  v_member_id uuid;
  v_is_admin boolean;
  v_has_permission boolean;
BEGIN
  -- Get member record
  SELECT id, (role = 'admin') INTO v_member_id, v_is_admin
  FROM household_members
  WHERE household_id = p_household_id
    AND user_id = p_user_id
  LIMIT 1;

  -- If not a member, no access
  IF v_member_id IS NULL THEN
    RETURN false;
  END IF;

  -- Admins have all permissions
  IF v_is_admin THEN
    RETURN true;
  END IF;

  -- Dashboard is always accessible
  IF p_section_name = 'dashboard' THEN
    RETURN true;
  END IF;

  -- Check specific permission
  IF p_permission_type = 'edit' THEN
    SELECT can_edit INTO v_has_permission
    FROM member_permissions
    WHERE member_id = v_member_id
      AND section_name = p_section_name;
  ELSE
    SELECT can_view INTO v_has_permission
    FROM member_permissions
    WHERE member_id = v_member_id
      AND section_name = p_section_name;
  END IF;

  -- If no permission record exists, default to no access
  RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION has_section_permission(uuid, uuid, text, text) TO authenticated;

-- Function to get account member limit for a household
CREATE OR REPLACE FUNCTION get_account_member_limit(p_household_id uuid)
RETURNS integer AS $$
DECLARE
  v_tier_name text;
  v_limit integer;
BEGIN
  -- Get current subscription tier
  SELECT st.name INTO v_tier_name
  FROM household_subscriptions hs
  JOIN subscription_tiers st ON hs.tier_id = st.id
  WHERE hs.household_id = p_household_id
    AND hs.status = 'active'
  ORDER BY hs.current_period_start DESC
  LIMIT 1;

  -- Default to free tier if no subscription
  v_tier_name := COALESCE(v_tier_name, 'free');

  -- Return limit based on tier
  CASE v_tier_name
    WHEN 'free' THEN v_limit := 1;
    WHEN 'basic' THEN v_limit := 1;
    WHEN 'premium' THEN v_limit := 4;
    WHEN 'infprem' THEN v_limit := 4;
    WHEN 'elite' THEN v_limit := 8;
    WHEN 'infelite' THEN v_limit := 8;
    ELSE v_limit := 1;
  END CASE;

  RETURN v_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION get_account_member_limit(uuid) TO authenticated;

-- Function to check if household can add more account members
CREATE OR REPLACE FUNCTION can_add_account_member(p_household_id uuid)
RETURNS boolean AS $$
DECLARE
  v_current_count integer;
  v_limit integer;
BEGIN
  -- Get current count of account members
  SELECT COUNT(*) INTO v_current_count
  FROM household_members
  WHERE household_id = p_household_id
    AND is_account_member = true;

  -- Get limit for this household
  v_limit := get_account_member_limit(p_household_id);

  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION can_add_account_member(uuid) TO authenticated;

-- Function to initialize default permissions for new members
CREATE OR REPLACE FUNCTION initialize_member_permissions()
RETURNS trigger AS $$
BEGIN
  -- Only initialize for admin members or if explicitly set
  IF NEW.role = 'admin' THEN
    -- Admins get all permissions by default (though they bypass checks anyway)
    INSERT INTO member_permissions (household_id, member_id, section_name, can_view, can_edit)
    SELECT NEW.household_id, NEW.id, name, true, true
    FROM app_sections
    ON CONFLICT (member_id, section_name) DO NOTHING;
  ELSIF NEW.is_account_member THEN
    -- Account members get dashboard access only by default
    INSERT INTO member_permissions (household_id, member_id, section_name, can_view, can_edit)
    SELECT NEW.household_id, NEW.id, name, true, false
    FROM app_sections
    WHERE is_default = true
    ON CONFLICT (member_id, section_name) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Create trigger for initializing permissions
DROP TRIGGER IF EXISTS initialize_member_permissions_trigger ON household_members;
CREATE TRIGGER initialize_member_permissions_trigger
  AFTER INSERT ON household_members
  FOR EACH ROW
  EXECUTE FUNCTION initialize_member_permissions();

-- Update existing admin members with full permissions
DO $$
DECLARE
  admin_member RECORD;
BEGIN
  FOR admin_member IN 
    SELECT id, household_id FROM household_members WHERE role = 'admin'
  LOOP
    INSERT INTO member_permissions (household_id, member_id, section_name, can_view, can_edit)
    SELECT admin_member.household_id, admin_member.id, name, true, true
    FROM app_sections
    ON CONFLICT (member_id, section_name) DO NOTHING;
  END LOOP;
END $$;
