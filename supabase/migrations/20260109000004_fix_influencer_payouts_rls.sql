/*
  # Fix Influencer Payouts RLS Policy
  
  1. Analysis
    - Current policy allows any authenticated user to insert payouts
    - Payouts are created automatically via trigger (create_influencer_payout_on_subscription)
    - The trigger runs with SECURITY DEFINER, bypassing RLS
    
  2. Changes
    - Restrict INSERT to only allow system/trigger to create payouts
    - Since trigger uses SECURITY DEFINER, it will bypass RLS anyway
    - Remove the overly permissive authenticated user INSERT policy
    - Keep the trigger-based creation as the only way to create payouts
*/

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can insert payouts" ON influencer_payouts;

-- No new INSERT policy needed
-- Payouts are created exclusively via the trigger function which uses SECURITY DEFINER
-- This ensures only the system can create payouts, not arbitrary authenticated users
