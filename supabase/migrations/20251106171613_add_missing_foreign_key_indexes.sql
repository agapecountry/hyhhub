/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for all unindexed foreign keys
    - Improves JOIN performance and query optimization
  
  2. Tables Updated
    - access_reviews (reviewer_id)
    - influencer_codes (tier_id)
    - influencer_signups (subscription_tier_id)
    - project_transactions (created_by)
    - security_alerts (acknowledged_by, household_id, user_id)
    - security_incidents (assigned_to, detected_by)
    - security_risks (owner)
*/

-- Access reviews
CREATE INDEX IF NOT EXISTS idx_access_reviews_reviewer_id 
  ON access_reviews(reviewer_id);

-- Influencer codes
CREATE INDEX IF NOT EXISTS idx_influencer_codes_tier_id 
  ON influencer_codes(tier_id);

-- Influencer signups
CREATE INDEX IF NOT EXISTS idx_influencer_signups_subscription_tier_id 
  ON influencer_signups(subscription_tier_id);

-- Project transactions
CREATE INDEX IF NOT EXISTS idx_project_transactions_created_by 
  ON project_transactions(created_by);

-- Security alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_acknowledged_by 
  ON security_alerts(acknowledged_by);

CREATE INDEX IF NOT EXISTS idx_security_alerts_household_id 
  ON security_alerts(household_id);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id 
  ON security_alerts(user_id);

-- Security incidents
CREATE INDEX IF NOT EXISTS idx_security_incidents_assigned_to 
  ON security_incidents(assigned_to);

CREATE INDEX IF NOT EXISTS idx_security_incidents_detected_by 
  ON security_incidents(detected_by);

-- Security risks
CREATE INDEX IF NOT EXISTS idx_security_risks_owner 
  ON security_risks(owner);