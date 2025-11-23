/*
  # Fix pantry_items location column

  1. Changes
    - Make the old `location` column nullable since we now use `location_id`
    - This allows inserts with only `location_id` to succeed
  
  2. Notes
    - The `location` column was kept for backward compatibility but is no longer the primary way to store location data
    - The `location_id` foreign key to `pantry_locations` is now the correct way to reference locations
*/

-- Make the location column nullable
ALTER TABLE pantry_items ALTER COLUMN location DROP NOT NULL;
