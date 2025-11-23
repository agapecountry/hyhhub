/*
  # Fix Security Functions Search Paths

  1. Functions Fixed
    - generate_incident_number
    - generate_risk_id
    - log_security_event
    - create_security_alert
    - update_updated_at_column
*/

-- Fix generate_incident_number
DROP FUNCTION IF EXISTS generate_incident_number() CASCADE;
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  new_number text;
BEGIN
  SELECT 'INC-' || LPAD(COALESCE(MAX(SUBSTRING(incident_number FROM 5)::integer), 0) + 1::text, 6, '0')
  INTO new_number
  FROM public.security_incidents;
  RETURN new_number;
END;
$$;

-- Fix generate_risk_id
DROP FUNCTION IF EXISTS generate_risk_id() CASCADE;
CREATE OR REPLACE FUNCTION generate_risk_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  new_id text;
BEGIN
  SELECT 'RISK-' || LPAD(COALESCE(MAX(SUBSTRING(risk_id FROM 6)::integer), 0) + 1::text, 6, '0')
  INTO new_id
  FROM public.security_risks;
  RETURN new_id;
END;
$$;

-- Fix log_security_event
DROP FUNCTION IF EXISTS log_security_event(text, text, text, jsonb, text) CASCADE;
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type text,
  p_severity text,
  p_description text,
  p_metadata jsonb DEFAULT NULL,
  p_user_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    severity,
    description,
    metadata,
    user_id
  ) VALUES (
    p_event_type,
    p_severity,
    p_description,
    p_metadata,
    p_user_id
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION log_security_event(text, text, text, jsonb, text) TO authenticated;

-- Fix create_security_alert
DROP FUNCTION IF EXISTS create_security_alert(text, text, text, jsonb) CASCADE;
CREATE OR REPLACE FUNCTION create_security_alert(
  p_alert_type text,
  p_severity text,
  p_message text,
  p_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  alert_id uuid;
BEGIN
  INSERT INTO public.security_alerts (
    alert_type,
    severity,
    message,
    details,
    status
  ) VALUES (
    p_alert_type,
    p_severity,
    p_message,
    p_details,
    'open'
  )
  RETURNING id INTO alert_id;

  RETURN alert_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_security_alert(text, text, text, jsonb) TO authenticated;

-- Fix update_updated_at_column
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Recreate triggers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_incidents') THEN
    CREATE TRIGGER update_security_incidents_updated_at BEFORE UPDATE ON security_incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_risks') THEN
    CREATE TRIGGER update_security_risks_updated_at BEFORE UPDATE ON security_risks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_alerts') THEN
    CREATE TRIGGER update_security_alerts_updated_at BEFORE UPDATE ON security_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;