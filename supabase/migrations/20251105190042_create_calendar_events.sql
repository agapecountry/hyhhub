/*
  # Create Calendar Events Table

  ## Overview
  Creates a calendar_events table for managing household events and appointments.

  ## Changes

  1. New Tables
    - `calendar_events`
      - `id` (uuid, primary key) - Unique event identifier
      - `household_id` (uuid, foreign key) - Links to households table
      - `title` (text, required) - Event title
      - `description` (text, optional) - Event details
      - `start_time` (timestamptz, required) - Event start date/time
      - `end_time` (timestamptz, optional) - Event end date/time
      - `all_day` (boolean) - Whether event is all-day
      - `location` (text, optional) - Event location
      - `color` (text) - Display color for event
      - `created_by` (uuid, foreign key) - User who created the event
      - `assigned_to` (uuid[], optional) - Array of household_member ids
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on calendar_events
    - Add policy for household members to view events
    - Add policy for household members to create events
    - Add policy for event creator and admins to update events
    - Add policy for event creator and admins to delete events

  ## Important Notes
  - Events are shared across the entire household
  - Members can assign events to specific household members
  - Default color system for visual organization
*/

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  all_day boolean DEFAULT false,
  location text,
  color text DEFAULT '#3B82F6',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to uuid[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy: Household members can view all events in their household
CREATE POLICY "Household members can view events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = auth.uid()
    )
  );

-- Policy: Household members can create events
CREATE POLICY "Household members can create events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Policy: Event creator and admins can update events
CREATE POLICY "Event creator and admins can update events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

-- Policy: Event creator and admins can delete events
CREATE POLICY "Event creator and admins can delete events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_household_id ON calendar_events(household_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);