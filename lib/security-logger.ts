import { supabase } from './supabase';

export type SecurityEventType =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'admin_action'
  | 'security_config'
  | 'api_access';

export type SecuritySeverity = 'info' | 'warning' | 'critical';

export type SecurityStatus = 'success' | 'failure';

interface LogSecurityEventParams {
  eventType: SecurityEventType;
  category: string;
  severity: SecuritySeverity;
  userId?: string;
  householdId?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  status: SecurityStatus;
  details?: Record<string, any>;
}

export async function logSecurityEvent(params: LogSecurityEventParams) {
  try {
    const { error } = await supabase.rpc('log_security_event', {
      p_event_type: params.eventType,
      p_event_category: params.category,
      p_severity: params.severity,
      p_user_id: params.userId || null,
      p_household_id: params.householdId || null,
      p_ip_address: params.ipAddress || null,
      p_user_agent: params.userAgent || null,
      p_resource_type: params.resourceType || null,
      p_resource_id: params.resourceId || null,
      p_action: params.action,
      p_status: params.status,
      p_details: params.details || {},
    });

    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (err) {
    console.error('Error logging security event:', err);
  }
}

export async function logAuthAttempt(
  email: string,
  success: boolean,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  await logSecurityEvent({
    eventType: 'authentication',
    category: 'login',
    severity: success ? 'info' : 'warning',
    userId,
    ipAddress,
    userAgent,
    action: 'login_attempt',
    status: success ? 'success' : 'failure',
    details: { email },
  });

  if (!success) {
    await recordFailedLogin(email, ipAddress, userAgent);
  }
}

export async function recordFailedLogin(
  email: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const { error } = await supabase.from('failed_login_attempts').insert({
      email,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error('Failed to record failed login:', error);
    }

    // Check for suspicious activity (5+ failed attempts in 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentAttempts, error: countError } = await supabase
      .from('failed_login_attempts')
      .select('id')
      .eq('email', email)
      .gte('attempt_time', fifteenMinutesAgo);

    if (countError) {
      console.error('Failed to check failed login count:', countError);
      return;
    }

    if (recentAttempts && recentAttempts.length >= 5) {
      await createSecurityAlert(
        'failed_login',
        'high',
        'Multiple Failed Login Attempts',
        `${recentAttempts.length} failed login attempts for ${email} in the last 15 minutes`,
        undefined,
        undefined,
        { email, attempt_count: recentAttempts.length }
      );
    }
  } catch (err) {
    console.error('Error recording failed login:', err);
  }
}

export async function logDataAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: string,
  householdId?: string,
  success: boolean = true
) {
  await logSecurityEvent({
    eventType: 'data_access',
    category: 'data_access',
    severity: success ? 'info' : 'warning',
    userId,
    householdId,
    resourceType,
    resourceId,
    action,
    status: success ? 'success' : 'failure',
  });
}

export async function logAdminAction(
  userId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: Record<string, any>
) {
  await logSecurityEvent({
    eventType: 'admin_action',
    category: 'administration',
    severity: 'warning', // Admin actions are always logged as warning for visibility
    userId,
    resourceType,
    resourceId,
    action,
    status: 'success',
    details,
  });
}

export async function createSecurityAlert(
  alertType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  title: string,
  message: string,
  userId?: string,
  householdId?: string,
  metadata?: Record<string, any>
) {
  try {
    const { error } = await supabase.rpc('create_security_alert', {
      p_alert_type: alertType,
      p_severity: severity,
      p_title: title,
      p_message: message,
      p_user_id: userId || null,
      p_household_id: householdId || null,
      p_metadata: metadata || {},
    });

    if (error) {
      console.error('Failed to create security alert:', error);
    }
  } catch (err) {
    console.error('Error creating security alert:', err);
  }
}

export async function getRecentSecurityAlerts(limit: number = 10) {
  const { data, error } = await supabase
    .from('security_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch security alerts:', error);
    return [];
  }

  return data || [];
}

export async function getUnacknowledgedAlerts() {
  const { data, error } = await supabase
    .from('security_alerts')
    .select('*')
    .eq('acknowledged', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch unacknowledged alerts:', error);
    return [];
  }

  return data || [];
}

export async function acknowledgeAlert(alertId: string, userId: string) {
  const { error } = await supabase
    .from('security_alerts')
    .update({
      acknowledged: true,
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', alertId);

  if (error) {
    console.error('Failed to acknowledge alert:', error);
    throw error;
  }

  await logAdminAction(userId, 'acknowledge_alert', 'security_alert', alertId);
}

export async function resolveAlert(alertId: string) {
  const { error } = await supabase
    .from('security_alerts')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', alertId);

  if (error) {
    console.error('Failed to resolve alert:', error);
    throw error;
  }
}

// Utility to get client IP and user agent (use in API routes)
export function getClientInfo(request?: Request) {
  if (!request) {
    return {
      ipAddress: undefined,
      userAgent: undefined,
    };
  }

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    undefined;

  const userAgent = request.headers.get('user-agent') || undefined;

  return { ipAddress, userAgent };
}
