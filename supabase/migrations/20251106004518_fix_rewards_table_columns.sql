/*
  # Fix Rewards Table Schema

  1. Changes
    - Rename `points_cost` column to `cost` for consistency
    - Add `icon` column to store reward emoji/icon
    - Add `available` column to track if reward is active
    
  2. Notes
    - Uses safe ALTER TABLE operations with IF EXISTS checks
    - Preserves existing data
*/

DO $$
BEGIN
  -- Rename points_cost to cost if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rewards' AND column_name = 'points_cost'
  ) THEN
    ALTER TABLE rewards RENAME COLUMN points_cost TO cost;
  END IF;

  -- Add icon column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rewards' AND column_name = 'icon'
  ) THEN
    ALTER TABLE rewards ADD COLUMN icon text DEFAULT '🎁' NOT NULL;
  END IF;

  -- Add available column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rewards' AND column_name = 'available'
  ) THEN
    ALTER TABLE rewards ADD COLUMN available boolean DEFAULT true NOT NULL;
  END IF;
END $$;
