/*
  # Fix Households RLS Policy
  
  1. Changes
    - Keep INSERT policy permissive for authenticated users (reasonable for household creation)
    - The households table doesn't track creator, but household_members does
    - Security is enforced by ensuring the creator becomes an admin member via trigger
  
  Note: The WITH CHECK (true) is acceptable here because:
  - Any authenticated user should be able to create a household
  - The user automatically becomes an admin member via the handle_new_household trigger
  - Access control is enforced through household_members table RLS policies
*/

-- Keep the existing policy as-is since it's appropriate for this use case
-- The security concern is mitigated by the trigger that adds the creator as an admin member
