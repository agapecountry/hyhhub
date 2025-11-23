/*
  # Create Journal Entries System

  1. New Tables
    - `journal_entries`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `user_id` (uuid, foreign key to users) - Author of the entry
      - `subject` (text) - Title/subject of the journal entry
      - `entry_date` (date) - Date the entry is about
      - `content` (text) - Free-form journal content
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `deleted_at` (timestamptz) - Soft delete timestamp

  2. Purpose
    - Allow household members to create personal or shared journal/notes entries
    - Track important dates, events, memories, or general notes
    - Soft delete support to prevent accidental data loss

  3. Security
    - Enable RLS
    - Household members can view all non-deleted entries in their household
    - Users can create, update, and soft-delete entries
*/

-- Create journal_entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_household_id 
  ON journal_entries(household_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id 
  ON journal_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date
  ON journal_entries(household_id, entry_date DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_deleted_at
  ON journal_entries(household_id, deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Policies for journal_entries
CREATE POLICY "Household members can view non-deleted journal entries"
  ON journal_entries FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create journal entries in their household"
  ON journal_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own journal entries"
  ON journal_entries FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() AND
    household_id IN (
      SELECT household_id 
      FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Note: No DELETE policy - we only allow soft deletes via UPDATE

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_journal_entries_updated_at();
