/*
  # Fix Security Issues - Part 1: Missing Foreign Key Indexes

  1. Problem
    - Multiple foreign keys lack covering indexes
    - This leads to suboptimal query performance
    - Can cause slow JOINs and DELETE operations

  2. Solution
    - Add indexes for all unindexed foreign keys
    - Improves query performance and referential integrity checks

  3. Indexes Added
    - access_reviews: reviewer_id
    - bills: created_by
    - budget_categories: created_by
    - influencer_codes: tier_id
    - influencer_signups: subscription_tier_id
    - pantry_items: location_id
    - payees: household_id
    - project_transactions: created_by
    - recurring_transactions: household_id
    - security_alerts: acknowledged_by, household_id, user_id
    - security_incidents: assigned_to, detected_by
    - security_risks: owner
    - transactions: debt_id, payee_id, recurring_transaction_id
    - user_dashboard_preferences: household_id, widget_key
    - user_navigation_preferences: household_id
*/

-- access_reviews
CREATE INDEX IF NOT EXISTS idx_access_reviews_reviewer_id
ON access_reviews(reviewer_id);

-- bills
CREATE INDEX IF NOT EXISTS idx_bills_created_by
ON bills(created_by);

-- budget_categories
CREATE INDEX IF NOT EXISTS idx_budget_categories_created_by
ON budget_categories(created_by);

-- influencer_codes
CREATE INDEX IF NOT EXISTS idx_influencer_codes_tier_id
ON influencer_codes(tier_id);

-- influencer_signups
CREATE INDEX IF NOT EXISTS idx_influencer_signups_subscription_tier_id
ON influencer_signups(subscription_tier_id);

-- pantry_items
CREATE INDEX IF NOT EXISTS idx_pantry_items_location_id
ON pantry_items(location_id);

-- payees
CREATE INDEX IF NOT EXISTS idx_payees_household_id
ON payees(household_id);

-- project_transactions
CREATE INDEX IF NOT EXISTS idx_project_transactions_created_by
ON project_transactions(created_by);

-- recurring_transactions
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_household_id
ON recurring_transactions(household_id);

-- security_alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_acknowledged_by
ON security_alerts(acknowledged_by);

CREATE INDEX IF NOT EXISTS idx_security_alerts_household_id
ON security_alerts(household_id);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id
ON security_alerts(user_id);

-- security_incidents
CREATE INDEX IF NOT EXISTS idx_security_incidents_assigned_to
ON security_incidents(assigned_to);

CREATE INDEX IF NOT EXISTS idx_security_incidents_detected_by
ON security_incidents(detected_by);

-- security_risks
CREATE INDEX IF NOT EXISTS idx_security_risks_owner
ON security_risks(owner);

-- transactions
CREATE INDEX IF NOT EXISTS idx_transactions_debt_id
ON transactions(debt_id);

CREATE INDEX IF NOT EXISTS idx_transactions_payee_id
ON transactions(payee_id);

CREATE INDEX IF NOT EXISTS idx_transactions_recurring_transaction_id
ON transactions(recurring_transaction_id);

-- user_dashboard_preferences
CREATE INDEX IF NOT EXISTS idx_user_dashboard_preferences_household_id
ON user_dashboard_preferences(household_id);

CREATE INDEX IF NOT EXISTS idx_user_dashboard_preferences_widget_key
ON user_dashboard_preferences(widget_key);

-- user_navigation_preferences
CREATE INDEX IF NOT EXISTS idx_user_navigation_preferences_household_id
ON user_navigation_preferences(household_id);
