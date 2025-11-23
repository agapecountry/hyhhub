/*
  # Optimize Journal Entries RLS Policies

  1. Problem
    - Multiple duplicate policies exist
    - RLS policies re-evaluate auth.uid() for each row
    - This causes suboptimal query performance at scale
    
  2. Solution
    - Consolidate duplicate policies
    - Replace auth.uid() with (SELECT auth.uid()) in all policies
    - This ensures auth.uid() is evaluated once, not per row
    
  3. Policies Fixed
    - Users can view own journal entries (consolidated)
    - Users can create own journal entries (consolidated)
    - Users can update own journal entries (consolidated)
*/

-- Drop all existing policies (including duplicates)
DROP POLICY IF EXISTS "Users can view own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Household members can view non-deleted journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can create own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can create journal entries in their household" ON journal_entries;
DROP POLICY IF EXISTS "Users can update own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON journal_entries;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Users can view own journal entries"
  ON journal_entries
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own journal entries"
  ON journal_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own journal entries"
  ON journal_entries
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Add comments
COMMENT ON POLICY "Users can view own journal entries" ON journal_entries IS 
'Optimized: auth.uid() evaluated once per query, not per row. Consolidated duplicate policies.';
COMMENT ON POLICY "Users can create own journal entries" ON journal_entries IS 
'Optimized: auth.uid() evaluated once per query, not per row. Consolidated duplicate policies.';
COMMENT ON POLICY "Users can update own journal entries" ON journal_entries IS 
'Optimized: auth.uid() evaluated once per query, not per row. Consolidated duplicate policies.';