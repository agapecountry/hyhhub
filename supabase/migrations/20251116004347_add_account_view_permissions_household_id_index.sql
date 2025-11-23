/*
  # Add Missing Foreign Key Index

  1. Changes
    - Add index on account_view_permissions.household_id
  
  2. Performance
    - Improves JOIN performance with households table
    - Optimizes foreign key constraint checks
    - Speeds up queries filtering by household_id
*/

CREATE INDEX IF NOT EXISTS idx_account_view_permissions_household_id 
  ON account_view_permissions(household_id);
