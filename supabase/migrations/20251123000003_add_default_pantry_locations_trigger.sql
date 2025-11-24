/*
  # Add Default Pantry Locations for New Households
  
  1. Changes
    - Create function to insert default pantry locations
    - Create trigger to automatically add default locations when household is created
    - Add "Storage" as 4th default location to all existing households
    
  2. Default Locations
    - Pantry 📦
    - Fridge 🧊
    - Freezer ❄️
    - Storage 🗃️
*/

-- Function to create default pantry locations for a household
CREATE OR REPLACE FUNCTION create_default_pantry_locations()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default pantry locations for the new household
  INSERT INTO pantry_locations (household_id, name, icon, display_order)
  VALUES
    (NEW.id, 'Pantry', '📦', 0),
    (NEW.id, 'Fridge', '🧊', 1),
    (NEW.id, 'Freezer', '❄️', 2),
    (NEW.id, 'Storage', '🗃️', 3)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run after household insert
DROP TRIGGER IF EXISTS create_pantry_locations_on_household_insert ON households;
CREATE TRIGGER create_pantry_locations_on_household_insert
  AFTER INSERT ON households
  FOR EACH ROW
  EXECUTE FUNCTION create_default_pantry_locations();

-- Add "Storage" location to all existing households that don't have it
INSERT INTO pantry_locations (household_id, name, icon, display_order)
SELECT 
  h.id,
  'Storage',
  '🗃️',
  (
    SELECT COALESCE(MAX(display_order), 2) + 1
    FROM pantry_locations pl
    WHERE pl.household_id = h.id
  )
FROM households h
WHERE NOT EXISTS (
  SELECT 1 
  FROM pantry_locations pl 
  WHERE pl.household_id = h.id 
    AND pl.name = 'Storage'
)
ON CONFLICT DO NOTHING;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_default_pantry_locations() TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_default_pantry_locations() IS
'Automatically creates default pantry locations (Pantry, Fridge, Freezer, Storage) when a new household is created';
