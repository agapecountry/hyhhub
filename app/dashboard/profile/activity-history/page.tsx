'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, parseISO, subDays } from 'date-fns';

interface SecurityLog {
  id: string;
  event_type: string;
  event_category: string;
  action: string;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  details: any;
}

export default function ActivityHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityLogs();
  }, [user]);

  const loadSecurityLogs = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get logs from the last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('id, event_type, event_category, action, status, ip_address, user_agent, created_at, details')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSecurityLogs(data || []);
    } catch (error: any) {
      console.error('Failed to load security logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/profile')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Activity History</h1>
          <p className="text-muted-foreground">
            Complete security audit log for the last 30 days
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Activity Log ({securityLogs.length} events)
            </CardTitle>
            <CardDescription>
              All security events for your account in the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : securityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No security activity recorded in the last 30 days
              </p>
            ) : (
              <div className="space-y-3">
                {securityLogs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg space-y-1 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{log.action}</span>
                      <Badge variant={log.status === 'success' ? 'secondary' : 'destructive'}>
                        {log.status}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground space-y-0.5">
                      <div>timestamp: {format(parseISO(log.created_at), 'yyyy-MM-dd HH:mm:ss')}Z</div>
                      <div>event_type: {log.event_type}</div>
                      <div>category: {log.event_category}</div>
                      <div>action: {log.action}</div>
                      {log.ip_address && <div>ip_address: {log.ip_address}</div>}
                      {log.user_agent && (
                        <div className="break-all">
                          user_agent: {log.user_agent}
                        </div>
                      )}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="break-all">
                          metadata: {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
