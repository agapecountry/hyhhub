/*
  # Create Default Household for New Users

  1. Changes
    - Update handle_new_user() function to automatically create a default household
    - Create a household_member record with admin role
    - This ensures new users can immediately use account features

  2. Security
    - Maintains existing RLS policies
    - New users get admin role in their default household
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_household_id uuid;
BEGIN
  -- Insert user record
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  
  -- Create default household for the user
  INSERT INTO public.households (name, created_by)
  VALUES ('My Household', new.id)
  RETURNING id INTO new_household_id;
  
  -- Add user as admin member of the household
  INSERT INTO public.household_members (household_id, user_id, role, display_name, color)
  VALUES (new_household_id, new.id, 'admin', COALESCE(split_part(new.email, '@', 1), 'Me'), '#3b82f6');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
