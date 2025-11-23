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
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);