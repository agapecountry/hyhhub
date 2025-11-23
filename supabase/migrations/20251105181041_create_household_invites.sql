/*
  # Create household invites system

  1. New Tables
    - `household_invites`
      - `id` (uuid, primary key)
      - `household_id` (uuid, references households)
      - `invite_code` (text, unique) - Unique code for the invite
      - `email` (text) - Email of person being invited (optional)
      - `created_by` (uuid, references auth.users)
      - `expires_at` (timestamptz) - When the invite expires
      - `used_at` (timestamptz, nullable) - When the invite was used
      - `used_by` (uuid, nullable) - Who used the invite
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `household_invites` table
    - Allow household members to create invites
    - Allow household members to view their household's invites
    - Allow anyone to read invite by code (for acceptance)
    - Allow anyone to update invite when accepting (mark as used)

  3. Important Notes
    - Invites expire after 7 days by default
    - Invite codes are generated as random UUIDs
    - Can be used by anyone with the link
*/

CREATE TABLE IF NOT EXISTS household_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  invite_code text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  email text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can create invites"
  ON household_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_invites.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Household members can view household invites"
  ON household_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_invites.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read invite by code"
  ON household_invites
  FOR SELECT
  TO anon, authenticated
  USING (
    used_at IS NULL
    AND expires_at > now()
  );

CREATE POLICY "Anyone can mark invite as used"
  ON household_invites
  FOR UPDATE
  TO authenticated
  USING (
    used_at IS NULL
    AND expires_at > now()
  )
  WITH CHECK (
    used_at IS NOT NULL
    AND used_by = auth.uid()
  );

CREATE POLICY "Admins can delete invites"
  ON household_invites
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_invites.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE INDEX idx_household_invites_code ON household_invites(invite_code);
CREATE INDEX idx_household_invites_household ON household_invites(household_id);
