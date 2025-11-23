/*
  # Fix Function Search Path Security

  ## Overview
  Fixes the handle_new_user function to have an immutable search_path.
  A mutable search_path in security-sensitive functions can lead to vulnerabilities.

  ## Changes
  - Drop and recreate handle_new_user function with SECURITY DEFINER and proper search_path
  - Sets search_path to public, pg_temp to prevent malicious schema injection

  ## Security Notes
  - SECURITY DEFINER functions should always have an explicit search_path
  - This prevents search_path manipulation attacks
*/

-- Drop existing function
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Recreate with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();