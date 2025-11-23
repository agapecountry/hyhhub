-- Security Infrastructure and Audit System
-- Implements operationalized security controls for information security policy compliance
-- Provides audit logging, incident tracking, risk management, and security monitoring

-- Security Audit Logs Table
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_category text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  user_id uuid REFERENCES auth.users(id),
  household_id uuid REFERENCES households(id),
  ip_address text,
  user_agent text,
  resource_type text,
  resource_id text,
  action text NOT NULL,
  status text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Security Incidents Table
CREATE TABLE IF NOT EXISTS security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL CHECK (severity IN ('P1', 'P2', 'P3', 'P4')),
  status text NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'triaged', 'contained', 'investigating', 'resolved', 'closed')),
  category text NOT NULL,
  detected_at timestamptz DEFAULT now() NOT NULL,
  detected_by uuid REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  contained_at timestamptz,
  resolved_at timestamptz,
  impact_assessment text,
  root_cause text,
  remediation_actions text,
  lessons_learned text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Security Risks Table
CREATE TABLE IF NOT EXISTS security_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('technical', 'operational', 'physical', 'compliance')),
  likelihood integer NOT NULL CHECK (likelihood >= 1 AND likelihood <= 5),
  impact integer NOT NULL CHECK (impact >= 1 AND impact <= 5),
  risk_score integer GENERATED ALWAYS AS (likelihood * impact) STORED,
  status text NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'assessed', 'mitigating', 'accepted', 'closed')),
  treatment text CHECK (treatment IN ('accept', 'mitigate', 'transfer', 'avoid')),
  mitigation_plan text,
  owner uuid REFERENCES auth.users(id),
  identified_date date DEFAULT CURRENT_DATE,
  target_closure_date date,
  closed_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Security Alerts Table
CREATE TABLE IF NOT EXISTS security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  message text,
  user_id uuid REFERENCES auth.users(id),
  household_id uuid REFERENCES households(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Security Metrics Table
CREATE TABLE IF NOT EXISTS security_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL,
  metric_type text NOT NULL,
  metric_value numeric NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Failed Login Attempts Table
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  user_agent text,
  attempt_time timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Access Reviews Table
CREATE TABLE IF NOT EXISTS access_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_date date NOT NULL,
  reviewer_id uuid REFERENCES auth.users(id),
  review_type text NOT NULL CHECK (review_type IN ('quarterly', 'monthly', 'ad_hoc')),
  scope text,
  findings text,
  actions_taken text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_household_id ON security_audit_logs(household_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON security_audit_logs(severity);

CREATE INDEX IF NOT EXISTS idx_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_detected_at ON security_incidents(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_risks_status ON security_risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_risk_score ON security_risks(risk_score DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON security_alerts(acknowledged);

CREATE INDEX IF NOT EXISTS idx_failed_logins_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_logins_attempt_time ON failed_login_attempts(attempt_time DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_date_type ON security_metrics(metric_date DESC, metric_type);

-- Enable Row Level Security
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin only access for security tables)
-- Note: These policies assume admin users have a role in users table or household_members

-- Security Audit Logs - Read only for admins, system can write
CREATE POLICY "Admins can view audit logs"
  ON security_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Security Incidents - Admins can manage
CREATE POLICY "Admins can view incidents"
  ON security_incidents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can create incidents"
  ON security_incidents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can update incidents"
  ON security_incidents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Security Risks - Admins can manage
CREATE POLICY "Admins can view risks"
  ON security_risks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can create risks"
  ON security_risks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can update risks"
  ON security_risks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Security Alerts - Admins can manage
CREATE POLICY "Admins can view alerts"
  ON security_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can acknowledge alerts"
  ON security_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Security Metrics - Admins read only
CREATE POLICY "Admins can view metrics"
  ON security_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Failed Login Attempts - Admins read only
CREATE POLICY "Admins can view failed logins"
  ON failed_login_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Access Reviews - Admins can manage
CREATE POLICY "Admins can view access reviews"
  ON access_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

CREATE POLICY "Admins can create access reviews"
  ON access_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );

-- Function to automatically generate incident numbers
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num integer;
  year_str text;
BEGIN
  year_str := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(substring(incident_number from '[0-9]+$') AS integer)
  ), 0) + 1
  INTO next_num
  FROM security_incidents
  WHERE incident_number LIKE 'INC-' || year_str || '-%';
  
  RETURN 'INC-' || year_str || '-' || LPAD(next_num::text, 4, '0');
END;
$$;

-- Function to automatically generate risk IDs
CREATE OR REPLACE FUNCTION generate_risk_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num integer;
  year_str text;
BEGIN
  year_str := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(substring(risk_id from '[0-9]+$') AS integer)
  ), 0) + 1
  INTO next_num
  FROM security_risks
  WHERE risk_id LIKE 'RISK-' || year_str || '-%';
  
  RETURN 'RISK-' || year_str || '-' || LPAD(next_num::text, 4, '0');
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_security_incidents_updated_at
  BEFORE UPDATE ON security_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_risks_updated_at
  BEFORE UPDATE ON security_risks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to log security events (can be called from application or triggers)
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type text,
  p_event_category text,
  p_severity text,
  p_user_id uuid,
  p_household_id uuid,
  p_ip_address text,
  p_user_agent text,
  p_resource_type text,
  p_resource_id text,
  p_action text,
  p_status text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO security_audit_logs (
    event_type,
    event_category,
    severity,
    user_id,
    household_id,
    ip_address,
    user_agent,
    resource_type,
    resource_id,
    action,
    status,
    details
  ) VALUES (
    p_event_type,
    p_event_category,
    p_severity,
    p_user_id,
    p_household_id,
    p_ip_address,
    p_user_agent,
    p_resource_type,
    p_resource_id,
    p_action,
    p_status,
    p_details
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Function to create security alert
CREATE OR REPLACE FUNCTION create_security_alert(
  p_alert_type text,
  p_severity text,
  p_title text,
  p_message text,
  p_user_id uuid DEFAULT NULL,
  p_household_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  alert_id uuid;
BEGIN
  INSERT INTO security_alerts (
    alert_type,
    severity,
    title,
    message,
    user_id,
    household_id,
    metadata
  ) VALUES (
    p_alert_type,
    p_severity,
    p_title,
    p_message,
    p_user_id,
    p_household_id,
    p_metadata
  ) RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$;