/*
  # Optimize RLS Policies for Performance

  ## Overview
  Optimizes all RLS policies by wrapping auth.uid() calls with SELECT.
  This prevents re-evaluation of auth.uid() for each row, significantly improving performance.

  ## Changes
  - Drop and recreate all existing RLS policies with optimized auth.uid() calls
  - Uses (select auth.uid()) instead of auth.uid() directly
  - Removes duplicate policies where they exist

  ## Important Notes
  - This migration affects all tables with RLS policies
  - Performance improvement is significant at scale
  - Security rules remain exactly the same
*/

-- Start with calendar_events (our recently created table)
DROP POLICY IF EXISTS "Household members can view events" ON calendar_events;
DROP POLICY IF EXISTS "Household members can create events" ON calendar_events;
DROP POLICY IF EXISTS "Creator and assigned members can update events" ON calendar_events;
DROP POLICY IF EXISTS "Only creator can delete events" ON calendar_events;

CREATE POLICY "Household members can view events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Household members can create events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = (select auth.uid())
    )
    AND created_by = (select auth.uid())
  );

CREATE POLICY "Creator and assigned members can update events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = (select auth.uid())
      AND (
        calendar_events.assigned_to @> ARRAY[hm.id]
        OR hm.role = 'admin'
      )
    )
  )
  WITH CHECK (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = (select auth.uid())
      AND (
        calendar_events.assigned_to @> ARRAY[hm.id]
        OR hm.role = 'admin'
      )
    )
  );

CREATE POLICY "Only creator can delete events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- users table
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Authenticated users can read all user emails" ON users;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Authenticated users can read all user emails"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- household_invites table
DROP POLICY IF EXISTS "Household members can view household invites" ON household_invites;
DROP POLICY IF EXISTS "Anyone can read invite by code" ON household_invites;
DROP POLICY IF EXISTS "Household members can create invites" ON household_invites;
DROP POLICY IF EXISTS "Anyone can mark invite as used" ON household_invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON household_invites;

CREATE POLICY "Anyone can read invite by code"
  ON household_invites
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Household members can create invites"
  ON household_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_invites.household_id
      AND hm.user_id = (select auth.uid())
    )
    AND created_by = (select auth.uid())
  );

CREATE POLICY "Anyone can mark invite as used"
  ON household_invites
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (used_by = (select auth.uid()));

CREATE POLICY "Admins can delete invites"
  ON household_invites
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_invites.household_id
      AND hm.user_id = (select auth.uid())
      AND hm.role = 'admin'
    )
  );

-- household_members table
DROP POLICY IF EXISTS "Users can add themselves to households" ON household_members;
DROP POLICY IF EXISTS "Users can insert themselves as members" ON household_members;
DROP POLICY IF EXISTS "Admins can manage household members" ON household_members;
DROP POLICY IF EXISTS "Admins can delete members" ON household_members;
DROP POLICY IF EXISTS "Admins can update household members" ON household_members;

CREATE POLICY "Users can insert themselves as members"
  ON household_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can manage household members"
  ON household_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = (select auth.uid())
      AND hm.role = 'admin'
    )
  );

CREATE POLICY "Admins can update household members"
  ON household_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = (select auth.uid())
      AND hm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = (select auth.uid())
      AND hm.role = 'admin'
    )
  );