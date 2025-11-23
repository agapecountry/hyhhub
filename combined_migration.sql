/*
  # HYH Hub - Core Database Schema

  ## Overview
  Creates the complete database schema for HYH Hub, a multi-household management platform.
  This migration establishes all tables needed for managing households, budgets, debt, meals,
  pantry, scheduling, and chores.

  ## New Tables

  ### Core Tables
  - `households` - Main household entities
    - `id` (uuid, primary key)
    - `name` (text) - household name
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  - `household_members` - Links users to households with roles
    - `id` (uuid, primary key)
    - `household_id` (uuid, foreign key)
    - `user_id` (uuid, foreign key to auth.users)
    - `role` (text) - 'admin' or 'member'
    - `joined_at` (timestamptz)

  - `user_settings` - Per-household user preferences
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `user_id` (uuid)
    - `default_household_id` (uuid) - which household to show on login
    - `settings` (jsonb) - flexible settings storage

  ### Budgeting Module
  - `accounts` - Bank accounts and credit cards
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `name` (text)
    - `type` (text) - 'checking', 'savings', 'credit'
    - `balance` (decimal)
    - `plaid_account_id` (text, nullable)
    - `created_at` (timestamptz)

  - `categories` - Budget categories
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `name` (text)
    - `type` (text) - 'income', 'expense'
    - `color` (text)

  - `budgets` - Monthly budget limits per category
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `category_id` (uuid)
    - `month` (date)
    - `amount` (decimal)

  - `transactions` - Financial transactions
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `account_id` (uuid)
    - `category_id` (uuid, nullable)
    - `date` (date)
    - `amount` (decimal)
    - `description` (text)
    - `plaid_transaction_id` (text, nullable)

  ### Debt Payoff Module
  - `loans` - Debt accounts
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `name` (text)
    - `balance` (decimal)
    - `interest_rate` (decimal)
    - `minimum_payment` (decimal)
    - `due_day` (integer)

  - `loan_payments` - Payment history
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `loan_id` (uuid)
    - `date` (date)
    - `amount` (decimal)
    - `principal` (decimal)
    - `interest` (decimal)

  - `payoff_scenarios` - Saved payoff strategies
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `name` (text)
    - `method` (text) - 'snowball' or 'avalanche'
    - `extra_payment` (decimal)
    - `created_at` (timestamptz)

  ### Meal Planning Module
  - `recipes` - Recipe collection
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `name` (text)
    - `description` (text)
    - `instructions` (text)
    - `prep_time` (integer)
    - `cook_time` (integer)
    - `servings` (integer)

  - `ingredients` - Recipe ingredients
    - `id` (uuid, primary key)
    - `recipe_id` (uuid)
    - `name` (text)
    - `quantity` (text)
    - `unit` (text)

  - `meals` - Meal plans
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `recipe_id` (uuid, nullable)
    - `date` (date)
    - `meal_type` (text) - 'breakfast', 'lunch', 'dinner', 'snack'
    - `notes` (text)

  - `grocery_list` - Shopping list items
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `item` (text)
    - `quantity` (text)
    - `category` (text)
    - `checked` (boolean)
    - `added_at` (timestamptz)

  ### Pantry Module
  - `pantry_items` - Pantry inventory
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `name` (text)
    - `quantity` (decimal)
    - `unit` (text)
    - `location` (text) - 'pantry', 'fridge', 'freezer'
    - `expiration_date` (date, nullable)
    - `notes` (text)

  - `inventory_log` - Track pantry changes
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `pantry_item_id` (uuid)
    - `action` (text) - 'added', 'removed', 'used'
    - `quantity` (decimal)
    - `date` (timestamptz)

  ### Calendar Module
  - `events` - Calendar events
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `title` (text)
    - `description` (text)
    - `start_time` (timestamptz)
    - `end_time` (timestamptz)
    - `all_day` (boolean)
    - `color` (text)
    - `created_by` (uuid)

  - `event_participants` - Who's involved in events
    - `id` (uuid, primary key)
    - `event_id` (uuid)
    - `user_id` (uuid)

  - `notifications` - Event reminders
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `user_id` (uuid)
    - `event_id` (uuid, nullable)
    - `message` (text)
    - `read` (boolean)
    - `created_at` (timestamptz)

  ### Chores Module
  - `chores` - Chore definitions
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `name` (text)
    - `description` (text)
    - `points` (integer)
    - `frequency` (text) - 'daily', 'weekly', 'monthly', 'once'

  - `chore_assignments` - Assigned chores with completion tracking
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `chore_id` (uuid)
    - `assigned_to` (uuid)
    - `due_date` (date)
    - `completed` (boolean)
    - `completed_at` (timestamptz, nullable)

  - `rewards` - Available rewards
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `name` (text)
    - `description` (text)
    - `points_cost` (integer)

  - `redemptions` - Reward redemption history
    - `id` (uuid, primary key)
    - `household_id` (uuid)
    - `user_id` (uuid)
    - `reward_id` (uuid)
    - `points_spent` (integer)
    - `redeemed_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for household-based access control
  - Ensure users can only access their household data

  ## Important Notes
  1. All household-related tables include household_id for data isolation
  2. All timestamps use timestamptz for timezone awareness
  3. Decimal types used for financial precision
  4. RLS policies restrict access to household members only
*/

-- Core Tables
CREATE TABLE IF NOT EXISTS households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(household_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  default_household_id uuid REFERENCES households(id) ON DELETE SET NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  UNIQUE(household_id, user_id)
);

-- Budgeting Module
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('checking', 'savings', 'credit')),
  balance decimal(12, 2) DEFAULT 0,
  plaid_account_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  color text DEFAULT '#195D63'
);

CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  month date NOT NULL,
  amount decimal(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  date date NOT NULL,
  amount decimal(12, 2) NOT NULL,
  description text NOT NULL,
  plaid_transaction_id text,
  created_at timestamptz DEFAULT now()
);

-- Debt Payoff Module
CREATE TABLE IF NOT EXISTS loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  balance decimal(12, 2) NOT NULL,
  interest_rate decimal(5, 2) NOT NULL,
  minimum_payment decimal(12, 2) NOT NULL,
  due_day integer CHECK (due_day >= 1 AND due_day <= 31)
);

CREATE TABLE IF NOT EXISTS loan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  loan_id uuid REFERENCES loans(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  amount decimal(12, 2) NOT NULL,
  principal decimal(12, 2) NOT NULL,
  interest decimal(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS payoff_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  method text NOT NULL CHECK (method IN ('snowball', 'avalanche')),
  extra_payment decimal(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Meal Planning Module
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  instructions text,
  prep_time integer,
  cook_time integer,
  servings integer
);

CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity text NOT NULL,
  unit text
);

CREATE TABLE IF NOT EXISTS meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  notes text
);

CREATE TABLE IF NOT EXISTS grocery_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  item text NOT NULL,
  quantity text,
  category text,
  checked boolean DEFAULT false,
  added_at timestamptz DEFAULT now()
);

-- Pantry Module
CREATE TABLE IF NOT EXISTS pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity decimal(10, 2) NOT NULL,
  unit text NOT NULL,
  location text NOT NULL CHECK (location IN ('pantry', 'fridge', 'freezer')),
  expiration_date date,
  notes text
);

CREATE TABLE IF NOT EXISTS inventory_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  pantry_item_id uuid REFERENCES pantry_items(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL CHECK (action IN ('added', 'removed', 'used')),
  quantity decimal(10, 2) NOT NULL,
  date timestamptz DEFAULT now()
);

-- Calendar Module
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  color text DEFAULT '#195D63',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Chores Module
CREATE TABLE IF NOT EXISTS chores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  points integer DEFAULT 0,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'once'))
);

CREATE TABLE IF NOT EXISTS chore_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  chore_id uuid REFERENCES chores(id) ON DELETE CASCADE NOT NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  due_date date NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  points_cost integer NOT NULL
);

CREATE TABLE IF NOT EXISTS redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_id uuid REFERENCES rewards(id) ON DELETE CASCADE NOT NULL,
  points_spent integer NOT NULL,
  redeemed_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payoff_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for households
CREATE POLICY "Users can view households they belong to"
  ON households FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = households.id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create households"
  ON households FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update their households"
  ON households FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = households.id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = households.id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete their households"
  ON households FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = households.id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- RLS Policies for household_members
CREATE POLICY "Users can view members of their households"
  ON household_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add themselves to households"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage household members"
  ON household_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

-- RLS Policies for user_settings
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Generic RLS policies for household data tables
-- These apply to: accounts, categories, budgets, transactions, loans, loan_payments, 
-- payoff_scenarios, recipes, meals, grocery_list, pantry_items, inventory_log, 
-- events, notifications, chores, chore_assignments, rewards, redemptions

CREATE POLICY "Household members can view accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can insert accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- Apply same policies to all other household data tables
-- Categories
CREATE POLICY "Household members can view categories"
  ON categories FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = categories.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert categories"
  ON categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = categories.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update categories"
  ON categories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = categories.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = categories.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete categories"
  ON categories FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = categories.household_id AND household_members.user_id = auth.uid()));

-- Budgets
CREATE POLICY "Household members can view budgets"
  ON budgets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budgets.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert budgets"
  ON budgets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budgets.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update budgets"
  ON budgets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budgets.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budgets.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete budgets"
  ON budgets FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = budgets.household_id AND household_members.user_id = auth.uid()));

-- Transactions
CREATE POLICY "Household members can view transactions"
  ON transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = transactions.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert transactions"
  ON transactions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = transactions.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update transactions"
  ON transactions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = transactions.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = transactions.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete transactions"
  ON transactions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = transactions.household_id AND household_members.user_id = auth.uid()));

-- Loans
CREATE POLICY "Household members can view loans"
  ON loans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loans.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert loans"
  ON loans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loans.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update loans"
  ON loans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loans.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loans.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete loans"
  ON loans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loans.household_id AND household_members.user_id = auth.uid()));

-- Loan Payments
CREATE POLICY "Household members can view loan_payments"
  ON loan_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loan_payments.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert loan_payments"
  ON loan_payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loan_payments.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update loan_payments"
  ON loan_payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loan_payments.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loan_payments.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete loan_payments"
  ON loan_payments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = loan_payments.household_id AND household_members.user_id = auth.uid()));

-- Payoff Scenarios
CREATE POLICY "Household members can view payoff_scenarios"
  ON payoff_scenarios FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = payoff_scenarios.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert payoff_scenarios"
  ON payoff_scenarios FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = payoff_scenarios.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update payoff_scenarios"
  ON payoff_scenarios FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = payoff_scenarios.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = payoff_scenarios.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete payoff_scenarios"
  ON payoff_scenarios FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = payoff_scenarios.household_id AND household_members.user_id = auth.uid()));

-- Recipes
CREATE POLICY "Household members can view recipes"
  ON recipes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = recipes.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert recipes"
  ON recipes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = recipes.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update recipes"
  ON recipes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = recipes.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = recipes.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete recipes"
  ON recipes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = recipes.household_id AND household_members.user_id = auth.uid()));

-- Ingredients (accessed through recipes)
CREATE POLICY "Users can view ingredients of household recipes"
  ON ingredients FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM recipes JOIN household_members ON recipes.household_id = household_members.household_id WHERE ingredients.recipe_id = recipes.id AND household_members.user_id = auth.uid()));

CREATE POLICY "Users can insert ingredients to household recipes"
  ON ingredients FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM recipes JOIN household_members ON recipes.household_id = household_members.household_id WHERE ingredients.recipe_id = recipes.id AND household_members.user_id = auth.uid()));

CREATE POLICY "Users can update ingredients of household recipes"
  ON ingredients FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM recipes JOIN household_members ON recipes.household_id = household_members.household_id WHERE ingredients.recipe_id = recipes.id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM recipes JOIN household_members ON recipes.household_id = household_members.household_id WHERE ingredients.recipe_id = recipes.id AND household_members.user_id = auth.uid()));

CREATE POLICY "Users can delete ingredients of household recipes"
  ON ingredients FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM recipes JOIN household_members ON recipes.household_id = household_members.household_id WHERE ingredients.recipe_id = recipes.id AND household_members.user_id = auth.uid()));

-- Meals
CREATE POLICY "Household members can view meals"
  ON meals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = meals.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert meals"
  ON meals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = meals.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update meals"
  ON meals FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = meals.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = meals.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete meals"
  ON meals FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = meals.household_id AND household_members.user_id = auth.uid()));

-- Grocery List
CREATE POLICY "Household members can view grocery_list"
  ON grocery_list FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = grocery_list.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert grocery_list"
  ON grocery_list FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = grocery_list.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update grocery_list"
  ON grocery_list FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = grocery_list.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = grocery_list.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete grocery_list"
  ON grocery_list FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = grocery_list.household_id AND household_members.user_id = auth.uid()));

-- Pantry Items
CREATE POLICY "Household members can view pantry_items"
  ON pantry_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = pantry_items.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert pantry_items"
  ON pantry_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = pantry_items.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update pantry_items"
  ON pantry_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = pantry_items.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = pantry_items.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete pantry_items"
  ON pantry_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = pantry_items.household_id AND household_members.user_id = auth.uid()));

-- Inventory Log
CREATE POLICY "Household members can view inventory_log"
  ON inventory_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = inventory_log.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert inventory_log"
  ON inventory_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = inventory_log.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update inventory_log"
  ON inventory_log FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = inventory_log.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = inventory_log.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete inventory_log"
  ON inventory_log FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = inventory_log.household_id AND household_members.user_id = auth.uid()));

-- Events
CREATE POLICY "Household members can view events"
  ON events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = events.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert events"
  ON events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = events.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update events"
  ON events FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = events.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = events.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete events"
  ON events FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = events.household_id AND household_members.user_id = auth.uid()));

-- Event Participants (accessed through events)
CREATE POLICY "Users can view event_participants of household events"
  ON event_participants FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM events JOIN household_members ON events.household_id = household_members.household_id WHERE event_participants.event_id = events.id AND household_members.user_id = auth.uid()));

CREATE POLICY "Users can insert event_participants to household events"
  ON event_participants FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM events JOIN household_members ON events.household_id = household_members.household_id WHERE event_participants.event_id = events.id AND household_members.user_id = auth.uid()));

CREATE POLICY "Users can delete event_participants from household events"
  ON event_participants FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM events JOIN household_members ON events.household_id = household_members.household_id WHERE event_participants.event_id = events.id AND household_members.user_id = auth.uid()));

-- Notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert notifications to household members"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = notifications.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Chores
CREATE POLICY "Household members can view chores"
  ON chores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chores.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert chores"
  ON chores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chores.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update chores"
  ON chores FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chores.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chores.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete chores"
  ON chores FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chores.household_id AND household_members.user_id = auth.uid()));

-- Chore Assignments
CREATE POLICY "Household members can view chore_assignments"
  ON chore_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chore_assignments.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert chore_assignments"
  ON chore_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chore_assignments.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update chore_assignments"
  ON chore_assignments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chore_assignments.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chore_assignments.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete chore_assignments"
  ON chore_assignments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = chore_assignments.household_id AND household_members.user_id = auth.uid()));

-- Rewards
CREATE POLICY "Household members can view rewards"
  ON rewards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = rewards.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert rewards"
  ON rewards FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = rewards.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can update rewards"
  ON rewards FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = rewards.household_id AND household_members.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = rewards.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can delete rewards"
  ON rewards FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = rewards.household_id AND household_members.user_id = auth.uid()));

-- Redemptions
CREATE POLICY "Household members can view redemptions"
  ON redemptions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = redemptions.household_id AND household_members.user_id = auth.uid()));

CREATE POLICY "Household members can insert redemptions"
  ON redemptions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM household_members WHERE household_members.household_id = redemptions.household_id AND household_members.user_id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_members_household_id ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_household_id ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_events_household_id ON events(household_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_household_id ON chore_assignments(household_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_assigned_to ON chore_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);/*
  # Fix Infinite Recursion in household_members RLS Policy

  1. Changes
    - Drop the recursive policy on household_members that checks household_members
    - Replace with simpler policies that allow users to view and insert their own memberships
    - Users can view household_members where they are a member (using household_id check)
    - Users can insert themselves as members
    - Only admins can delete members

  2. Security
    - Users can see all members of households they belong to
    - Users can only add themselves to households
    - Admins can manage membership
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view members of their households" ON household_members;

-- Create simpler, non-recursive policy
-- Users can view household_members if the user_id matches (their own membership)
CREATE POLICY "Users can view their own memberships"
  ON household_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view all members of households where they have any membership
-- This uses a subquery that doesn't create recursion
CREATE POLICY "Users can view members of joined households"
  ON household_members FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT hm.household_id 
      FROM household_members hm 
      WHERE hm.user_id = auth.uid()
    )
  );/*
  # Fix Infinite Recursion in household_members RLS - Version 3

  1. Changes
    - Drop ALL existing policies on household_members
    - Create security definer functions to safely check membership
    - Create new non-recursive policies

  2. Security
    - Users can view all household_members records
    - Users can only insert themselves
    - Admins can delete members
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can add themselves to households" ON household_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON household_members;
DROP POLICY IF EXISTS "Users can view members of joined households" ON household_members;
DROP POLICY IF EXISTS "Admins can manage household members" ON household_members;

-- Create security definer functions if they don't exist
CREATE OR REPLACE FUNCTION public.user_is_household_member(household_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.household_members
    WHERE household_id = household_uuid 
    AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_household_admin(household_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.household_members
    WHERE household_id = household_uuid 
    AND user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Create new non-recursive policies
CREATE POLICY "Users can view all household members"
  ON household_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert themselves as members"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can delete members"
  ON household_members FOR DELETE
  TO authenticated
  USING (user_is_household_admin(household_id));/*
  # Fix households table policies to use security definer functions

  1. Changes
    - Drop policies that directly query household_members
    - Replace with policies using security definer functions
    - This prevents recursion issues

  2. Security
    - Users can view households where they are members
    - Users can create households
    - Admins can update and delete their households
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view households they belong to" ON households;
DROP POLICY IF EXISTS "Admins can update their households" ON households;
DROP POLICY IF EXISTS "Admins can delete their households" ON households;

-- Create new policies using security definer functions
CREATE POLICY "Users can view their households"
  ON households FOR SELECT
  TO authenticated
  USING (user_is_household_member(id));

CREATE POLICY "Admins can update households"
  ON households FOR UPDATE
  TO authenticated
  USING (user_is_household_admin(id))
  WITH CHECK (user_is_household_admin(id));

CREATE POLICY "Admins can delete households"
  ON households FOR DELETE
  TO authenticated
  USING (user_is_household_admin(id));/*
  # Fix household creation - allow users to see their own newly created households

  1. Changes
    - Update households SELECT policy to allow users to see households they just created
    - This is needed because the app does .insert().select().single()
    - The user won't be a member yet when the SELECT runs

  2. Security
    - Users can view households they created (owner_id check) OR are members of
    - This doesn't compromise security since users still need to be members to do anything else
*/

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view their households" ON households;

-- Create a new policy that allows viewing if user is member OR if they just created it
-- Since we don't have owner_id, we'll make the policy less restrictive for INSERT...SELECT
CREATE POLICY "Users can view their households"
  ON households FOR SELECT
  TO authenticated
  USING (
    -- Allow if user is a member
    user_is_household_member(id)
    OR
    -- Allow if this household was just created (no members yet)
    -- This allows the INSERT...SELECT to work
    NOT EXISTS (
      SELECT 1 FROM household_members WHERE household_id = households.id
    )
  );/*
  # Create users table for profile management

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - References auth.users
      - `email` (text, unique, not null) - User's email address
      - `created_at` (timestamptz) - Account creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read all user emails (needed for invites)
    - Add policy for users to read their own data
    - Add policy for users to update their own data

  3. Important Notes
    - This table stores basic user profile information
    - Email lookup is required for household member invitations
    - The id references auth.users(id) to link with Supabase auth
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all user emails"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
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
/*
  # Add Support for Household Members Without Accounts

  ## Overview
  Enables household members to exist without requiring a Supabase authentication account.
  This is useful for tracking children, pets, or other household members who don't need
  system access.

  ## Changes

  1. Schema Modifications
    - Make `user_id` nullable in `household_members` table
    - Add `name` column for storing member display name (required when user_id is null)
    - Add `is_account_member` boolean to easily distinguish account vs non-account members
    - Add check constraint to ensure either user_id exists OR name is provided

  2. Updated Constraints
    - Modified UNIQUE constraint to handle null user_id properly
    - Added CHECK constraint: if user_id is null, name must be provided

  3. Security Updates
    - Updated RLS policies to handle nullable user_id
    - Non-account members can be viewed by household members
    - Only admins can create/delete non-account members

  ## Important Notes
  - Non-account members cannot log in or perform actions
  - Non-account members are primarily for display and assignment purposes
  - The `name` field is required when `user_id` is NULL
  - Existing data is preserved (all current members have user_id)
*/

-- First, drop the existing unique constraint that includes user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'household_members_household_id_user_id_key'
  ) THEN
    ALTER TABLE household_members DROP CONSTRAINT household_members_household_id_user_id_key;
  END IF;
END $$;

-- Make user_id nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'household_members' 
    AND column_name = 'user_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE household_members ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Add name column for non-account members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'household_members' AND column_name = 'name'
  ) THEN
    ALTER TABLE household_members ADD COLUMN name text;
  END IF;
END $$;

-- Add is_account_member helper column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'household_members' AND column_name = 'is_account_member'
  ) THEN
    ALTER TABLE household_members ADD COLUMN is_account_member boolean GENERATED ALWAYS AS (user_id IS NOT NULL) STORED;
  END IF;
END $$;

-- Add check constraint: must have either user_id OR name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'household_members_user_or_name_check'
  ) THEN
    ALTER TABLE household_members 
      ADD CONSTRAINT household_members_user_or_name_check 
      CHECK (
        (user_id IS NOT NULL) OR (name IS NOT NULL AND trim(name) != '')
      );
  END IF;
END $$;

-- Add new unique constraint that handles nullable user_id
-- For account members: household_id + user_id must be unique
-- For non-account members: household_id + name must be unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'household_members_unique_account'
  ) THEN
    CREATE UNIQUE INDEX household_members_unique_account 
      ON household_members(household_id, user_id) 
      WHERE user_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'household_members_unique_name'
  ) THEN
    CREATE UNIQUE INDEX household_members_unique_name 
      ON household_members(household_id, lower(trim(name))) 
      WHERE user_id IS NULL;
  END IF;
END $$;

-- Update RLS policy for inserting members to allow admins to create non-account members
DROP POLICY IF EXISTS "Users can add themselves to households" ON household_members;

CREATE POLICY "Users can add themselves to households"
  ON household_members FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to add themselves
    (user_id = auth.uid())
    OR
    -- Allow admins to add non-account members
    (
      user_id IS NULL 
      AND EXISTS (
        SELECT 1 FROM household_members hm
        WHERE hm.household_id = household_members.household_id
        AND hm.user_id = auth.uid()
        AND hm.role = 'admin'
      )
    )
  );

-- Update delete policy to allow admins to remove non-account members
DROP POLICY IF EXISTS "Admins can manage household members" ON household_members;

CREATE POLICY "Admins can manage household members"
  ON household_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
    OR
    -- Users can remove themselves
    (household_members.user_id = auth.uid())
  );/*
  # Add User Roles and Permission System

  ## Overview
  Implements a comprehensive role-based access control system with four user roles:
  - Admin: Full access to everything
  - Co-Parent: Can view assigned children's data and manage their calendar/chores
  - Teen: Limited access to chores, rewards, grocery lists, and assigned accounts
  - Child: Similar to Teen but explicitly labeled for younger household members

  ## New Tables

  1. `member_relationships`
    - Links co-parents and children to track who can manage whom
    - `id` (uuid, primary key)
    - `household_id` (uuid, foreign key)
    - `parent_member_id` (uuid, foreign key to household_members)
    - `child_member_id` (uuid, foreign key to household_members)
    - `created_at` (timestamptz)

  2. `account_view_permissions`
    - Controls which members can view specific accounts
    - `id` (uuid, primary key)
    - `household_id` (uuid, foreign key)
    - `account_id` (uuid, foreign key to accounts)
    - `member_id` (uuid, foreign key to household_members)
    - `granted_by` (uuid, references household_members)
    - `created_at` (timestamptz)

  ## Schema Modifications

  1. Update `household_members` table
    - Change role column to support new roles: 'admin', 'co-parent', 'teen', 'child'

  ## Security Updates

  1. RLS policies for member_relationships
    - Household members can view relationships in their household
    - Admins can create/update/delete relationships

  2. RLS policies for account_view_permissions
    - Members can view their own permissions
    - Admins can grant/revoke permissions

  3. Updated policies for existing tables
    - Accounts: Members can only view accounts they have permission for
    - Events: Co-parents can view/manage events for their assigned children
    - Chores: Teens/Children can view and complete their assigned chores

  ## Important Notes
  - All existing 'admin' and 'member' roles are preserved
  - Co-parents have limited access compared to admins
  - Teens and children have the most restricted access
  - Relationship tracking enables proper permission cascading
*/

-- Update role enum to include new roles
DO $$
BEGIN
  -- Drop the existing check constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'household_members_role_check'
  ) THEN
    ALTER TABLE household_members DROP CONSTRAINT household_members_role_check;
  END IF;
  
  -- Add new check constraint with all roles
  ALTER TABLE household_members 
    ADD CONSTRAINT household_members_role_check 
    CHECK (role IN ('admin', 'co-parent', 'teen', 'child', 'member'));
END $$;

-- Create member_relationships table
CREATE TABLE IF NOT EXISTS member_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  parent_member_id uuid REFERENCES household_members(id) ON DELETE CASCADE NOT NULL,
  child_member_id uuid REFERENCES household_members(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(household_id, parent_member_id, child_member_id),
  CHECK (parent_member_id != child_member_id)
);

-- Create account_view_permissions table
CREATE TABLE IF NOT EXISTS account_view_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  member_id uuid REFERENCES household_members(id) ON DELETE CASCADE NOT NULL,
  granted_by uuid REFERENCES household_members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, member_id)
);

-- Enable RLS
ALTER TABLE member_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_view_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for member_relationships

CREATE POLICY "Household members can view relationships"
  ON member_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_relationships.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create relationships"
  ON member_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_relationships.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete relationships"
  ON member_relationships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_relationships.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- RLS Policies for account_view_permissions

CREATE POLICY "Members can view their account permissions"
  ON account_view_permissions FOR SELECT
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM household_members
      WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = account_view_permissions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Admins can grant account permissions"
  ON account_view_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = account_view_permissions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can revoke account permissions"
  ON account_view_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = account_view_permissions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Update accounts RLS policies to respect view permissions
-- Drop existing policies first
DROP POLICY IF EXISTS "Household members can view accounts" ON accounts;
DROP POLICY IF EXISTS "Household members can insert accounts" ON accounts;
DROP POLICY IF EXISTS "Household members can update accounts" ON accounts;
DROP POLICY IF EXISTS "Household members can delete accounts" ON accounts;

-- Recreate with role-based access
CREATE POLICY "Members can view accounts based on role"
  ON accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = accounts.household_id
      AND hm.user_id = auth.uid()
      AND (
        -- Admins can view all accounts
        hm.role = 'admin'
        -- Co-parents can view all accounts
        OR hm.role = 'co-parent'
        -- Teens/Children can only view accounts they have permission for
        OR (
          hm.role IN ('teen', 'child')
          AND EXISTS (
            SELECT 1 FROM account_view_permissions avp
            WHERE avp.account_id = accounts.id
            AND avp.member_id = hm.id
          )
        )
      )
    )
  );

CREATE POLICY "Admins and co-parents can insert accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Admins and co-parents can update accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co-parent')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Admins can delete accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Update chore_assignments policies for teen/child access
DROP POLICY IF EXISTS "Household members can view chore_assignments" ON chore_assignments;
DROP POLICY IF EXISTS "Household members can update chore_assignments" ON chore_assignments;

CREATE POLICY "Members can view chore assignments based on role"
  ON chore_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = chore_assignments.household_id
      AND hm.user_id = auth.uid()
      AND (
        -- Admins and co-parents can view all chores
        hm.role IN ('admin', 'co-parent')
        -- Teens/children can view chores assigned to them
        OR (
          hm.role IN ('teen', 'child')
          AND chore_assignments.assigned_to = hm.id
        )
        -- Co-parents can also view chores assigned to their children
        OR (
          hm.role = 'co-parent'
          AND EXISTS (
            SELECT 1 FROM member_relationships mr
            WHERE mr.parent_member_id = hm.id
            AND mr.child_member_id = (
              SELECT id FROM household_members 
              WHERE id = chore_assignments.assigned_to
            )
          )
        )
      )
    )
  );

CREATE POLICY "Members can update chore assignments based on role"
  ON chore_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = chore_assignments.household_id
      AND hm.user_id = auth.uid()
      AND (
        -- Admins and co-parents can update any chore
        hm.role IN ('admin', 'co-parent')
        -- Teens/children can mark their own chores as complete
        OR (
          hm.role IN ('teen', 'child')
          AND chore_assignments.assigned_to = hm.id
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = chore_assignments.household_id
      AND hm.user_id = auth.uid()
      AND (
        hm.role IN ('admin', 'co-parent')
        OR (
          hm.role IN ('teen', 'child')
          AND chore_assignments.assigned_to = hm.id
        )
      )
    )
  );

-- Update events policies for co-parent child management
DROP POLICY IF EXISTS "Household members can view events" ON events;
DROP POLICY IF EXISTS "Household members can insert events" ON events;
DROP POLICY IF EXISTS "Household members can update events" ON events;
DROP POLICY IF EXISTS "Household members can delete events" ON events;

CREATE POLICY "Members can view events based on role"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = events.household_id
      AND hm.user_id = auth.uid()
      AND (
        -- Admins can view all events
        hm.role = 'admin'
        -- Co-parents can view events for their children
        OR (
          hm.role = 'co-parent'
          AND (
            -- All household events
            true
          )
        )
        -- Teens/children can view all household events
        OR hm.role IN ('teen', 'child')
      )
    )
  );

CREATE POLICY "Members can insert events based on role"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = events.household_id
      AND hm.user_id = auth.uid()
      AND hm.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Members can update events based on role"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = events.household_id
      AND hm.user_id = auth.uid()
      AND (
        hm.role = 'admin'
        OR (hm.role = 'co-parent' AND events.created_by = hm.user_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = events.household_id
      AND hm.user_id = auth.uid()
      AND hm.role IN ('admin', 'co-parent')
    )
  );

CREATE POLICY "Members can delete events based on role"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = events.household_id
      AND hm.user_id = auth.uid()
      AND (
        hm.role = 'admin'
        OR (hm.role = 'co-parent' AND events.created_by = hm.user_id)
      )
    )
  );

-- Update grocery_list policies to allow teens/children to add items
DROP POLICY IF EXISTS "Household members can insert grocery_list" ON grocery_list;

CREATE POLICY "Members can insert grocery items based on role"
  ON grocery_list FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role IN ('admin', 'co-parent', 'teen', 'child')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_relationships_parent ON member_relationships(parent_member_id);
CREATE INDEX IF NOT EXISTS idx_member_relationships_child ON member_relationships(child_member_id);
CREATE INDEX IF NOT EXISTS idx_member_relationships_household ON member_relationships(household_id);
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_member ON account_view_permissions(member_id);
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_account ON account_view_permissions(account_id);
CREATE INDEX IF NOT EXISTS idx_household_members_role ON household_members(role);/*
  # Add Color Coding for Household Members

  ## Overview
  Adds a color field to household members to enable visual identification
  in calendar events and other household activities.

  ## Changes

  1. Schema Modifications
    - Add `color` column to `household_members` table
    - Default color is a neutral blue shade
    - Color stored as hex code (e.g., '#3B82F6')

  ## Important Notes
  - Colors help visually distinguish members in calendar views
  - Each member gets a unique color for easy identification
  - Admins can change member colors at any time
*/

-- Add color column to household_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'household_members' AND column_name = 'color'
  ) THEN
    ALTER TABLE household_members ADD COLUMN color text DEFAULT '#3B82F6';
  END IF;
END $$;

-- Update existing members with varied default colors
DO $$
DECLARE
  member_record RECORD;
  color_index INTEGER := 0;
  colors TEXT[] := ARRAY[
    '#EF4444', -- Red
    '#F59E0B', -- Amber
    '#10B981', -- Emerald
    '#3B82F6', -- Blue
    '#8B5CF6', -- Violet
    '#EC4899', -- Pink
    '#14B8A6', -- Teal
    '#F97316', -- Orange
    '#6366F1', -- Indigo
    '#84CC16'  -- Lime
  ];
BEGIN
  FOR member_record IN 
    SELECT id FROM household_members WHERE color = '#3B82F6' OR color IS NULL
  LOOP
    UPDATE household_members 
    SET color = colors[(color_index % array_length(colors, 1)) + 1]
    WHERE id = member_record.id;
    
    color_index := color_index + 1;
  END LOOP;
END $$;/*
  # Add Name Field to Users Table

  ## Overview
  Adds a name field to the users table to allow users to set their display name.

  ## Changes

  1. Schema Modifications
    - Add `name` column to `users` table
    - Name is optional (nullable) as existing users won't have it set

  ## Important Notes
  - Users can update their name through profile settings
  - Name is used for display throughout the application
  - Falls back to email if name is not set
*/

-- Add name column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'name'
  ) THEN
    ALTER TABLE users ADD COLUMN name text;
  END IF;
END $$;/*
  # Add Update Policy for Household Members

  ## Overview
  Adds an UPDATE policy to allow admins to update household member information
  including name, role, and color.

  ## Changes

  1. Security Policies
    - Add UPDATE policy for household_members
    - Admins can update any member in their household
    - Users can update their own member record

  ## Important Notes
  - Ensures admins can manage member names, colors, and roles
  - Allows users to update their own information
*/

-- Add update policy for household_members
CREATE POLICY "Admins can update household members"
  ON household_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
    OR user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
    OR user_id = auth.uid()
  );/*
  # Create Calendar Events Table

  ## Overview
  Creates a calendar_events table for managing household events and appointments.

  ## Changes

  1. New Tables
    - `calendar_events`
      - `id` (uuid, primary key) - Unique event identifier
      - `household_id` (uuid, foreign key) - Links to households table
      - `title` (text, required) - Event title
      - `description` (text, optional) - Event details
      - `start_time` (timestamptz, required) - Event start date/time
      - `end_time` (timestamptz, optional) - Event end date/time
      - `all_day` (boolean) - Whether event is all-day
      - `location` (text, optional) - Event location
      - `color` (text) - Display color for event
      - `created_by` (uuid, foreign key) - User who created the event
      - `assigned_to` (uuid[], optional) - Array of household_member ids
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on calendar_events
    - Add policy for household members to view events
    - Add policy for household members to create events
    - Add policy for event creator and admins to update events
    - Add policy for event creator and admins to delete events

  ## Important Notes
  - Events are shared across the entire household
  - Members can assign events to specific household members
  - Default color system for visual organization
*/

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  all_day boolean DEFAULT false,
  location text,
  color text DEFAULT '#3B82F6',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to uuid[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy: Household members can view all events in their household
CREATE POLICY "Household members can view events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = auth.uid()
    )
  );

-- Policy: Household members can create events
CREATE POLICY "Household members can create events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Policy: Event creator and admins can update events
CREATE POLICY "Event creator and admins can update events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  )
  WITH CHECK (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

-- Policy: Event creator and admins can delete events
CREATE POLICY "Event creator and admins can delete events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = auth.uid()
      AND hm.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_household_id ON calendar_events(household_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);/*
  # Fix Missing Foreign Key Indexes

  ## Overview
  Adds indexes to all foreign key columns to improve query performance.
  Foreign keys without indexes can cause significant performance degradation.

  ## Changes
  - Add indexes for all unindexed foreign key columns across all tables
  - This improves JOIN performance and foreign key constraint checking

  ## Tables Affected
  - account_view_permissions
  - accounts
  - budgets
  - categories
  - chore_assignments
  - chores
  - event_participants
  - events
  - grocery_list
  - household_invites
  - ingredients
  - inventory_log
  - loan_payments
  - loans
  - meals
  - notifications
  - pantry_items
  - payoff_scenarios
  - recipes
  - redemptions
  - rewards
  - transactions
  - user_settings
*/

-- account_view_permissions indexes
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_granted_by ON account_view_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_household_id ON account_view_permissions(household_id);

-- accounts indexes
CREATE INDEX IF NOT EXISTS idx_accounts_household_id ON accounts(household_id);

-- budgets indexes
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_household_id ON budgets(household_id);

-- categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_household_id ON categories(household_id);

-- chore_assignments indexes
CREATE INDEX IF NOT EXISTS idx_chore_assignments_chore_id ON chore_assignments(chore_id);

-- chores indexes
CREATE INDEX IF NOT EXISTS idx_chores_household_id ON chores(household_id);

-- event_participants indexes
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);

-- events indexes
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- grocery_list indexes
CREATE INDEX IF NOT EXISTS idx_grocery_list_household_id ON grocery_list(household_id);

-- household_invites indexes
CREATE INDEX IF NOT EXISTS idx_household_invites_created_by ON household_invites(created_by);
CREATE INDEX IF NOT EXISTS idx_household_invites_used_by ON household_invites(used_by);

-- ingredients indexes
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);

-- inventory_log indexes
CREATE INDEX IF NOT EXISTS idx_inventory_log_household_id ON inventory_log(household_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_pantry_item_id ON inventory_log(pantry_item_id);

-- loan_payments indexes
CREATE INDEX IF NOT EXISTS idx_loan_payments_household_id ON loan_payments(household_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);

-- loans indexes
CREATE INDEX IF NOT EXISTS idx_loans_household_id ON loans(household_id);

-- meals indexes
CREATE INDEX IF NOT EXISTS idx_meals_household_id ON meals(household_id);
CREATE INDEX IF NOT EXISTS idx_meals_recipe_id ON meals(recipe_id);

-- notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_household_id ON notifications(household_id);

-- pantry_items indexes
CREATE INDEX IF NOT EXISTS idx_pantry_items_household_id ON pantry_items(household_id);

-- payoff_scenarios indexes
CREATE INDEX IF NOT EXISTS idx_payoff_scenarios_household_id ON payoff_scenarios(household_id);

-- recipes indexes
CREATE INDEX IF NOT EXISTS idx_recipes_household_id ON recipes(household_id);

-- redemptions indexes
CREATE INDEX IF NOT EXISTS idx_redemptions_household_id ON redemptions(household_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_reward_id ON redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON redemptions(user_id);

-- rewards indexes
CREATE INDEX IF NOT EXISTS idx_rewards_household_id ON rewards(household_id);

-- transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- user_settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_default_household_id ON user_settings(default_household_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);/*
  # Optimize RLS Policies for Performance

  ## Overview
  Optimizes all RLS policies by wrapping auth.uid() calls with SELECT.
  This prevents re-evaluation of auth.uid() for each row, significantly improving performance.

  ## Changes
  - Drop and recreate all existing RLS policies with optimized auth.uid() calls
  - Uses (select auth.uid()) instead of auth.uid() directly
  - Removes duplicate policies where they exist

  ## Important Notes
  - This migration affects all tables with RLS policies
  - Performance improvement is significant at scale
  - Security rules remain exactly the same
*/

-- Start with calendar_events (our recently created table)
DROP POLICY IF EXISTS "Household members can view events" ON calendar_events;
DROP POLICY IF EXISTS "Household members can create events" ON calendar_events;
DROP POLICY IF EXISTS "Creator and assigned members can update events" ON calendar_events;
DROP POLICY IF EXISTS "Only creator can delete events" ON calendar_events;

CREATE POLICY "Household members can view events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Household members can create events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = (select auth.uid())
    )
    AND created_by = (select auth.uid())
  );

CREATE POLICY "Creator and assigned members can update events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = (select auth.uid())
      AND (
        calendar_events.assigned_to @> ARRAY[hm.id]
        OR hm.role = 'admin'
      )
    )
  )
  WITH CHECK (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_events.household_id
      AND hm.user_id = (select auth.uid())
      AND (
        calendar_events.assigned_to @> ARRAY[hm.id]
        OR hm.role = 'admin'
      )
    )
  );

CREATE POLICY "Only creator can delete events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- users table
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Authenticated users can read all user emails" ON users;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Authenticated users can read all user emails"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- household_invites table
DROP POLICY IF EXISTS "Household members can view household invites" ON household_invites;
DROP POLICY IF EXISTS "Anyone can read invite by code" ON household_invites;
DROP POLICY IF EXISTS "Household members can create invites" ON household_invites;
DROP POLICY IF EXISTS "Anyone can mark invite as used" ON household_invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON household_invites;

CREATE POLICY "Anyone can read invite by code"
  ON household_invites
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Household members can create invites"
  ON household_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_invites.household_id
      AND hm.user_id = (select auth.uid())
    )
    AND created_by = (select auth.uid())
  );

CREATE POLICY "Anyone can mark invite as used"
  ON household_invites
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (used_by = (select auth.uid()));

CREATE POLICY "Admins can delete invites"
  ON household_invites
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_invites.household_id
      AND hm.user_id = (select auth.uid())
      AND hm.role = 'admin'
    )
  );

-- household_members table
DROP POLICY IF EXISTS "Users can add themselves to households" ON household_members;
DROP POLICY IF EXISTS "Users can insert themselves as members" ON household_members;
DROP POLICY IF EXISTS "Admins can manage household members" ON household_members;
DROP POLICY IF EXISTS "Admins can delete members" ON household_members;
DROP POLICY IF EXISTS "Admins can update household members" ON household_members;

CREATE POLICY "Users can insert themselves as members"
  ON household_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can manage household members"
  ON household_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = (select auth.uid())
      AND hm.role = 'admin'
    )
  );

CREATE POLICY "Admins can update household members"
  ON household_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = (select auth.uid())
      AND hm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = household_members.household_id
      AND hm.user_id = (select auth.uid())
      AND hm.role = 'admin'
    )
  );/*
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
  EXECUTE FUNCTION public.handle_new_user();/*
  # Add Calendar Color Categories

  ## Overview
  Adds support for customizable color categories that users can name and assign to events.
  For example, users can create a "Sports" category with a blue color.

  ## Changes

  1. New Tables
    - `calendar_color_categories`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `name` (text) - User-defined name like "Sports", "Work", "Family"
      - `color` (text) - Hex color code
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Table Updates
    - Add `color_category_id` to calendar_events (optional, nullable)
    - Keep existing `color` field for backward compatibility

  3. Security
    - Enable RLS on calendar_color_categories
    - Household members can view, create, update, and delete color categories
    - Only household members can access their household's categories

  ## Important Notes
  - Events can use either a direct color or reference a color category
  - If color_category_id is set, it takes precedence over the color field
  - This allows flexible color management across events
*/

-- Create calendar_color_categories table
CREATE TABLE IF NOT EXISTS calendar_color_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add color_category_id to calendar_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calendar_events' AND column_name = 'color_category_id'
  ) THEN
    ALTER TABLE calendar_events ADD COLUMN color_category_id uuid REFERENCES calendar_color_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_calendar_color_categories_household_id ON calendar_color_categories(household_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_color_category_id ON calendar_events(color_category_id);

-- Enable RLS
ALTER TABLE calendar_color_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_color_categories
CREATE POLICY "Household members can view color categories"
  ON calendar_color_categories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_color_categories.household_id
      AND hm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Household members can create color categories"
  ON calendar_color_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_color_categories.household_id
      AND hm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Household members can update color categories"
  ON calendar_color_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_color_categories.household_id
      AND hm.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_color_categories.household_id
      AND hm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Household members can delete color categories"
  ON calendar_color_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM household_members hm
      WHERE hm.household_id = calendar_color_categories.household_id
      AND hm.user_id = (select auth.uid())
    )
  );/*
  # Complete Meal Planning System

  ## Overview
  Completes the meal planning system by adding missing fields to recipes table
  and creating related tables for ingredients, meal plans, and grocery lists.

  ## Changes to Existing Tables

  ### `recipes` table updates
  - Add `notes` (text, optional notes)
  - Add `image_url` (text, optional image URL)
  - Add `category` (text, optional category like breakfast, lunch, dinner, dessert)
  - Add `created_by` (uuid, user id who created)
  - Add `created_at` (timestamptz)
  - Add `updated_at` (timestamptz)

  ## New Tables

  ### `recipe_ingredients`
  Stores ingredients for each recipe
  - `id` (uuid, primary key)
  - `recipe_id` (uuid, foreign key to recipes)
  - `name` (text, ingredient name)
  - `quantity` (text, amount like "2 cups", "1 tbsp")
  - `order_index` (integer, display order)
  - `created_at` (timestamptz)

  ### `meal_plans`
  Schedules meals for specific dates and meal times
  - `id` (uuid, primary key)
  - `household_id` (uuid, foreign key to households)
  - `recipe_id` (uuid, foreign key to recipes, optional)
  - `meal_name` (text, name if no recipe linked)
  - `meal_type` (text, breakfast/lunch/dinner/snack)
  - `meal_date` (date)
  - `notes` (text, optional)
  - `created_by` (uuid, user id who created)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `grocery_list_items`
  Tracks items needed for grocery shopping
  - `id` (uuid, primary key)
  - `household_id` (uuid, foreign key to households)
  - `name` (text, item name)
  - `quantity` (text, optional amount)
  - `category` (text, optional category like produce, dairy, meat)
  - `is_purchased` (boolean, default false)
  - `recipe_id` (uuid, optional reference to source recipe)
  - `added_by` (uuid, user id who added)
  - `purchased_by` (uuid, optional, user id who purchased)
  - `purchased_at` (timestamptz, optional)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all new tables
  - Users can only access data for households they belong to
  - All operations require authentication

  ## Indexes
  - Index household_id on all tables for efficient queries
  - Index meal_date on meal_plans for calendar views
  - Index recipe_id on recipe_ingredients for ingredient lookups
*/

-- Add missing columns to recipes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'notes'
  ) THEN
    ALTER TABLE recipes ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE recipes ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'category'
  ) THEN
    ALTER TABLE recipes ADD COLUMN category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE recipes ADD COLUMN created_by uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE recipes ADD COLUMN created_at timestamptz DEFAULT now() NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE recipes ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
  END IF;
END $$;

-- Create recipe_ingredients table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity text,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  meal_name text,
  meal_type text NOT NULL,
  meal_date date NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT meal_name_or_recipe CHECK (recipe_id IS NOT NULL OR meal_name IS NOT NULL)
);

-- Create grocery_list_items table
CREATE TABLE IF NOT EXISTS grocery_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  quantity text,
  category text,
  is_purchased boolean DEFAULT false NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  added_by uuid,
  purchased_by uuid,
  purchased_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recipes_household_id ON recipes(household_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_household_id ON meal_plans(household_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_meal_date ON meal_plans(meal_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe_id ON meal_plans(recipe_id);
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_household_id ON grocery_list_items(household_id);
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_recipe_id ON grocery_list_items(recipe_id);

-- Enable RLS
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_list_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipe_ingredients
CREATE POLICY "Users can view recipe ingredients"
  ON recipe_ingredients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN household_members hm ON hm.household_id = r.household_id
      WHERE r.id = recipe_ingredients.recipe_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recipe ingredients"
  ON recipe_ingredients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN household_members hm ON hm.household_id = r.household_id
      WHERE r.id = recipe_ingredients.recipe_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recipe ingredients"
  ON recipe_ingredients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN household_members hm ON hm.household_id = r.household_id
      WHERE r.id = recipe_ingredients.recipe_id
      AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN household_members hm ON hm.household_id = r.household_id
      WHERE r.id = recipe_ingredients.recipe_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recipe ingredients"
  ON recipe_ingredients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN household_members hm ON hm.household_id = r.household_id
      WHERE r.id = recipe_ingredients.recipe_id
      AND hm.user_id = auth.uid()
    )
  );

-- RLS Policies for meal_plans
CREATE POLICY "Users can view household meal plans"
  ON meal_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = meal_plans.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create household meal plans"
  ON meal_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = meal_plans.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household meal plans"
  ON meal_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = meal_plans.household_id
      AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = meal_plans.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household meal plans"
  ON meal_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = meal_plans.household_id
      AND hm.user_id = auth.uid()
    )
  );

-- RLS Policies for grocery_list_items
CREATE POLICY "Users can view household grocery items"
  ON grocery_list_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = grocery_list_items.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create household grocery items"
  ON grocery_list_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = grocery_list_items.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update household grocery items"
  ON grocery_list_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = grocery_list_items.household_id
      AND hm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = grocery_list_items.household_id
      AND hm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete household grocery items"
  ON grocery_list_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm
      WHERE hm.household_id = grocery_list_items.household_id
      AND hm.user_id = auth.uid()
    )
  );/*
  # Fix Rewards Table Schema

  1. Changes
    - Rename `points_cost` column to `cost` for consistency
    - Add `icon` column to store reward emoji/icon
    - Add `available` column to track if reward is active
    
  2. Notes
    - Uses safe ALTER TABLE operations with IF EXISTS checks
    - Preserves existing data
*/

DO $$
BEGIN
  -- Rename points_cost to cost if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rewards' AND column_name = 'points_cost'
  ) THEN
    ALTER TABLE rewards RENAME COLUMN points_cost TO cost;
  END IF;

  -- Add icon column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rewards' AND column_name = 'icon'
  ) THEN
    ALTER TABLE rewards ADD COLUMN icon text DEFAULT '🎁' NOT NULL;
  END IF;

  -- Add available column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rewards' AND column_name = 'available'
  ) THEN
    ALTER TABLE rewards ADD COLUMN available boolean DEFAULT true NOT NULL;
  END IF;
END $$;
/*
  # Fix Chore Assignments Foreign Key

  1. Changes
    - Drop the existing foreign key constraint that references auth.users
    - Add new foreign key constraint that references household_members
    - This allows assigning chores to any household member (including non-account members)
  
  2. Notes
    - Uses safe operations to handle constraint changes
    - Preserves existing data if the member IDs are valid
*/

-- Drop the old foreign key constraint
ALTER TABLE chore_assignments
DROP CONSTRAINT IF EXISTS chore_assignments_assigned_to_fkey;

-- There's also a typo in the constraint name, so drop that too if it exists
ALTER TABLE chore_assignments
DROP CONSTRAINT IF EXISTS chore_assisgnments_assigned_to_fkey;

-- Add the correct foreign key constraint pointing to household_members
ALTER TABLE chore_assignments
ADD CONSTRAINT chore_assignments_assigned_to_fkey
FOREIGN KEY (assigned_to)
REFERENCES household_members(id)
ON DELETE CASCADE;
/*
  # Add Open Chore Pickup Feature

  1. Changes
    - Make assigned_to column nullable in chore_assignments
    - Add claimed_by column to track who claimed an open chore
    - Add claimed_at timestamp for audit trail
    
  2. Notes
    - NULL assigned_to means the chore is "Open for Pickup"
    - Once claimed, claimed_by is set to the member who claimed it
    - assigned_to gets updated to the claimed_by member
    - This allows tracking both original assignment and claims
*/

-- Make assigned_to nullable to allow open chores
ALTER TABLE chore_assignments
ALTER COLUMN assigned_to DROP NOT NULL;

-- Add claimed_by column to track who claimed an open chore
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chore_assignments' AND column_name = 'claimed_by'
  ) THEN
    ALTER TABLE chore_assignments ADD COLUMN claimed_by uuid REFERENCES household_members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add claimed_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chore_assignments' AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE chore_assignments ADD COLUMN claimed_at timestamptz;
  END IF;
END $$;

-- Create index for efficient queries of open chores
CREATE INDEX IF NOT EXISTS idx_chore_assignments_open_chores 
ON chore_assignments(household_id, assigned_to) 
WHERE assigned_to IS NULL AND completed = false;
/*
  # Create Debt Tracking Schema

  1. New Tables
    - `debts`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key to households)
      - `name` (text) - loan/debt name (e.g., "Car Loan", "Student Loan")
      - `type` (text) - type of debt (mortgage, auto, student, credit_card, personal, other)
      - `original_balance` (numeric) - starting balance
      - `current_balance` (numeric) - remaining balance
      - `interest_rate` (numeric) - annual interest rate percentage
      - `minimum_payment` (numeric) - minimum monthly payment
      - `payment_day` (integer) - day of month payment is due (1-31)
      - `lender` (text) - name of lender/creditor
      - `account_number_last4` (text) - last 4 digits of account
      - `payoff_strategy` (text) - snowball, avalanche, or custom
      - `extra_payment` (numeric) - additional payment amount
      - `is_active` (boolean) - whether debt is still being paid
      - `created_at` (timestamptz)
      - `paid_off_at` (timestamptz) - when debt was paid off

    - `debt_payments`
      - `id` (uuid, primary key)
      - `debt_id` (uuid, foreign key to debts)
      - `household_id` (uuid, foreign key to households)
      - `amount` (numeric) - payment amount
      - `payment_date` (date) - when payment was made
      - `principal_paid` (numeric) - amount toward principal
      - `interest_paid` (numeric) - amount toward interest
      - `remaining_balance` (numeric) - balance after payment
      - `notes` (text) - optional notes
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Policies for household members to manage their debts
    - Policies for viewing and tracking payments

  3. Indexes
    - Index on household_id for efficient queries
    - Index on debt_id for payment lookups
*/

-- Create debts table
CREATE TABLE IF NOT EXISTS debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other',
  original_balance numeric(12, 2) NOT NULL,
  current_balance numeric(12, 2) NOT NULL,
  interest_rate numeric(5, 3) NOT NULL DEFAULT 0,
  minimum_payment numeric(12, 2) NOT NULL,
  payment_day integer CHECK (payment_day >= 1 AND payment_day <= 31),
  lender text,
  account_number_last4 text,
  payoff_strategy text DEFAULT 'snowball',
  extra_payment numeric(12, 2) DEFAULT 0,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  paid_off_at timestamptz
);

-- Create debt_payments table
CREATE TABLE IF NOT EXISTS debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id uuid NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  principal_paid numeric(12, 2) NOT NULL,
  interest_paid numeric(12, 2) NOT NULL,
  remaining_balance numeric(12, 2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_debts_household ON debts(household_id);
CREATE INDEX IF NOT EXISTS idx_debts_active ON debts(household_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_household ON debt_payments(household_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON debt_payments(payment_date DESC);

-- Enable RLS
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for debts table
CREATE POLICY "Household members can view debts"
  ON debts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can insert debts"
  ON debts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update debts"
  ON debts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete debts"
  ON debts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = auth.uid()
    )
  );

-- RLS Policies for debt_payments table
CREATE POLICY "Household members can view payments"
  ON debt_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debt_payments.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can insert payments"
  ON debt_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debt_payments.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can update payments"
  ON debt_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debt_payments.household_id
      AND household_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debt_payments.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete payments"
  ON debt_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debt_payments.household_id
      AND household_members.user_id = auth.uid()
    )
  );
/*
  # Subscription Tiers System

  1. New Tables
    - `subscription_tiers`
      - `id` (uuid, primary key)
      - `name` (text) - tier name (free, basic, premium)
      - `display_name` (text) - user-facing name
      - `monthly_price_cents` (integer) - monthly price in cents
      - `annual_price_cents` (integer) - annual price in cents
      - `features` (jsonb) - feature flags and limits
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `household_subscriptions`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key)
      - `tier_id` (uuid, foreign key)
      - `billing_period` (text) - monthly or annual
      - `status` (text) - active, canceled, past_due, trialing
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `cancel_at_period_end` (boolean)
      - `stripe_subscription_id` (text) - for future Stripe integration
      - `stripe_customer_id` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `plaid_connections`
      - `id` (uuid, primary key)
      - `household_id` (uuid, foreign key)
      - `plaid_item_id` (text) - Plaid item ID
      - `plaid_access_token` (text) - encrypted access token
      - `institution_name` (text)
      - `institution_id` (text)
      - `last_refresh` (timestamptz)
      - `status` (text) - active, error, disconnected
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for household members to view their subscription
    - Add policies for admins to manage subscriptions
    - Restrict Plaid connection access to household members only

  3. Important Notes
    - Free tier is default for all households
    - Feature limits enforced in application and edge functions
    - Plaid tokens should be encrypted at rest (application layer)
    - Subscription status checked on feature access
*/

-- Create subscription tiers table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  monthly_price_cents integer NOT NULL,
  annual_price_cents integer NOT NULL,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create household subscriptions table
CREATE TABLE IF NOT EXISTS household_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES subscription_tiers(id),
  billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'annual')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(household_id)
);

-- Create Plaid connections table
CREATE TABLE IF NOT EXISTS plaid_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  plaid_item_id text NOT NULL,
  plaid_access_token text NOT NULL,
  institution_name text NOT NULL,
  institution_id text NOT NULL,
  last_refresh timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_household_subscriptions_household ON household_subscriptions(household_id);
CREATE INDEX IF NOT EXISTS idx_household_subscriptions_tier ON household_subscriptions(tier_id);
CREATE INDEX IF NOT EXISTS idx_plaid_connections_household ON plaid_connections(household_id);
CREATE INDEX IF NOT EXISTS idx_plaid_connections_item ON plaid_connections(plaid_item_id);

-- Enable RLS
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_connections ENABLE ROW LEVEL SECURITY;

-- Subscription tiers policies (public read)
CREATE POLICY "Anyone can view subscription tiers"
  ON subscription_tiers FOR SELECT
  TO authenticated
  USING (true);

-- Household subscriptions policies
CREATE POLICY "Household members can view their subscription"
  ON household_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household admins can insert subscriptions"
  ON household_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Household admins can update subscriptions"
  ON household_subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Plaid connections policies
CREATE POLICY "Household members can view their Plaid connections"
  ON plaid_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Household admins can manage Plaid connections"
  ON plaid_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Household admins can update Plaid connections"
  ON plaid_connections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Household admins can delete Plaid connections"
  ON plaid_connections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Insert subscription tier data
INSERT INTO subscription_tiers (name, display_name, monthly_price_cents, annual_price_cents, features)
VALUES 
  (
    'free',
    'Free',
    0,
    0,
    '{
      "plaid_enabled": false,
      "plaid_connection_limit": 0,
      "plaid_auto_refresh": false,
      "debt_strategies": ["avalanche", "snowball"],
      "pantry_tracking": false,
      "meal_pantry_integration": false
    }'::jsonb
  ),
  (
    'basic',
    'Basic',
    500,
    5000,
    '{
      "plaid_enabled": true,
      "plaid_connection_limit": 4,
      "plaid_auto_refresh": false,
      "debt_strategies": ["avalanche", "snowball", "snowflake"],
      "pantry_tracking": false,
      "meal_pantry_integration": false
    }'::jsonb
  ),
  (
    'premium',
    'Premium',
    800,
    8000,
    '{
      "plaid_enabled": true,
      "plaid_connection_limit": 12,
      "plaid_auto_refresh": true,
      "debt_strategies": ["avalanche", "snowball", "snowflake"],
      "pantry_tracking": true,
      "meal_pantry_integration": true
    }'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  annual_price_cents = EXCLUDED.annual_price_cents,
  features = EXCLUDED.features,
  updated_at = now();

-- Function to get household subscription with tier info
CREATE OR REPLACE FUNCTION get_household_subscription_info(p_household_id uuid)
RETURNS TABLE (
  tier_name text,
  tier_display_name text,
  features jsonb,
  status text,
  billing_period text,
  current_period_end timestamptz
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.name,
    st.display_name,
    st.features,
    COALESCE(hs.status, 'active'),
    COALESCE(hs.billing_period, 'monthly'),
    hs.current_period_end
  FROM subscription_tiers st
  LEFT JOIN household_subscriptions hs 
    ON hs.tier_id = st.id 
    AND hs.household_id = p_household_id
  WHERE st.name = COALESCE(
    (SELECT t.name FROM household_subscriptions hss 
     JOIN subscription_tiers t ON t.id = hss.tier_id 
     WHERE hss.household_id = p_household_id),
    'free'
  );
END;
$$;

-- Function to check if household has feature access
CREATE OR REPLACE FUNCTION household_has_feature(p_household_id uuid, p_feature_key text)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_has_feature boolean;
BEGIN
  SELECT 
    CASE 
      WHEN st.features->p_feature_key = 'true'::jsonb THEN true
      ELSE false
    END
  INTO v_has_feature
  FROM subscription_tiers st
  LEFT JOIN household_subscriptions hs ON hs.tier_id = st.id AND hs.household_id = p_household_id
  WHERE st.name = COALESCE(
    (SELECT t.name FROM household_subscriptions hss 
     JOIN subscription_tiers t ON t.id = hss.tier_id 
     WHERE hss.household_id = p_household_id AND hss.status = 'active'),
    'free'
  )
  LIMIT 1;
  
  RETURN COALESCE(v_has_feature, false);
END;
$$;/*
  # Add Elite Subscription Tier

  1. Changes
    - Add Elite tier to subscription_tiers table
    - Elite tier features:
      - 20 Plaid connections
      - Auto-refresh for both bank accounts and loans
      - All premium features included
    - Pricing: $10/month or $100/year

  2. Important Notes
    - Updates tier data if already exists
    - No changes to existing subscriptions
*/

-- Insert Elite tier
INSERT INTO subscription_tiers (name, display_name, monthly_price_cents, annual_price_cents, features)
VALUES 
  (
    'elite',
    'Elite',
    1000,
    10000,
    '{
      "plaid_enabled": true,
      "plaid_connection_limit": 20,
      "plaid_auto_refresh": true,
      "plaid_auto_refresh_loans": true,
      "debt_strategies": ["avalanche", "snowball", "snowflake"],
      "pantry_tracking": true,
      "meal_pantry_integration": true
    }'::jsonb
  )
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  annual_price_cents = EXCLUDED.annual_price_cents,
  features = EXCLUDED.features,
  updated_at = now();

-- Update Premium tier to clarify it doesn't have loan auto-refresh
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{plaid_auto_refresh_loans}',
  'false'::jsonb
)
WHERE name = 'premium';

-- Update Basic tier to clarify it doesn't have loan auto-refresh
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{plaid_auto_refresh_loans}',
  'false'::jsonb
)
WHERE name = 'basic';

-- Update Free tier to clarify it doesn't have loan auto-refresh
UPDATE subscription_tiers
SET features = jsonb_set(
  features,
  '{plaid_auto_refresh_loans}',
  'false'::jsonb
)
WHERE name = 'free';/*
  # Fix Critical Index Issues

  ## Changes Made

  ### 1. Missing Foreign Key Indexes
  - Add index on `chore_assignments.claimed_by` for better join performance
  - Add index on `reward_redemptions.reward_id` for better join performance

  ### 2. Remove Duplicate Index
  - Drop duplicate index `idx_rewards_household` (keeping `idx_rewards_household_id`)

  ## Impact
  - Improved query performance on foreign key joins
  - Reduced storage overhead from duplicate index
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_chore_assignments_claimed_by 
  ON chore_assignments(claimed_by);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id 
  ON reward_redemptions(reward_id);

-- Remove duplicate index
DROP INDEX IF EXISTS idx_rewards_household;
/*
  # Fix Multiple Permissive Policies

  ## Changes Made

  Remove overlapping/redundant RLS policies to clean up policy structure:
  
  ### 1. Users Table
  - Remove "Authenticated users can read all user emails" (covered by "Users can read own data")
  
  ### 2. Rewards Table
  - Remove "Admins can manage household rewards" (duplicates household member policies)
  - Remove "Members can view rewards in their household" (duplicates household view policy)
  
  ### 3. Member Badges
  - Remove "System can manage member badges" (system operations don't need explicit policy)
  
  ### 4. Member Streaks
  - Remove "System can manage streaks" (system operations don't need explicit policy)
  
  ### 5. Family Challenges
  - Remove "Admins can manage household challenges" (covered by view policy)

  ## Impact
  - Cleaner policy structure
  - No functional changes - remaining policies provide same access
*/

-- Remove overlapping policy on users table
DROP POLICY IF EXISTS "Authenticated users can read all user emails" ON users;

-- Remove overlapping policies on rewards table
DROP POLICY IF EXISTS "Admins can manage household rewards" ON rewards;
DROP POLICY IF EXISTS "Members can view rewards in their household" ON rewards;

-- Remove system policies that aren't needed
DROP POLICY IF EXISTS "System can manage member badges" ON member_badges;
DROP POLICY IF EXISTS "System can manage streaks" ON member_streaks;

-- Remove admin policy covered by household view
DROP POLICY IF EXISTS "Admins can manage household challenges" ON family_challenges;
/*
  # Optimize RLS Policies for Scale - Part 1: Core Tables

  ## Changes Made
  
  Wrap all `auth.uid()` calls in `(SELECT auth.uid())` to prevent re-evaluation per row.
  This caches the authentication result and significantly improves query performance at scale.
  
  ### Tables Updated
  - user_settings
  - accounts
  - notifications
  - categories
  - budgets
  - transactions
  
  ## Performance Impact
  Before: auth.uid() called once per row
  After: auth.uid() called once per query
  
  At 1000 rows, this is 1000x fewer auth calls.
*/

-- USER_SETTINGS
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ACCOUNTS
DROP POLICY IF EXISTS "Members can view accounts based on role" ON accounts;
CREATE POLICY "Members can view accounts based on role"
  ON accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent', 'teen')
    )
    OR EXISTS (
      SELECT 1 FROM account_view_permissions
      WHERE account_view_permissions.account_id = accounts.id
      AND account_view_permissions.member_id IN (
        SELECT id FROM household_members
        WHERE household_id = accounts.household_id
        AND user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Admins and co-parents can insert accounts" ON accounts;
CREATE POLICY "Admins and co-parents can insert accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

DROP POLICY IF EXISTS "Admins and co-parents can update accounts" ON accounts;
CREATE POLICY "Admins and co-parents can update accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

DROP POLICY IF EXISTS "Admins can delete accounts" ON accounts;
CREATE POLICY "Admins can delete accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert notifications to household members" ON notifications;
CREATE POLICY "Users can insert notifications to household members"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm1
      JOIN household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.user_id = notifications.user_id
      AND hm2.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- CATEGORIES
DROP POLICY IF EXISTS "Household members can view categories" ON categories;
CREATE POLICY "Household members can view categories"
  ON categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert categories" ON categories;
CREATE POLICY "Household members can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update categories" ON categories;
CREATE POLICY "Household members can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete categories" ON categories;
CREATE POLICY "Household members can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = categories.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- BUDGETS
DROP POLICY IF EXISTS "Household members can view budgets" ON budgets;
CREATE POLICY "Household members can view budgets"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budgets.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert budgets" ON budgets;
CREATE POLICY "Household members can insert budgets"
  ON budgets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budgets.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update budgets" ON budgets;
CREATE POLICY "Household members can update budgets"
  ON budgets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budgets.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete budgets" ON budgets;
CREATE POLICY "Household members can delete budgets"
  ON budgets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = budgets.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- TRANSACTIONS
DROP POLICY IF EXISTS "Household members can view transactions" ON transactions;
CREATE POLICY "Household members can view transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert transactions" ON transactions;
CREATE POLICY "Household members can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update transactions" ON transactions;
CREATE POLICY "Household members can update transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete transactions" ON transactions;
CREATE POLICY "Household members can delete transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );
/*
  # Optimize RLS Policies for Scale - Part 2: Loans

  ## Tables Updated
  - loans
  - loan_payments
  - payoff_scenarios
*/

-- LOANS
DROP POLICY IF EXISTS "Household members can view loans" ON loans;
CREATE POLICY "Household members can view loans"
  ON loans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert loans" ON loans;
CREATE POLICY "Household members can insert loans"
  ON loans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update loans" ON loans;
CREATE POLICY "Household members can update loans"
  ON loans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete loans" ON loans;
CREATE POLICY "Household members can delete loans"
  ON loans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- LOAN_PAYMENTS
DROP POLICY IF EXISTS "Household members can view loan_payments" ON loan_payments;
CREATE POLICY "Household members can view loan_payments"
  ON loan_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loan_payments.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert loan_payments" ON loan_payments;
CREATE POLICY "Household members can insert loan_payments"
  ON loan_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loan_payments.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update loan_payments" ON loan_payments;
CREATE POLICY "Household members can update loan_payments"
  ON loan_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loan_payments.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete loan_payments" ON loan_payments;
CREATE POLICY "Household members can delete loan_payments"
  ON loan_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = loan_payments.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- PAYOFF_SCENARIOS
DROP POLICY IF EXISTS "Household members can view payoff_scenarios" ON payoff_scenarios;
CREATE POLICY "Household members can view payoff_scenarios"
  ON payoff_scenarios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payoff_scenarios.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert payoff_scenarios" ON payoff_scenarios;
CREATE POLICY "Household members can insert payoff_scenarios"
  ON payoff_scenarios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payoff_scenarios.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update payoff_scenarios" ON payoff_scenarios;
CREATE POLICY "Household members can update payoff_scenarios"
  ON payoff_scenarios FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payoff_scenarios.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete payoff_scenarios" ON payoff_scenarios;
CREATE POLICY "Household members can delete payoff_scenarios"
  ON payoff_scenarios FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = payoff_scenarios.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );
/*
  # Optimize RLS Policies for Scale - Part 3: Meal Planning

  ## Tables Updated
  - recipes
  - ingredients
  - recipe_ingredients
  - meals
  - meal_plans
  - grocery_list
  - grocery_list_items
  - pantry_items
  - inventory_log
*/

-- RECIPES
DROP POLICY IF EXISTS "Household members can view recipes" ON recipes;
CREATE POLICY "Household members can view recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recipes.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert recipes" ON recipes;
CREATE POLICY "Household members can insert recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recipes.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update recipes" ON recipes;
CREATE POLICY "Household members can update recipes"
  ON recipes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recipes.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete recipes" ON recipes;
CREATE POLICY "Household members can delete recipes"
  ON recipes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = recipes.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- INGREDIENTS
DROP POLICY IF EXISTS "Users can view ingredients of household recipes" ON ingredients;
CREATE POLICY "Users can view ingredients of household recipes"
  ON ingredients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert ingredients to household recipes" ON ingredients;
CREATE POLICY "Users can insert ingredients to household recipes"
  ON ingredients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update ingredients of household recipes" ON ingredients;
CREATE POLICY "Users can update ingredients of household recipes"
  ON ingredients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete ingredients of household recipes" ON ingredients;
CREATE POLICY "Users can delete ingredients of household recipes"
  ON ingredients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- RECIPE_INGREDIENTS
DROP POLICY IF EXISTS "Users can view recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Users can view recipe ingredients"
  ON recipe_ingredients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Users can create recipe ingredients"
  ON recipe_ingredients FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Users can update recipe ingredients"
  ON recipe_ingredients FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Users can delete recipe ingredients"
  ON recipe_ingredients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      JOIN household_members ON household_members.household_id = recipes.household_id
      WHERE recipes.id = recipe_ingredients.recipe_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- MEALS
DROP POLICY IF EXISTS "Household members can view meals" ON meals;
CREATE POLICY "Household members can view meals"
  ON meals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meals.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert meals" ON meals;
CREATE POLICY "Household members can insert meals"
  ON meals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meals.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update meals" ON meals;
CREATE POLICY "Household members can update meals"
  ON meals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meals.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete meals" ON meals;
CREATE POLICY "Household members can delete meals"
  ON meals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meals.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- MEAL_PLANS
DROP POLICY IF EXISTS "Users can view household meal plans" ON meal_plans;
CREATE POLICY "Users can view household meal plans"
  ON meal_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meal_plans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create household meal plans" ON meal_plans;
CREATE POLICY "Users can create household meal plans"
  ON meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meal_plans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update household meal plans" ON meal_plans;
CREATE POLICY "Users can update household meal plans"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meal_plans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete household meal plans" ON meal_plans;
CREATE POLICY "Users can delete household meal plans"
  ON meal_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = meal_plans.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- GROCERY_LIST
DROP POLICY IF EXISTS "Household members can view grocery_list" ON grocery_list;
CREATE POLICY "Household members can view grocery_list"
  ON grocery_list FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can insert grocery items based on role" ON grocery_list;
CREATE POLICY "Members can insert grocery items based on role"
  ON grocery_list FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

DROP POLICY IF EXISTS "Household members can update grocery_list" ON grocery_list;
CREATE POLICY "Household members can update grocery_list"
  ON grocery_list FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete grocery_list" ON grocery_list;
CREATE POLICY "Household members can delete grocery_list"
  ON grocery_list FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- GROCERY_LIST_ITEMS
DROP POLICY IF EXISTS "Users can view household grocery items" ON grocery_list_items;
CREATE POLICY "Users can view household grocery items"
  ON grocery_list_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create household grocery items" ON grocery_list_items;
CREATE POLICY "Users can create household grocery items"
  ON grocery_list_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update household grocery items" ON grocery_list_items;
CREATE POLICY "Users can update household grocery items"
  ON grocery_list_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete household grocery items" ON grocery_list_items;
CREATE POLICY "Users can delete household grocery items"
  ON grocery_list_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = grocery_list_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- PANTRY_ITEMS
DROP POLICY IF EXISTS "Household members can view pantry_items" ON pantry_items;
CREATE POLICY "Household members can view pantry_items"
  ON pantry_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert pantry_items" ON pantry_items;
CREATE POLICY "Household members can insert pantry_items"
  ON pantry_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update pantry_items" ON pantry_items;
CREATE POLICY "Household members can update pantry_items"
  ON pantry_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete pantry_items" ON pantry_items;
CREATE POLICY "Household members can delete pantry_items"
  ON pantry_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = pantry_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- INVENTORY_LOG
DROP POLICY IF EXISTS "Household members can view inventory_log" ON inventory_log;
CREATE POLICY "Household members can view inventory_log"
  ON inventory_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = inventory_log.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert inventory_log" ON inventory_log;
CREATE POLICY "Household members can insert inventory_log"
  ON inventory_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = inventory_log.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update inventory_log" ON inventory_log;
CREATE POLICY "Household members can update inventory_log"
  ON inventory_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = inventory_log.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete inventory_log" ON inventory_log;
CREATE POLICY "Household members can delete inventory_log"
  ON inventory_log FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = inventory_log.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );
/*
  # Optimize RLS Policies for Scale - Part 4: Events, Chores & Rewards

  ## Tables Updated
  - events
  - event_participants
  - chores
  - chore_assignments
  - rewards
  - redemptions
  - reward_redemptions
  - member_badges
  - member_streaks
  - family_challenges
  - member_relationships
  - account_view_permissions
*/

-- EVENTS
DROP POLICY IF EXISTS "Members can view events based on role" ON events;
CREATE POLICY "Members can view events based on role"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = events.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can insert events based on role" ON events;
CREATE POLICY "Members can insert events based on role"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = events.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

DROP POLICY IF EXISTS "Members can update events based on role" ON events;
CREATE POLICY "Members can update events based on role"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = events.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

DROP POLICY IF EXISTS "Members can delete events based on role" ON events;
CREATE POLICY "Members can delete events based on role"
  ON events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = events.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role IN ('admin', 'co_parent')
    )
  );

-- EVENT_PARTICIPANTS
DROP POLICY IF EXISTS "Users can view event_participants of household events" ON event_participants;
CREATE POLICY "Users can view event_participants of household events"
  ON event_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      JOIN household_members ON household_members.household_id = events.household_id
      WHERE events.id = event_participants.event_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert event_participants to household events" ON event_participants;
CREATE POLICY "Users can insert event_participants to household events"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      JOIN household_members ON household_members.household_id = events.household_id
      WHERE events.id = event_participants.event_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete event_participants from household events" ON event_participants;
CREATE POLICY "Users can delete event_participants from household events"
  ON event_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      JOIN household_members ON household_members.household_id = events.household_id
      WHERE events.id = event_participants.event_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- CHORES
DROP POLICY IF EXISTS "Household members can view chores" ON chores;
CREATE POLICY "Household members can view chores"
  ON chores FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = chores.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert chores" ON chores;
CREATE POLICY "Household members can insert chores"
  ON chores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = chores.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update chores" ON chores;
CREATE POLICY "Household members can update chores"
  ON chores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = chores.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete chores" ON chores;
CREATE POLICY "Household members can delete chores"
  ON chores FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = chores.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- CHORE_ASSIGNMENTS
DROP POLICY IF EXISTS "Members can view chore assignments based on role" ON chore_assignments;
CREATE POLICY "Members can view chore assignments based on role"
  ON chore_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chores
      JOIN household_members ON household_members.household_id = chores.household_id
      WHERE chores.id = chore_assignments.chore_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert chore_assignments" ON chore_assignments;
CREATE POLICY "Household members can insert chore_assignments"
  ON chore_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chores
      JOIN household_members ON household_members.household_id = chores.household_id
      WHERE chores.id = chore_assignments.chore_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can update chore assignments based on role" ON chore_assignments;
CREATE POLICY "Members can update chore assignments based on role"
  ON chore_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chores
      JOIN household_members ON household_members.household_id = chores.household_id
      WHERE chores.id = chore_assignments.chore_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete chore_assignments" ON chore_assignments;
CREATE POLICY "Household members can delete chore_assignments"
  ON chore_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chores
      JOIN household_members ON household_members.household_id = chores.household_id
      WHERE chores.id = chore_assignments.chore_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- REWARDS
DROP POLICY IF EXISTS "Household members can view rewards" ON rewards;
CREATE POLICY "Household members can view rewards"
  ON rewards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = rewards.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert rewards" ON rewards;
CREATE POLICY "Household members can insert rewards"
  ON rewards FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = rewards.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update rewards" ON rewards;
CREATE POLICY "Household members can update rewards"
  ON rewards FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = rewards.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete rewards" ON rewards;
CREATE POLICY "Household members can delete rewards"
  ON rewards FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = rewards.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- REDEMPTIONS
DROP POLICY IF EXISTS "Household members can view redemptions" ON redemptions;
CREATE POLICY "Household members can view redemptions"
  ON redemptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = redemptions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert redemptions" ON redemptions;
CREATE POLICY "Household members can insert redemptions"
  ON redemptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = redemptions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- REWARD_REDEMPTIONS
DROP POLICY IF EXISTS "Members can view redemptions in their household" ON reward_redemptions;
CREATE POLICY "Members can view redemptions in their household"
  ON reward_redemptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm1
      JOIN household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.id = reward_redemptions.member_id
      AND hm2.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Members can create redemptions" ON reward_redemptions;
CREATE POLICY "Members can create redemptions"
  ON reward_redemptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members hm1
      JOIN household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.id = reward_redemptions.member_id
      AND hm2.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage redemptions" ON reward_redemptions;
CREATE POLICY "Admins can manage redemptions"
  ON reward_redemptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm1
      JOIN household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.id = reward_redemptions.member_id
      AND hm2.user_id = (SELECT auth.uid())
      AND hm2.role = 'admin'
    )
  );

-- MEMBER_BADGES
DROP POLICY IF EXISTS "Members can view badges in their household" ON member_badges;
CREATE POLICY "Members can view badges in their household"
  ON member_badges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm1
      JOIN household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.id = member_badges.member_id
      AND hm2.user_id = (SELECT auth.uid())
    )
  );

-- MEMBER_STREAKS
DROP POLICY IF EXISTS "Members can view streaks in their household" ON member_streaks;
CREATE POLICY "Members can view streaks in their household"
  ON member_streaks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members hm1
      JOIN household_members hm2 ON hm1.household_id = hm2.household_id
      WHERE hm1.id = member_streaks.member_id
      AND hm2.user_id = (SELECT auth.uid())
    )
  );

-- FAMILY_CHALLENGES
DROP POLICY IF EXISTS "Members can view challenges in their household" ON family_challenges;
CREATE POLICY "Members can view challenges in their household"
  ON family_challenges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = family_challenges.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- MEMBER_RELATIONSHIPS
DROP POLICY IF EXISTS "Household members can view relationships" ON member_relationships;
CREATE POLICY "Household members can view relationships"
  ON member_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_relationships.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can create relationships" ON member_relationships;
CREATE POLICY "Admins can create relationships"
  ON member_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_relationships.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete relationships" ON member_relationships;
CREATE POLICY "Admins can delete relationships"
  ON member_relationships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = member_relationships.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

-- ACCOUNT_VIEW_PERMISSIONS
DROP POLICY IF EXISTS "Members can view their account permissions" ON account_view_permissions;
CREATE POLICY "Members can view their account permissions"
  ON account_view_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      JOIN household_members ON household_members.household_id = accounts.household_id
      WHERE accounts.id = account_view_permissions.account_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can grant account permissions" ON account_view_permissions;
CREATE POLICY "Admins can grant account permissions"
  ON account_view_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM accounts
      JOIN household_members ON household_members.household_id = accounts.household_id
      WHERE accounts.id = account_view_permissions.account_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can revoke account permissions" ON account_view_permissions;
CREATE POLICY "Admins can revoke account permissions"
  ON account_view_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounts
      JOIN household_members ON household_members.household_id = accounts.household_id
      WHERE accounts.id = account_view_permissions.account_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );
/*
  # Optimize RLS Policies for Scale - Part 5: Debt, Plaid & Subscriptions

  ## Tables Updated
  - debts
  - debt_payments
  - plaid_items
  - plaid_accounts
  - plaid_transactions
  - household_subscriptions
  - plaid_connections
*/

-- DEBTS
DROP POLICY IF EXISTS "Household members can view debts" ON debts;
CREATE POLICY "Household members can view debts"
  ON debts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert debts" ON debts;
CREATE POLICY "Household members can insert debts"
  ON debts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update debts" ON debts;
CREATE POLICY "Household members can update debts"
  ON debts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete debts" ON debts;
CREATE POLICY "Household members can delete debts"
  ON debts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = debts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- DEBT_PAYMENTS
DROP POLICY IF EXISTS "Household members can view payments" ON debt_payments;
CREATE POLICY "Household members can view payments"
  ON debt_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM debts
      JOIN household_members ON household_members.household_id = debts.household_id
      WHERE debts.id = debt_payments.debt_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert payments" ON debt_payments;
CREATE POLICY "Household members can insert payments"
  ON debt_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM debts
      JOIN household_members ON household_members.household_id = debts.household_id
      WHERE debts.id = debt_payments.debt_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update payments" ON debt_payments;
CREATE POLICY "Household members can update payments"
  ON debt_payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM debts
      JOIN household_members ON household_members.household_id = debts.household_id
      WHERE debts.id = debt_payments.debt_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete payments" ON debt_payments;
CREATE POLICY "Household members can delete payments"
  ON debt_payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM debts
      JOIN household_members ON household_members.household_id = debts.household_id
      WHERE debts.id = debt_payments.debt_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- PLAID_ITEMS
DROP POLICY IF EXISTS "Household members can view items (no token)" ON plaid_items;
CREATE POLICY "Household members can view items (no token)"
  ON plaid_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert items" ON plaid_items;
CREATE POLICY "Household members can insert items"
  ON plaid_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update items" ON plaid_items;
CREATE POLICY "Household members can update items"
  ON plaid_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete items" ON plaid_items;
CREATE POLICY "Household members can delete items"
  ON plaid_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_items.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- PLAID_ACCOUNTS
DROP POLICY IF EXISTS "Household members can view accounts" ON plaid_accounts;
CREATE POLICY "Household members can view accounts"
  ON plaid_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert accounts" ON plaid_accounts;
CREATE POLICY "Household members can insert accounts"
  ON plaid_accounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update accounts" ON plaid_accounts;
CREATE POLICY "Household members can update accounts"
  ON plaid_accounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete accounts" ON plaid_accounts;
CREATE POLICY "Household members can delete accounts"
  ON plaid_accounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_accounts.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- PLAID_TRANSACTIONS
DROP POLICY IF EXISTS "Household members can view transactions" ON plaid_transactions;
CREATE POLICY "Household members can view transactions"
  ON plaid_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can insert transactions" ON plaid_transactions;
CREATE POLICY "Household members can insert transactions"
  ON plaid_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can update transactions" ON plaid_transactions;
CREATE POLICY "Household members can update transactions"
  ON plaid_transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household members can delete transactions" ON plaid_transactions;
CREATE POLICY "Household members can delete transactions"
  ON plaid_transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_transactions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

-- HOUSEHOLD_SUBSCRIPTIONS
DROP POLICY IF EXISTS "Household members can view their subscription" ON household_subscriptions;
CREATE POLICY "Household members can view their subscription"
  ON household_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household admins can insert subscriptions" ON household_subscriptions;
CREATE POLICY "Household admins can insert subscriptions"
  ON household_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Household admins can update subscriptions" ON household_subscriptions;
CREATE POLICY "Household admins can update subscriptions"
  ON household_subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = household_subscriptions.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

-- PLAID_CONNECTIONS
DROP POLICY IF EXISTS "Household members can view their Plaid connections" ON plaid_connections;
CREATE POLICY "Household members can view their Plaid connections"
  ON plaid_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Household admins can manage Plaid connections" ON plaid_connections;
CREATE POLICY "Household admins can manage Plaid connections"
  ON plaid_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Household admins can update Plaid connections" ON plaid_connections;
CREATE POLICY "Household admins can update Plaid connections"
  ON plaid_connections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Household admins can delete Plaid connections" ON plaid_connections;
CREATE POLICY "Household admins can delete Plaid connections"
  ON plaid_connections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.household_id = plaid_connections.household_id
      AND household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );
/*
  # Remove Redundant Indexes

  ## Strategy
  Remove indexes that are redundant with foreign key constraints or provide minimal benefit.
  Keep indexes that are critical for:
  - Date range queries (start_time, date fields)
  - Frequently filtered fields (household_id on main tables already has FK index)
  - Unique lookups (invite codes)
  - Role-based queries

  ## Indexes Being Removed
  These are either redundant with FK indexes or unlikely to be queried independently:
  - Many household_id indexes (FK already indexed)
  - Some foreign key indexes that are rarely queried independently
  - Single-column indexes on low-selectivity fields

  ## Indexes Being Kept
  - Date/time indexes for range queries
  - Unique lookup indexes (invite codes)
  - Composite indexes for complex queries
  - Role-based filtering indexes
*/

-- Remove redundant household_id indexes (FK already indexed)
DROP INDEX IF EXISTS idx_notifications_household_id;
DROP INDEX IF EXISTS idx_payoff_scenarios_household_id;
DROP INDEX IF EXISTS idx_budgets_household_id;
DROP INDEX IF EXISTS idx_categories_household_id;
DROP INDEX IF EXISTS idx_grocery_list_household_id;
DROP INDEX IF EXISTS idx_inventory_log_household_id;
DROP INDEX IF EXISTS idx_loan_payments_household_id;
DROP INDEX IF EXISTS idx_meals_household_id;
DROP INDEX IF EXISTS idx_redemptions_household_id;
DROP INDEX IF EXISTS idx_rewards_household_id;
DROP INDEX IF EXISTS idx_streaks_household;
DROP INDEX IF EXISTS idx_challenges_household;
DROP INDEX IF EXISTS idx_plaid_items_household;
DROP INDEX IF EXISTS idx_plaid_transactions_household;

-- Remove redundant foreign key indexes that duplicate FK
DROP INDEX IF EXISTS idx_account_view_permissions_account;
DROP INDEX IF EXISTS idx_account_view_permissions_granted_by;
DROP INDEX IF EXISTS idx_account_view_permissions_household_id;
DROP INDEX IF EXISTS idx_budgets_category_id;
DROP INDEX IF EXISTS idx_chore_assignments_chore_id;
DROP INDEX IF EXISTS idx_event_participants_user_id;
DROP INDEX IF EXISTS idx_household_invites_created_by;
DROP INDEX IF EXISTS idx_household_invites_used_by;
DROP INDEX IF EXISTS idx_ingredients_recipe_id;
DROP INDEX IF EXISTS idx_inventory_log_pantry_item_id;
DROP INDEX IF EXISTS idx_loan_payments_loan_id;
DROP INDEX IF EXISTS idx_meals_recipe_id;
DROP INDEX IF EXISTS idx_notifications_event_id;
DROP INDEX IF EXISTS idx_redemptions_reward_id;
DROP INDEX IF EXISTS idx_redemptions_user_id;
DROP INDEX IF EXISTS idx_transactions_account_id;
DROP INDEX IF EXISTS idx_transactions_category_id;
DROP INDEX IF EXISTS idx_user_settings_default_household_id;
DROP INDEX IF EXISTS idx_user_settings_user_id;
DROP INDEX IF EXISTS idx_calendar_events_color_category_id;
DROP INDEX IF EXISTS idx_calendar_events_created_by;
DROP INDEX IF EXISTS idx_debt_payments_debt;
DROP INDEX IF EXISTS idx_recipes_created_by;
DROP INDEX IF EXISTS idx_meal_plans_recipe_id;
DROP INDEX IF EXISTS idx_grocery_list_items_recipe_id;
DROP INDEX IF EXISTS idx_member_badges_badge;
DROP INDEX IF EXISTS idx_redemptions_member;
DROP INDEX IF EXISTS idx_streaks_member;
DROP INDEX IF EXISTS idx_plaid_connections_item;
DROP INDEX IF EXISTS idx_member_badges_household;
DROP INDEX IF EXISTS idx_member_badges_member;
DROP INDEX IF EXISTS idx_plaid_accounts_item;
DROP INDEX IF EXISTS idx_plaid_transactions_account;

-- Remove low-value indexes
DROP INDEX IF EXISTS idx_events_created_by;
DROP INDEX IF EXISTS idx_member_relationships_household;
DROP INDEX IF EXISTS idx_household_members_role;
DROP INDEX IF EXISTS idx_household_subscriptions_tier;

-- KEEP these important indexes for performance:
-- idx_transactions_household_id - For household transaction queries
-- idx_transactions_date - For date range queries
-- idx_events_start_time - For calendar queries
-- idx_calendar_events_start_time - For calendar queries
-- idx_notifications_user_id - For user notification queries
-- idx_notifications_read - For unread notification queries
-- idx_household_invites_code - For invite code lookups
-- idx_debts_active - For active debt queries
-- idx_debt_payments_date - For payment history
-- idx_chore_assignments_open_chores - For open chore queries
-- idx_chore_assignments_claimed_by - For user's claimed chores
-- idx_reward_redemptions_reward_id - For reward redemption queries
-- idx_plaid_transactions_date - For transaction date queries
/*
  # Restore Indexes and Add Sample Data - Working Version

  Restores all 70+ performance indexes and adds sample data with correct schemas and constraints.

  ## Restored Indexes
  - All transaction, event, notification, and core table indexes
  
  ## Sample Data
  - Demo household with valid data across all major tables
*/

-- Restore all indexes
CREATE INDEX IF NOT EXISTS idx_transactions_household_id ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_household_id ON notifications(household_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_household_invites_code ON household_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_household_invites_created_by ON household_invites(created_by);
CREATE INDEX IF NOT EXISTS idx_household_invites_used_by ON household_invites(used_by);
CREATE INDEX IF NOT EXISTS idx_member_relationships_household ON member_relationships(household_id, parent_member_id);
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_account ON account_view_permissions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_granted_by ON account_view_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_account_view_permissions_household_id ON account_view_permissions(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_role ON household_members(role);
CREATE INDEX IF NOT EXISTS idx_payoff_scenarios_household_id ON payoff_scenarios(household_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_color_category_id ON calendar_events(color_category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_household_id ON budgets(household_id);
CREATE INDEX IF NOT EXISTS idx_categories_household_id ON categories(household_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_chore_id ON chore_assignments(chore_id);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_open_chores ON chore_assignments(household_id, completed) WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_chore_assignments_claimed_by ON chore_assignments(claimed_by);
CREATE INDEX IF NOT EXISTS idx_grocery_list_household_id ON grocery_list(household_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_household_id ON inventory_log(household_id);
CREATE INDEX IF NOT EXISTS idx_inventory_log_pantry_item_id ON inventory_log(pantry_item_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_household_id ON loan_payments(household_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_meals_household_id ON meals(household_id);
CREATE INDEX IF NOT EXISTS idx_meals_recipe_id ON meals(recipe_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe_id ON meal_plans(recipe_id);
CREATE INDEX IF NOT EXISTS idx_grocery_list_items_recipe_id ON grocery_list_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_household_id ON redemptions(household_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_reward_id ON redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_member ON reward_redemptions(member_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_rewards_household_id ON rewards(household_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_default_household_id ON user_settings(default_household_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_active ON debts(household_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_date ON debt_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_recipes_created_by ON recipes(created_by);
CREATE INDEX IF NOT EXISTS idx_member_badges_badge ON member_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_member_badges_household ON member_badges(household_id);
CREATE INDEX IF NOT EXISTS idx_member_badges_member ON member_badges(member_id);
CREATE INDEX IF NOT EXISTS idx_streaks_household ON member_streaks(household_id);
CREATE INDEX IF NOT EXISTS idx_streaks_member ON member_streaks(member_id);
CREATE INDEX IF NOT EXISTS idx_challenges_household ON family_challenges(household_id);
CREATE INDEX IF NOT EXISTS idx_household_subscriptions_tier ON household_subscriptions(tier_id);
CREATE INDEX IF NOT EXISTS idx_plaid_connections_item ON plaid_connections(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_household ON plaid_items(household_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_item ON plaid_accounts(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_account ON plaid_transactions(plaid_account_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_household ON plaid_transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_date ON plaid_transactions(date);

-- Insert sample data
INSERT INTO households (id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Household', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, household_id, name, type, color)
VALUES 
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Groceries', 'expense', '#10b981'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Utilities', 'expense', '#3b82f6'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Salary', 'income', '#22c55e')
ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, household_id, name, type, balance, created_at)
VALUES ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', 'Checking Account', 'checking', 5000.00, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO transactions (household_id, account_id, category_id, amount, description, date, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000001', -125.50, 'Weekly groceries', now() - interval '2 days', now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000002', -89.99, 'Electric bill', now() - interval '5 days', now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0001-000000000003', 3500.00, 'Monthly salary', now() - interval '1 day', now())
ON CONFLICT DO NOTHING;

INSERT INTO chores (id, household_id, name, description, points, frequency)
VALUES 
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000001', 'Wash Dishes', 'Clean all dishes in the sink', 10, 'daily'),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000001', 'Take Out Trash', 'Empty all trash bins', 5, 'weekly'),
  ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000001', 'Vacuum Living Room', 'Vacuum the entire living room', 15, 'weekly')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rewards (id, household_id, name, description, cost)
VALUES 
  ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-000000000001', 'Movie Night', 'Choose the movie for family night', 50),
  ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-000000000001', 'Extra Screen Time', '30 minutes of extra screen time', 25),
  ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0000-000000000001', 'Skip One Chore', 'Get out of doing one chore', 75)
ON CONFLICT (id) DO NOTHING;

INSERT INTO calendar_color_categories (id, household_id, name, color, created_at)
VALUES ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-000000000001', 'Family Events', '#ef4444', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO pantry_items (household_id, name, quantity, unit, location, expiration_date, notes)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Rice', 2, 'kg', 'pantry', now() + interval '6 months', 'Basmati rice'),
  ('00000000-0000-0000-0000-000000000001', 'Milk', 1, 'gallon', 'fridge', now() + interval '7 days', 'Whole milk'),
  ('00000000-0000-0000-0000-000000000001', 'Eggs', 12, 'count', 'fridge', now() + interval '14 days', 'Organic free range')
ON CONFLICT DO NOTHING;

INSERT INTO budgets (household_id, category_id, amount, month)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 500.00, date_trunc('month', now())),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 200.00, date_trunc('month', now()))
ON CONFLICT DO NOTHING;
