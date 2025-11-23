/*
  # Fix transactions category foreign key

  1. Changes
    - Set invalid category_id values to NULL (orphaned references)
    - Drop the incorrect foreign key constraint that references `categories` table
    - Add correct foreign key constraint that references `transaction_categories` table
  
  2. Security
    - No security changes, only fixing the foreign key reference
*/

-- First, set any invalid category_id values to NULL
UPDATE transactions 
SET category_id = NULL 
WHERE category_id IS NOT NULL 
AND category_id NOT IN (SELECT id FROM transaction_categories);

-- Drop the incorrect foreign key constraint
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;

-- Add the correct foreign key constraint pointing to transaction_categories
ALTER TABLE transactions 
ADD CONSTRAINT transactions_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES transaction_categories(id) 
ON DELETE SET NULL;
