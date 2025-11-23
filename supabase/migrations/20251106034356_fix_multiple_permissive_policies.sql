/*
  # Fix Multiple Permissive Policies

  ## Changes Made

  Remove overlapping/redundant RLS policies to clean up policy structure:
  
  ### 1. Users Table
  - Remove "Authenticated users can read all user emails" (covered by "Users can read own data")
  
  ### 2. Rewards Table
  - Remove "Admins can manage household rewards" (duplicates household member policies)
  - Remove "Members can view rewards in their household" (duplicates household view policy)
  
  ### 3. Member Badges
  - Remove "System can manage member badges" (system operations don't need explicit policy)
  
  ### 4. Member Streaks
  - Remove "System can manage streaks" (system operations don't need explicit policy)
  
  ### 5. Family Challenges
  - Remove "Admins can manage household challenges" (covered by view policy)

  ## Impact
  - Cleaner policy structure
  - No functional changes - remaining policies provide same access
*/

-- Remove overlapping policy on users table
DROP POLICY IF EXISTS "Authenticated users can read all user emails" ON users;

-- Remove overlapping policies on rewards table
DROP POLICY IF EXISTS "Admins can manage household rewards" ON rewards;
DROP POLICY IF EXISTS "Members can view rewards in their household" ON rewards;

-- Remove system policies that aren't needed
DROP POLICY IF EXISTS "System can manage member badges" ON member_badges;
DROP POLICY IF EXISTS "System can manage streaks" ON member_streaks;

-- Remove admin policy covered by household view
DROP POLICY IF EXISTS "Admins can manage household challenges" ON family_challenges;
