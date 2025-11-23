/*
  # Remove Unused Indexes - Part 4

  1. Performance Improvements
    - Continue removing unused indexes
    - Further reduces storage and maintenance overhead
  
  2. Indexes Removed (Part 4 - Projects & Influencers)
    - savings_projects indexes
    - project_accounts indexes
    - project_transactions indexes
    - users indexes
    - influencer_codes indexes
    - influencer_signups indexes
    - influencer_payouts indexes
*/

-- Savings Projects
DROP INDEX IF EXISTS idx_savings_projects_created_by;
DROP INDEX IF EXISTS idx_savings_projects_is_active;
DROP INDEX IF EXISTS idx_savings_projects_is_completed;
DROP INDEX IF EXISTS idx_savings_projects_primary_account_id;

-- Project Accounts
DROP INDEX IF EXISTS idx_project_accounts_project_id;
DROP INDEX IF EXISTS idx_project_accounts_account_id;

-- Project Transactions
DROP INDEX IF EXISTS idx_project_transactions_account_id;
DROP INDEX IF EXISTS idx_project_transactions_date;

-- Users
DROP INDEX IF EXISTS idx_users_referral_code;

-- Influencer Codes
DROP INDEX IF EXISTS idx_influencer_codes_code;
DROP INDEX IF EXISTS idx_influencer_codes_active;

-- Influencer Signups
DROP INDEX IF EXISTS idx_influencer_signups_code_id;
DROP INDEX IF EXISTS idx_influencer_signups_user_id;

-- Influencer Payouts
DROP INDEX IF EXISTS idx_influencer_payouts_code_id;
DROP INDEX IF EXISTS idx_influencer_payouts_influencer_user_id;
DROP INDEX IF EXISTS idx_influencer_payouts_signup_id;
DROP INDEX IF EXISTS idx_influencer_payouts_subscription_id;
DROP INDEX IF EXISTS idx_influencer_payouts_is_paid;