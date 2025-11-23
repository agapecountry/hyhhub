/*
  # Fix handle_new_user Function
  
  1. Purpose
    - Fix the handle_new_user() function to properly create user records
    - Remove reference to non-existent is_primary column
    - Fix user_settings insert to include required household_id
    
  2. Changes
    - Update handle_new_user() to remove is_primary from household_members insert
    - Update user_settings insert to include household_id
    - Ensure all required columns are properly set
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  default_household_id UUID;
BEGIN
  -- Create user entry
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));

  -- Create default household
  INSERT INTO public.households (name, created_by)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) || '''s Household',
    NEW.id
  )
  RETURNING id INTO default_household_id;

  -- Add user as admin member (removed is_primary which doesn't exist)
  INSERT INTO public.household_members (household_id, user_id, role, name)
  VALUES (
    default_household_id,
    NEW.id,
    'admin',
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );

  -- Set default household (include household_id which is required)
  INSERT INTO public.user_settings (user_id, household_id, default_household_id)
  VALUES (NEW.id, default_household_id, default_household_id);

  RETURN NEW;
END;
$$;