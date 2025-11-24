/*
  # Fix Security Issue in create_default_pantry_locations Function
  
  1. Changes
    - Add SET search_path = public, pg_temp to function
    - Prevents privilege escalation attacks by fixing the search path
    
  2. Security
    - Ensures function only uses the public schema and temp tables
    - Required for SECURITY DEFINER functions
*/

-- Recreate function with proper search_path security setting
CREATE OR REPLACE FUNCTION create_default_pantry_locations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert default pantry locations for the new household
  INSERT INTO public.pantry_locations (household_id, name, icon, display_order)
  VALUES
    (NEW.id, 'Pantry', '📦', 0),
    (NEW.id, 'Fridge', '🧊', 1),
    (NEW.id, 'Freezer', '❄️', 2),
    (NEW.id, 'Storage', '🗃️', 3)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_default_pantry_locations() TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_default_pantry_locations() IS
'Automatically creates default pantry locations (Pantry, Fridge, Freezer, Storage) when a new household is created. Uses secure search_path to prevent privilege escalation.';
