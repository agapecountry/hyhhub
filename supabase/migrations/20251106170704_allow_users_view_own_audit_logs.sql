-- Allow users to view their own security audit logs

-- Drop the existing admin-only policy
DROP POLICY IF EXISTS "Admins can view audit logs" ON security_audit_logs;

-- Create new policy allowing users to view their own logs
CREATE POLICY "Users can view own audit logs"
  ON security_audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Keep admin access for viewing all logs (create a separate policy)
CREATE POLICY "Admins can view all audit logs"
  ON security_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM household_members
      WHERE household_members.user_id = auth.uid()
      AND household_members.role = 'admin'
    )
  );