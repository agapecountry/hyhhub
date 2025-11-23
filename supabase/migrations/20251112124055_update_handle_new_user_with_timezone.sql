/*
  # Update handle_new_user Function with Timezone Support
  
  1. Purpose
    - Update the handle_new_user() function to include timezone
    - Simplify the function by removing unnecessary fields
    - Keep search_path simple and secure
    
  2. Changes
    - Add timezone field to user creation
    - Remove coin initialization from household_members (has defaults)
    - Simplified search_path to public, pg_catalog only
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
  -- Create user entry with timezone
  INSERT INTO public.users (id, email, name, timezone)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'America/New_York')
  );

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
