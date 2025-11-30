'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, DollarSign, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
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

interface PayoutWithDetails {
  id: string;
  influencer_user_id: string;
  influencer_code_id: string;
  influencer_email: string;
  influencer_code: string;
  payout_type: 'signup' | 'recurring' | 'bonus';
  subscription_tier_name: string;
  billing_period: 'monthly' | 'annual';
  payout_amount_cents: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
}

export default function InfluencerPayoutsAdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<PayoutWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [payoutToMark, setPayoutToMark] = useState<PayoutWithDetails | null>(null);

  useEffect(() => {
    if (user) {
      fetchPayouts();
    }
  }, [user]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      // Get all payouts with influencer details
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('influencer_payouts')
        .select(`
          *,
          influencer_codes!inner(code, user_id)
        `)
        .order('created_at', { ascending: false });

      if (payoutsError) throw payoutsError;

      // Get influencer user emails
      const userIds = [...new Set(payoutsData?.map(p => p.influencer_user_id))];
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);

      if (usersError) throw usersError;

      const userMap = new Map(usersData?.map(u => [u.id, u.email]));

      const enrichedPayouts = payoutsData?.map(p => ({
        ...p,
        influencer_email: userMap.get(p.influencer_user_id) || 'Unknown',
        influencer_code: p.influencer_codes?.code || 'Unknown',
      })) || [];

      setPayouts(enrichedPayouts);
    } catch (error) {
      console.error('Error fetching payouts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payouts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayouts = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-influencer-payouts`,
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

      toast({
        title: 'Success',
        description: `Generated ${result.payouts_created} new payout(s) totaling ${formatCurrency((result.total_amount_cents || 0) / 100)}`,
      });

      await fetchPayouts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate payouts',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!payoutToMark) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('influencer_payouts')
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
        })
        .eq('id', payoutToMark.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payout marked as paid',
      });

      setPayoutToMark(null);
      await fetchPayouts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark payout as paid',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkMultipleAsPaid = async () => {
    const pendingPayouts = payouts.filter(p => !p.is_paid);
    if (pendingPayouts.length === 0) return;

    const confirmed = confirm(
      `Mark ${pendingPayouts.length} pending payout(s) as paid totaling ${formatCurrency(
        pendingPayouts.reduce((sum, p) => sum + p.payout_amount_cents, 0) / 100
      )}?`
    );

    if (!confirmed) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('influencer_payouts')
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
        })
        .in('id', pendingPayouts.map(p => p.id));

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${pendingPayouts.length} payout(s) marked as paid`,
      });

      await fetchPayouts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark payouts as paid',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const pendingPayouts = payouts.filter(p => !p.is_paid);
  const paidPayouts = payouts.filter(p => p.is_paid);
  const totalPending = pendingPayouts.reduce((sum, p) => sum + p.payout_amount_cents, 0) / 100;
  const totalPaid = paidPayouts.reduce((sum, p) => sum + p.payout_amount_cents, 0) / 100;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Influencer Payouts Admin</h1>
            <p className="text-muted-foreground">
              Manage and process influencer payouts
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGeneratePayouts} disabled={generating} variant="outline">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate Recurring Payouts
                </>
              )}
            </Button>
            {pendingPayouts.length > 0 && (
              <Button onClick={handleMarkMultipleAsPaid} disabled={processing}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark All Pending as Paid
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPayouts.length}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalPending)} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Payouts</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paidPayouts.length}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalPaid)} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All Payouts</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payouts.length}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(totalPending + totalPaid)} total
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Payouts</CardTitle>
            <CardDescription>
              View and manage all influencer payouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No payouts yet. Generate recurring payouts or wait for new signups.
                </AlertDescription>
              </Alert>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Influencer</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="text-sm">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {payout.influencer_email}
                      </TableCell>
                      <TableCell>
                        <code className="font-mono text-sm">{payout.influencer_code}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {payout.payout_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-sm">
                        {payout.subscription_tier_name}
                      </TableCell>
                      <TableCell className="capitalize text-sm">
                        {payout.billing_period}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payout.payout_amount_cents / 100)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payout.is_paid ? 'default' : 'secondary'}>
                          {payout.is_paid ? 'Paid' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!payout.is_paid && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPayoutToMark(payout)}
                          >
                            Mark as Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!payoutToMark} onOpenChange={() => setPayoutToMark(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Payout as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this {formatCurrency((payoutToMark?.payout_amount_cents || 0) / 100)} payout 
              to {payoutToMark?.influencer_email} as paid?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsPaid} disabled={processing}>
              {processing ? 'Processing...' : 'Mark as Paid'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
