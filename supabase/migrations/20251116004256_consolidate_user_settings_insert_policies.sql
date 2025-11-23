/*
  # Consolidate User Settings INSERT Policies

  1. Changes
    - Drop duplicate INSERT policies for authenticated users
    - Create single policy for user inserts
    - Keep service role and postgres policies separate
  
  2. Security
    - Users can only insert their own settings
    - Maintains same security as before
  
  3. Performance
    - Eliminates duplicate policy evaluation
*/

-- Drop duplicate authenticated user INSERT policies
DROP POLICY IF EXISTS "Users can create own settings during signup" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;

-- Create single consolidated INSERT policy for authenticated users
CREATE POLICY "Users can insert own settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
