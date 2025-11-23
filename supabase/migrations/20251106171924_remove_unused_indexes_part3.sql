/*
  # Remove Unused Indexes - Part 3

  1. Performance Improvements
    - Continue removing unused indexes
    - Further reduces storage and maintenance overhead
  
  2. Indexes Removed (Part 3 - Gamification & Subscriptions)
    - member_badges indexes
    - member_streaks indexes
    - family_challenges indexes
    - household_subscriptions indexes
    - plaid_connections indexes
    - plaid_accounts indexes
    - plaid_transactions indexes
*/

-- Member Badges
DROP INDEX IF EXISTS idx_member_badges_badge;
DROP INDEX IF EXISTS idx_member_badges_member;

-- Member Streaks
DROP INDEX IF EXISTS idx_streaks_member;

-- Family Challenges
DROP INDEX IF EXISTS idx_challenges_household;

-- Household Subscriptions
DROP INDEX IF EXISTS idx_household_subscriptions_tier;

-- Plaid Connections
DROP INDEX IF EXISTS idx_plaid_connections_item;

-- Plaid Accounts
DROP INDEX IF EXISTS idx_plaid_accounts_item;

-- Plaid Transactions
DROP INDEX IF EXISTS idx_plaid_transactions_account;
DROP INDEX IF EXISTS idx_plaid_transactions_household;
DROP INDEX IF EXISTS idx_plaid_transactions_date;