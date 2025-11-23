/*
  # Remove Unused Indexes - Part 5

  1. Performance Improvements
    - Final batch of unused index removal
    - Completes storage and maintenance optimization
  
  2. Indexes Removed (Part 5 - Security Tables)
    - security_audit_logs indexes
    - security_incidents indexes
    - security_risks indexes
    - security_alerts indexes
    - failed_login_attempts indexes
    - security_metrics indexes
*/

-- Security Audit Logs
DROP INDEX IF EXISTS idx_audit_logs_household_id;
DROP INDEX IF EXISTS idx_audit_logs_event_type;
DROP INDEX IF EXISTS idx_audit_logs_severity;

-- Security Incidents
DROP INDEX IF EXISTS idx_incidents_status;
DROP INDEX IF EXISTS idx_incidents_severity;

-- Security Risks
DROP INDEX IF EXISTS idx_risks_status;

-- Security Alerts
DROP INDEX IF EXISTS idx_alerts_severity;
DROP INDEX IF EXISTS idx_alerts_acknowledged;

-- Failed Login Attempts
DROP INDEX IF EXISTS idx_failed_logins_email;
DROP INDEX IF EXISTS idx_failed_logins_attempt_time;

-- Security Metrics
DROP INDEX IF EXISTS idx_metrics_date_type;