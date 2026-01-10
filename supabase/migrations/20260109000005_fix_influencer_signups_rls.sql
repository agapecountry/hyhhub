/*
  # Fix Influencer Signups RLS Policy
  
  1. Analysis
    - Current policy allows any authenticated user to insert signups with any data
    - Signups should only be created by the user themselves for their own household
    - Need to restrict to ensure user_id matches the authenticated user
    
  2. Changes
    - Replace WITH CHECK (true) with proper restriction
    - Ensure user can only create signups for themselves
*/

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can insert signups" ON influencer_signups;

-- Create a more restrictive policy
-- Users can only create signup records for themselves
CREATE POLICY "Users can create own signups"
  ON influencer_signups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
  );
