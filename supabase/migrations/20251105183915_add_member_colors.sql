/*
  # Add Color Coding for Household Members

  ## Overview
  Adds a color field to household members to enable visual identification
  in calendar events and other household activities.

  ## Changes

  1. Schema Modifications
    - Add `color` column to `household_members` table
    - Default color is a neutral blue shade
    - Color stored as hex code (e.g., '#3B82F6')

  ## Important Notes
  - Colors help visually distinguish members in calendar views
  - Each member gets a unique color for easy identification
  - Admins can change member colors at any time
*/

-- Add color column to household_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'household_members' AND column_name = 'color'
  ) THEN
    ALTER TABLE household_members ADD COLUMN color text DEFAULT '#3B82F6';
  END IF;
END $$;

-- Update existing members with varied default colors
DO $$
DECLARE
  member_record RECORD;
  color_index INTEGER := 0;
  colors TEXT[] := ARRAY[
    '#EF4444', -- Red
    '#F59E0B', -- Amber
    '#10B981', -- Emerald
    '#3B82F6', -- Blue
    '#8B5CF6', -- Violet
    '#EC4899', -- Pink
    '#14B8A6', -- Teal
    '#F97316', -- Orange
    '#6366F1', -- Indigo
    '#84CC16'  -- Lime
  ];
BEGIN
  FOR member_record IN 
    SELECT id FROM household_members WHERE color = '#3B82F6' OR color IS NULL
  LOOP
    UPDATE household_members 
    SET color = colors[(color_index % array_length(colors, 1)) + 1]
    WHERE id = member_record.id;
    
    color_index := color_index + 1;
  END LOOP;
END $$;