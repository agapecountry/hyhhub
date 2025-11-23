/*
  # Optimize RLS Policies - Part 2: Security Tables

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Significantly improves query performance at scale
  
  2. Tables Updated
    - security_audit_logs
    - security_incidents
    - security_risks
    - security_alerts
    - security_metrics
    - failed_login_attempts
    - access_reviews
*/

-- Security Audit Logs
DROP POLICY IF EXISTS "Users can view own audit logs" ON security_audit_logs;
CREATE POLICY "Users can view own audit logs"
  ON security_audit_logs FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all audit logs" ON security_audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON security_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

-- Security Incidents
DROP POLICY IF EXISTS "Admins can view incidents" ON security_incidents;
CREATE POLICY "Admins can view incidents"
  ON security_incidents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create incidents" ON security_incidents;
CREATE POLICY "Admins can create incidents"
  ON security_incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update incidents" ON security_incidents;
CREATE POLICY "Admins can update incidents"
  ON security_incidents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

-- Security Risks
DROP POLICY IF EXISTS "Admins can view risks" ON security_risks;
CREATE POLICY "Admins can view risks"
  ON security_risks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create risks" ON security_risks;
CREATE POLICY "Admins can create risks"
  ON security_risks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update risks" ON security_risks;
CREATE POLICY "Admins can update risks"
  ON security_risks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

-- Security Alerts
DROP POLICY IF EXISTS "Admins can view alerts" ON security_alerts;
CREATE POLICY "Admins can view alerts"
  ON security_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can acknowledge alerts" ON security_alerts;
CREATE POLICY "Admins can acknowledge alerts"
  ON security_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

-- Security Metrics
DROP POLICY IF EXISTS "Admins can view metrics" ON security_metrics;
CREATE POLICY "Admins can view metrics"
  ON security_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

-- Failed Login Attempts
DROP POLICY IF EXISTS "Admins can view failed logins" ON failed_login_attempts;
CREATE POLICY "Admins can view failed logins"
  ON failed_login_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

-- Access Reviews
DROP POLICY IF EXISTS "Admins can view access reviews" ON access_reviews;
CREATE POLICY "Admins can view access reviews"
  ON access_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create access reviews" ON access_reviews;
CREATE POLICY "Admins can create access reviews"
  ON access_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = (SELECT auth.uid())
      AND household_members.role = 'admin'
    )
  );