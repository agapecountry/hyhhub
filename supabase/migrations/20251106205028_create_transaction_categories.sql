/*
  # Create Transaction Categories Schema

  1. New Tables
    - `transaction_categories`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key) - Categories are household-specific
      - `name` (text) - Category name
      - `type` (text) - 'income' or 'expense'
      - `icon` (text) - Optional icon/emoji
      - `color` (text) - Optional color for visual identification
      - `is_default` (boolean) - System default categories
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `transaction_categories` table
    - Members can view categories for their household
    - Admins and co-parents can create/update/delete custom categories
    - Default categories cannot be deleted

  3. Performance
    - Index on household_id for fast lookups
    - Unique constraint on household_id + name

  4. Default Categories
    - Insert common default categories for all households
*/

CREATE TABLE IF NOT EXISTS transaction_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text CHECK (type IN ('income', 'expense', 'transfer')) DEFAULT 'expense',
  icon text,
  color text DEFAULT '#64748b',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (household_id, name)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_transaction_categories_household_id ON transaction_categories(household_id);

-- Enable RLS
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;

-- Members can view categories for their household
CREATE POLICY "Members can view transaction categories"
  ON transaction_categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transaction_categories.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Admins and co-parents can insert categories
CREATE POLICY "Admins and co-parents can create categories"
  ON transaction_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transaction_categories.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

-- Admins and co-parents can update categories (except defaults)
CREATE POLICY "Admins and co-parents can update categories"
  ON transaction_categories FOR UPDATE
  TO authenticated
  USING (
    NOT is_default
    AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transaction_categories.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co_parent')
    )
  )
  WITH CHECK (
    NOT is_default
    AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transaction_categories.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

-- Admins and co-parents can delete categories (except defaults)
CREATE POLICY "Admins and co-parents can delete categories"
  ON transaction_categories FOR DELETE
  TO authenticated
  USING (
    NOT is_default
    AND EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transaction_categories.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transaction_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_categories_updated_at
  BEFORE UPDATE ON transaction_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_categories_updated_at();

-- Function to create default categories for a household
CREATE OR REPLACE FUNCTION create_default_transaction_categories(p_household_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO transaction_categories (household_id, name, type, icon, color, is_default)
  VALUES
    -- Expense categories
    (p_household_id, 'Groceries', 'expense', '🛒', '#10b981', true),
    (p_household_id, 'Dining Out', 'expense', '🍽️', '#f59e0b', true),
    (p_household_id, 'Transportation', 'expense', '🚗', '#3b82f6', true),
    (p_household_id, 'Gas', 'expense', '⛽', '#ef4444', true),
    (p_household_id, 'Utilities', 'expense', '💡', '#8b5cf6', true),
    (p_household_id, 'Rent/Mortgage', 'expense', '🏠', '#ec4899', true),
    (p_household_id, 'Insurance', 'expense', '🛡️', '#06b6d4', true),
    (p_household_id, 'Healthcare', 'expense', '⚕️', '#14b8a6', true),
    (p_household_id, 'Entertainment', 'expense', '🎬', '#f97316', true),
    (p_household_id, 'Shopping', 'expense', '🛍️', '#a855f7', true),
    (p_household_id, 'Subscriptions', 'expense', '📱', '#6366f1', true),
    (p_household_id, 'Education', 'expense', '📚', '#84cc16', true),
    (p_household_id, 'Personal Care', 'expense', '💆', '#f43f5e', true),
    (p_household_id, 'Pet Care', 'expense', '🐾', '#22c55e', true),
    (p_household_id, 'Home Improvement', 'expense', '🔨', '#eab308', true),
    (p_household_id, 'Gifts', 'expense', '🎁', '#ec4899', true),
    (p_household_id, 'Charity', 'expense', '❤️', '#f43f5e', true),
    (p_household_id, 'Miscellaneous', 'expense', '📌', '#64748b', true),
    
    -- Income categories
    (p_household_id, 'Salary', 'income', '💰', '#10b981', true),
    (p_household_id, 'Freelance', 'income', '💼', '#3b82f6', true),
    (p_household_id, 'Investment', 'income', '📈', '#8b5cf6', true),
    (p_household_id, 'Bonus', 'income', '🎉', '#f59e0b', true),
    (p_household_id, 'Refund', 'income', '↩️', '#06b6d4', true),
    (p_household_id, 'Other Income', 'income', '💵', '#22c55e', true),
    
    -- Transfer
    (p_household_id, 'Transfer', 'transfer', '🔄', '#64748b', true)
  ON CONFLICT (household_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default categories for new households
CREATE OR REPLACE FUNCTION create_default_categories_for_new_household()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_transaction_categories(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_default_categories_trigger ON households;
CREATE TRIGGER create_default_categories_trigger
  AFTER INSERT ON households
  FOR EACH ROW
  EXECUTE FUNCTION create_default_categories_for_new_household();

-- Create default categories for existing households
DO $$
DECLARE
  household_record RECORD;
BEGIN
  FOR household_record IN SELECT id FROM households
  LOOP
    PERFORM create_default_transaction_categories(household_record.id);
  END LOOP;
END $$;
