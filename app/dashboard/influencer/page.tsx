'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { InfluencerCode, InfluencerSignup, InfluencerPayout } from '@/lib/types';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users, TrendingUp, DollarSign, Copy, Check, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/format';

export default function InfluencerPage() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<InfluencerCode[]>([]);
  const [signups, setSignups] = useState<InfluencerSignup[]>([]);
  const [payouts, setPayouts] = useState<InfluencerPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [newCode, setNewCode] = useState('');
  const [maxUses, setMaxUses] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [codesResult, signupsResult, payoutsResult] = await Promise.all([
        supabase
          .from('influencer_codes')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('influencer_signups')
          .select('*')
          .in('influencer_code_id', codes.map(c => c.id)),

        supabase
          .from('influencer_payouts')
          .select('*')
          .eq('influencer_user_id', user?.id)
          .order('created_at', { ascending: false })
      ]);

      if (codesResult.error) throw codesResult.error;
      if (signupsResult.error) throw signupsResult.error;
      if (payoutsResult.error) throw payoutsResult.error;

      setCodes(codesResult.data || []);
      setSignups(signupsResult.data || []);
      setPayouts(payoutsResult.data || []);
    } catch (error) {
      console.error('Error fetching influencer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async () => {
    if (!newCode || !user) return;

    setCreating(true);
    try {
      const { error } = await supabase
        .from('influencer_codes')
        .insert({
          code: newCode,
          user_id: user.id,
          tier_id: null,
          max_uses: maxUses ? parseInt(maxUses) : null,
          expires_at: expiresAt || null,
        });

      if (error) throw error;

      setNewCode('');
      setMaxUses('');
      setExpiresAt('');

      await fetchData();
    } catch (error: any) {
      console.error('Error creating code:', error);
      alert(error.message || 'Failed to create code');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleCodeStatus = async (codeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('influencer_codes')
        .update({ is_active: !currentStatus })
        .eq('id', codeId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error toggling code status:', error);
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

  const totalSignups = signups.length;
  const activeSubscribers = signups.filter(s => s.is_active_subscriber).length;
  const totalUses = codes.reduce((sum, code) => sum + code.current_uses, 0);
  const totalEarnings = payouts.reduce((sum, payout) => sum + payout.payout_amount_cents, 0) / 100;
  const pendingEarnings = payouts.filter(p => !p.is_paid).reduce((sum, payout) => sum + payout.payout_amount_cents, 0) / 100;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Influencer Dashboard</h1>
          <p className="text-muted-foreground">
            Track your referral codes and signups
          </p>
        </div>

        <Alert className="bg-blue-50 border-blue-200">
          <DollarSign className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm space-y-2">
            <p className="font-semibold text-blue-900">How Payouts Work:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li><strong>Basic:</strong> $1 (monthly) or $5 (annual) one-time signup bonus</li>
              <li><strong>Premium:</strong> $5 (monthly) or $10 (annual) signup + $1/mo or $10/yr recurring</li>
              <li><strong>Elite:</strong> $10 (monthly) or $15 (annual) signup + $2/mo or $15/yr recurring</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2">Payouts are processed monthly. Pending earnings will show as "Pending" until paid by admin.</p>
          </AlertDescription>
        </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSignups}</div>
            <p className="text-xs text-muted-foreground">
              {totalUses} total code uses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscribers}</div>
            <p className="text-xs text-muted-foreground">
              {totalSignups > 0 ? Math.round((activeSubscribers / totalSignups) * 100) : 0}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(pendingEarnings)} pending payout
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New Code</CardTitle>
          <CardDescription>
            Generate a new referral code to share with your audience. Users can choose their subscription tier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="MYCODE123"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              />
            </div>

            <div>
              <Label htmlFor="maxUses">Max Uses (optional)</Label>
              <Input
                id="maxUses"
                type="number"
                placeholder="Unlimited"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="expires">Expires (optional)</Label>
              <Input
                id="expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleCreateCode}
                disabled={!newCode || creating}
                className="w-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Earnings History</CardTitle>
          <CardDescription>
            View your payout history and pending earnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <Alert>
              <AlertDescription>
                No earnings yet. Share your referral codes to start earning!
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      {new Date(payout.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {payout.payout_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {payout.subscription_tier_name}
                    </TableCell>
                    <TableCell className="capitalize">
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Codes</CardTitle>
          <CardDescription>
            Manage and track your influencer codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <Alert>
              <AlertDescription>
                You haven't created any codes yet. Create your first code above to get started!
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => {
                  const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
                  const isMaxed = code.max_uses && code.current_uses >= code.max_uses;

                  return (
                    <TableRow key={code.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold">{code.code}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyCode(code.code)}
                          >
                            {copiedCode === code.code ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {code.current_uses}
                        {code.max_uses && ` / ${code.max_uses}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          !code.is_active ? 'secondary' :
                          isExpired ? 'destructive' :
                          isMaxed ? 'secondary' :
                          'default'
                        }>
                          {!code.is_active ? 'Inactive' :
                           isExpired ? 'Expired' :
                           isMaxed ? 'Maxed' :
                           'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleCodeStatus(code.id, code.is_active)}
                        >
                          {code.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}
