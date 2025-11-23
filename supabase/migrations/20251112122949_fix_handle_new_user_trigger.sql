/*
  # Fix handle_new_user Function - Correct Column Names
  
  1. Purpose
    - Fix the handle_new_user() function to use correct column names
    - household_members uses 'name' not 'display_name'
    - Ensure user_settings insert works properly
    
  2. Changes
    - Update handle_new_user() to use 'name' column in household_members
    - Properly insert into user_settings with household_id
    - Set is_account_member to true for the primary user
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  default_household_id UUID;
  user_name TEXT;
BEGIN
  -- Get user name from metadata or email
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  -- Create user entry
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, user_name);

  -- Create default household
  INSERT INTO public.households (name, created_by)
  VALUES (user_name || '''s Household', NEW.id)
  RETURNING id INTO default_household_id;

  -- Add user as admin member
  INSERT INTO public.household_members (
    household_id, 
    user_id, 
    role, 
    name,
    is_account_member,
    color,
    total_coins,
    spent_coins,
    current_coins
  )
  VALUES (
    default_household_id,
    NEW.id,
    'admin',
    user_name,
    true,
    '#3b82f6',
    0,
    0,
    0
  );

  -- Set default household in user_settings
  INSERT INTO public.user_settings (user_id, household_id, default_household_id)
  VALUES (NEW.id, default_household_id, default_household_id);

  RETURN NEW;
END;
$$;
