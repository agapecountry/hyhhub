/*
  # Create Paycheck Planner Cleanup Jobs

  1. Functions
    - `cleanup_dismissed_payments()` - Deletes dismissed payments 30 days after due date
    - `cleanup_historical_paycheck_records()` - Deletes paycheck planner records older than 6 months

  2. Audit Trail
    - Logs all deletions to security_audit_log table
    - Includes counts and date ranges of deleted records

  3. Scheduled Jobs
    - Daily cleanup at 2:00 AM for dismissed payments
    - Daily cleanup at 2:30 AM for historical records

  4. Security
    - Functions run with SECURITY DEFINER to bypass RLS for cleanup
    - Audit logs capture all deletion activities
*/

-- Function to cleanup dismissed payments 30 days after due date
CREATE OR REPLACE FUNCTION cleanup_dismissed_payments()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date DATE;
  deleted_records JSONB;
BEGIN
  -- Calculate cutoff date (30 days ago)
  cutoff_date := CURRENT_DATE - INTERVAL '30 days';

  -- Get records before deletion for audit log
  WITH to_delete AS (
    SELECT
      id,
      household_id,
      payment_type,
      payment_id,
      paycheck_date,
      created_at
    FROM paycheck_planner_payments
    WHERE is_dismissed = true
      AND paycheck_date IS NOT NULL
      AND paycheck_date < cutoff_date
  ),
  deleted AS (
    DELETE FROM paycheck_planner_payments
    WHERE id IN (SELECT id FROM to_delete)
    RETURNING *
  )
  SELECT
    COUNT(*) as count,
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'household_id', household_id,
        'payment_type', payment_type,
        'payment_id', payment_id,
        'paycheck_date', paycheck_date,
        'created_at', created_at
      )
    ) as records
  INTO deleted_count, deleted_records
  FROM deleted;

  -- Log to audit trail if any records were deleted
  IF deleted_count > 0 THEN
    INSERT INTO security_audit_log (
      household_id,
      action,
      resource_type,
      resource_id,
      details,
      ip_address,
      user_agent
    )
    SELECT DISTINCT
      household_id,
      'cleanup_dismissed_payments',
      'paycheck_planner_payments',
      id::text,
      jsonb_build_object(
        'deleted_count', deleted_count,
        'cutoff_date', cutoff_date,
        'reason', 'Automatic cleanup: 30 days past due date',
        'records', deleted_records
      ),
      '127.0.0.1',
      'pg_cron_cleanup'
    FROM jsonb_to_recordset(deleted_records) AS x(id uuid, household_id uuid);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'cutoff_date', cutoff_date
  );
END;
$$;

-- Function to cleanup historical paycheck planner records older than 6 months
CREATE OR REPLACE FUNCTION cleanup_historical_paycheck_records()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date DATE;
  deleted_records JSONB;
BEGIN
  -- Calculate cutoff date (6 months ago)
  cutoff_date := CURRENT_DATE - INTERVAL '6 months';

  -- Get records before deletion for audit log
  WITH to_delete AS (
    SELECT
      id,
      household_id,
      payment_type,
      payment_id,
      paycheck_date,
      is_paid,
      paid_date,
      created_at
    FROM paycheck_planner_payments
    WHERE is_paid = true
      AND paycheck_date IS NOT NULL
      AND paycheck_date < cutoff_date
  ),
  deleted AS (
    DELETE FROM paycheck_planner_payments
    WHERE id IN (SELECT id FROM to_delete)
    RETURNING *
  )
  SELECT
    COUNT(*) as count,
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'household_id', household_id,
        'payment_type', payment_type,
        'payment_id', payment_id,
        'paycheck_date', paycheck_date,
        'is_paid', is_paid,
        'paid_date', paid_date,
        'created_at', created_at
      )
    ) as records
  INTO deleted_count, deleted_records
  FROM deleted;

  -- Log to audit trail if any records were deleted
  IF deleted_count > 0 THEN
    INSERT INTO security_audit_log (
      household_id,
      action,
      resource_type,
      resource_id,
      details,
      ip_address,
      user_agent
    )
    SELECT DISTINCT
      household_id,
      'cleanup_historical_paycheck_records',
      'paycheck_planner_payments',
      id::text,
      jsonb_build_object(
        'deleted_count', deleted_count,
        'cutoff_date', cutoff_date,
        'reason', 'Automatic cleanup: Historical records older than 6 months',
        'records', deleted_records
      ),
      '127.0.0.1',
      'pg_cron_cleanup'
    FROM jsonb_to_recordset(deleted_records) AS x(id uuid, household_id uuid);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'cutoff_date', cutoff_date
  );
END;
$$;

-- Schedule daily cleanup of dismissed payments at 2:00 AM
SELECT cron.schedule(
  'cleanup-dismissed-payments',
  '0 2 * * *',
  $$SELECT cleanup_dismissed_payments()$$
);

-- Schedule daily cleanup of historical paycheck records at 2:30 AM
SELECT cron.schedule(
  'cleanup-historical-paycheck-records',
  '30 2 * * *',
  $$SELECT cleanup_historical_paycheck_records()$$
);
