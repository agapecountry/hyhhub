/*
  # Ensure User Records Exist

  1. Changes
    - Insert missing user records for auth users who don't have a public.users record
    - This migration is idempotent and safe to run multiple times

  2. Notes
    - Only creates records for users that don't already exist
    - Uses timezone default of 'America/New_York' for existing users
*/

-- Insert any missing user records from auth.users
INSERT INTO public.users (id, email, timezone)
SELECT 
  au.id, 
  au.email,
  'America/New_York' as timezone
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;
