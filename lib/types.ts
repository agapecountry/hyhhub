export type UserRole = 'admin' | 'co-parent' | 'teen' | 'child' | 'member';

export type AccountType = 'checking' | 'savings' | 'credit';
export type CategoryType = 'income' | 'expense';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type StorageLocation = 'pantry' | 'fridge' | 'freezer';
export type InventoryAction = 'added' | 'removed' | 'used';
export type PayoffMethod = 'snowball' | 'avalanche' | 'snowflake';
export type ChoreFrequency = 'daily' | 'weekly' | 'monthly' | 'once';
export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'elite' | 'infprem' | 'infelite';
export type BillingPeriod = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';
export type TransactionType = 'deposit' | 'withdraw';
export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Household {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
}

export interface UserSettings {
  id: string;
  household_id: string;
  user_id: string;
  default_household_id: string | null;
  settings: Record<string, any>;
}

export interface Account {
  id: string;
  household_id: string;
  name: string;
  type: AccountType;
  balance: number;
  plaid_account_id: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  household_id: string;
  name: string;
  type: CategoryType;
  color: string;
}

export interface Budget {
  id: string;
  household_id: string;
  category_id: string;
  month: string;
  amount: number;
}

export interface Transaction {
  id: string;
  household_id: string;
  account_id: string;
  category_id: string | null;
  date: string;
  amount: number;
  description: string;
  plaid_transaction_id: string | null;
  created_at: string;
}

export interface Loan {
  id: string;
  household_id: string;
  name: string;
  balance: number;
  interest_rate: number;
  minimum_payment: number;
  due_day: number | null;
}

export interface LoanPayment {
  id: string;
  household_id: string;
  loan_id: string;
  date: string;
  amount: number;
  principal: number;
  interest: number;
}

export interface PayoffScenario {
  id: string;
  household_id: string;
  name: string;
  method: PayoffMethod;
  extra_payment: number;
  created_at: string;
}

export interface Recipe {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
}

export interface Ingredient {
  id: string;
  recipe_id: string;
  name: string;
  quantity: string;
  unit: string | null;
}

export interface Meal {
  id: string;
  household_id: string;
  recipe_id: string | null;
  date: string;
  meal_type: MealType;
  notes: string | null;
}

export interface GroceryItem {
  id: string;
  household_id: string;
  item: string;
  quantity: string | null;
  category: string | null;
  checked: boolean;
  added_at: string;
}

export interface PantryItem {
  id: string;
  household_id: string;
  name: string;
  quantity: number;
  unit: string;
  location: StorageLocation;
  expiration_date: string | null;
  notes: string | null;
}

export interface InventoryLog {
  id: string;
  household_id: string;
  pantry_item_id: string;
  action: InventoryAction;
  quantity: number;
  date: string;
}

export interface Event {
  id: string;
  household_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  created_by: string | null;
  created_at: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
}

export interface Notification {
  id: string;
  household_id: string;
  user_id: string;
  event_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Chore {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  points: number;
  frequency: ChoreFrequency;
}

export interface ChoreAssignment {
  id: string;
  household_id: string;
  chore_id: string;
  assigned_to: string;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
}

export interface Reward {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  points_cost: number;
}

export interface Redemption {
  id: string;
  household_id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  redeemed_at: string;
}

export interface SubscriptionTierData {
  id: string;
  name: SubscriptionTier;
  display_name: string;
  monthly_price_cents: number;
  annual_price_cents: number;
  is_influencer_tier?: boolean;
  features: {
    plaid_enabled: boolean;
    plaid_connection_limit: number;
    auto_refresh_accounts: boolean;
    auto_refresh_on_load: boolean;
    auto_refresh_loans: boolean;
    manual_refresh_accounts: boolean;
    manual_refresh_loans: boolean;
    debt_strategies: PayoffMethod[];
    personalized_debt_plan: boolean;
    household_multi_user: boolean;
    pantry_tracking: boolean;
    meal_pantry_integration: boolean;
    meal_pantry_grocery_integration: boolean;
    projects_savings_tracking: boolean;
    paycheck_planner: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface InfluencerCode {
  id: string;
  code: string;
  user_id: string;
  tier_id: string;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface InfluencerSignup {
  id: string;
  influencer_code_id: string;
  user_id: string;
  household_id: string;
  signed_up_at: string;
  subscription_started_at: string | null;
  subscription_tier_id: string | null;
  is_active_subscriber: boolean;
  metadata: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  referral_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface InfluencerPayout {
  id: string;
  influencer_code_id: string;
  influencer_user_id: string;
  signup_id: string;
  household_subscription_id: string | null;
  payout_amount_cents: number;
  payout_type: 'signup' | 'recurring' | 'bonus';
  subscription_tier_name: string;
  billing_period: BillingPeriod;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  metadata: Record<string, any>;
}

export interface HouseholdSubscription {
  id: string;
  household_id: string;
  tier_id: string;
  billing_period: BillingPeriod;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaidConnection {
  id: string;
  household_id: string;
  plaid_item_id: string;
  plaid_access_token?: string; // Optional - not exposed to frontend for security
  institution_name: string;
  institution_id: string;
  last_refresh: string | null;
  status: 'active' | 'error' | 'disconnected';
  created_at: string;
  updated_at: string;
}

export type ProjectType = 'vacation' | 'purchase' | 'emergency_fund' | 'education' | 'home' | 'vehicle' | 'custom';

export interface SavingsProject {
  id: string;
  household_id: string;
  created_by: string;
  name: string;
  description: string;
  project_type: ProjectType;
  goal_amount_cents: number;
  current_amount_cents: number;
  target_date: string | null;
  primary_account_id: string | null;
  related_links: Array<{ title: string; url: string }>;
  notes: string;
  is_active: boolean;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface ProjectAccount {
  id: string;
  project_id: string;
  account_id: string;
  is_primary: boolean;
  added_at: string;
}

export interface ProjectTransaction {
  id: string;
  project_id: string;
  account_id: string | null;
  created_by: string;
  amount_cents: number;
  transaction_type: 'deposit' | 'withdrawal';
  description: string;
  transaction_date: string;
  created_at: string;
  metadata: Record<string, any>;
}

export interface Payee {
  id: string;
  household_id: string;
  name: string;
  default_category_id: string | null;
  default_transaction_type: TransactionType | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringTransaction {
  id: string;
  household_id: string;
  account_id: string;
  payee_id: string | null;
  category_id: string | null;
  transaction_type: TransactionType;
  amount: number;
  description: string | null;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  next_due_date: string;
  is_active: boolean;
  debt_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionCategory {
  id: string;
  household_id: string;
  name: string;
  icon: string;
  type: CategoryType;
  color: string;
  created_at: string;
}
