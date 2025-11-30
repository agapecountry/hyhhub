'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { useSubscription } from '@/lib/subscription-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { CreditCard, User, Mail, Save, Shield, Globe, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

export default function ProfilePage() {
  const { user } = useAuth();
  const { tier, subscription } = useSubscription();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    timezone: 'America/New_York',
  });
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUserData();
    loadSecurityLogs();
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, email, timezone')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserData({
          name: data.name || '',
          email: data.email || user.email || '',
          timezone: data.timezone || 'America/New_York',
        });
      } else {
        setUserData({
          name: '',
          email: user.email || '',
          timezone: 'America/New_York',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load user data',
        variant: 'destructive',
      });
    }
  };

  const loadSecurityLogs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('id, event_type, event_category, action, status, ip_address, user_agent, created_at, details')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setSecurityLogs(data || []);
    } catch (error: any) {
      console.error('Failed to load security logs:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    if (!userData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: userData.name.trim(),
          timezone: userData.timezone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast({
        title: 'Error',
        description: 'You must type DELETE to confirm',
        variant: 'destructive',
      });
      return;
    }

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-user-account`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.error) throw new Error(result.error);

      // Success - user is deleted, sign them out and redirect
      await supabase.auth.signOut();
      router.push('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      });
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account settings and subscription
          </p>
        </div>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Update your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                placeholder="Your name"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={userData.email}
                  disabled
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Email cannot be changed. Contact support if you need assistance.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">
                <Globe className="h-4 w-4 inline mr-2" />
                Timezone
              </Label>
              <Select
                value={userData.timezone}
                onValueChange={(value) => setUserData({ ...userData, timezone: value })}
                disabled={loading}
              >
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (US & Canada)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (US & Canada)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (US & Canada)</SelectItem>
                  <SelectItem value="America/Phoenix">Arizona</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (US & Canada)</SelectItem>
                  <SelectItem value="America/Anchorage">Alaska</SelectItem>
                  <SelectItem value="Pacific/Honolulu">Hawaii</SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                  <SelectItem value="Europe/Paris">Paris</SelectItem>
                  <SelectItem value="Europe/Berlin">Berlin</SelectItem>
                  <SelectItem value="Europe/Rome">Rome</SelectItem>
                  <SelectItem value="Europe/Madrid">Madrid</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                  <SelectItem value="Asia/Hong_Kong">Hong Kong</SelectItem>
                  <SelectItem value="Asia/Singapore">Singapore</SelectItem>
                  <SelectItem value="Asia/Dubai">Dubai</SelectItem>
                  <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                  <SelectItem value="Australia/Melbourne">Melbourne</SelectItem>
                  <SelectItem value="Pacific/Auckland">Auckland</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Used to display calendar events in your local time
              </p>
            </div>

            <Button onClick={handleUpdateProfile} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
            </CardTitle>
            <CardDescription>
              Manage your subscription and billing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Plan</p>
                <p className="text-sm text-muted-foreground">
                  {tier ? tier.display_name : 'Free'}
                </p>
              </div>
              <Badge variant={subscription?.status === 'active' ? 'secondary' : 'outline'}>
                {subscription?.status === 'active' ? 'Active' : 'No Subscription'}
              </Badge>
            </div>

            {subscription && (
              <>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Billing Period</span>
                    <span className="font-medium capitalize">{subscription.billing_period}</span>
                  </div>
                  {subscription.current_period_end && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {subscription.cancel_at_period_end ? 'Cancels On' : 'Renews On'}
                      </span>
                      <span className="font-medium">
                        {format(parseISO(subscription.current_period_end), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                View all available subscription tiers and manage your billing
              </p>
            </div>

            <Button variant="outline" onClick={() => router.push('/dashboard/subscription')}>
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Subscription
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Activity
            </CardTitle>
            <CardDescription>
              Recent security events for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {securityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No security activity recorded yet
              </p>
            ) : (
              <>
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
                        <div>action: {log.action}</div>
                        {log.ip_address && <div>ip_address: {log.ip_address}</div>}
                        {log.user_agent && (
                          <div className="truncate">
                            user_agent: {log.user_agent.substring(0, 60)}...
                          </div>
                        )}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div>metadata: {JSON.stringify(log.details)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/dashboard/profile/activity-history')}
                  >
                    View All Activity
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions for your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="font-semibold text-destructive">Permanent Account Deletion</p>
                  <p className="text-sm text-muted-foreground">
                    This will <strong>permanently delete</strong> your account and all associated data including:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                    <li>All household data (accounts, transactions, budgets)</li>
                    <li>All personal information and preferences</li>
                    <li>Subscription and billing history</li>
                    <li>All calendar events, chores, and meal plans</li>
                  </ul>
                  <p className="text-sm font-semibold text-destructive mt-3">
                    This action CANNOT be undone, even by HYH administrators.
                  </p>
                </div>
              </div>
              <Button 
                variant="destructive" 
                onClick={() => setDeleteDialogOpen(true)}
                className="w-full sm:w-auto"
              >
                Delete My Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold text-foreground">
                This action is IRREVERSIBLE and PERMANENT.
              </p>
              <p>
                All of your data will be permanently deleted from our servers. This includes:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>All accounts and transactions</li>
                <li>All budgets and financial data</li>
                <li>All household memberships</li>
                <li>All personal information</li>
              </ul>
              <p className="font-semibold text-destructive">
                Even HYH administrators cannot recover your data after deletion.
              </p>
              <div className="pt-2">
                <Label htmlFor="confirm-delete" className="text-sm font-semibold">
                  Type <span className="font-mono bg-destructive/20 px-1">DELETE</span> to confirm:
                </Label>
                <Input
                  id="confirm-delete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="mt-2"
                  disabled={deleting}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteConfirmText('');
                setDeleteDialogOpen(false);
              }}
              disabled={deleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
