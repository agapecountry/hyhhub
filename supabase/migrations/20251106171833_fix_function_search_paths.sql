/*
  # Fix Function Search Paths

  1. Security Improvements
    - Set stable search_path on all functions to prevent search_path attacks
    - Protects against potential SQL injection via search_path manipulation
  
  2. Functions Updated
    - All security-related functions
    - All influencer-related functions
    - All project-related functions
    - Utility functions
*/

-- Security Functions
ALTER FUNCTION log_security_event SET search_path = public, pg_temp;
ALTER FUNCTION create_security_alert SET search_path = public, pg_temp;
ALTER FUNCTION generate_incident_number SET search_path = public, pg_temp;
ALTER FUNCTION generate_risk_id SET search_path = public, pg_temp;

-- Influencer Functions
ALTER FUNCTION increment_influencer_code_usage SET search_path = public, pg_temp;
ALTER FUNCTION validate_influencer_code SET search_path = public, pg_temp;
ALTER FUNCTION calculate_influencer_payout SET search_path = public, pg_temp;
ALTER FUNCTION create_influencer_payout_on_subscription SET search_path = public, pg_temp;

-- Project Functions
ALTER FUNCTION update_project_amount SET search_path = public, pg_temp;
ALTER FUNCTION check_project_completion SET search_path = public, pg_temp;

-- Utility Functions
ALTER FUNCTION update_updated_at_column SET search_path = public, pg_temp;