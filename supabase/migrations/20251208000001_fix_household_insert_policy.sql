/*
  # Fix Household Insert Policy
  
  Ensures authenticated users can create new households.
  This policy may have been dropped or not applied correctly.
*/

-- First, check if RLS is enabled (it should be)
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing insert policies to avoid conflicts
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'households' 
    AND schemaname = 'public'
    AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.households', pol.policyname);
  END LOOP;
END $$;

-- Create a single, clear INSERT policy for authenticated users
CREATE POLICY "authenticated_users_can_create_households"
  ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Grant necessary permissions
GRANT INSERT ON public.households TO authenticated;
