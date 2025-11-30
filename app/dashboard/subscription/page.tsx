'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSubscription } from '@/lib/subscription-context';
import { useHousehold } from '@/lib/household-context';
import { supabase } from '@/lib/supabase';
import { SubscriptionTierData } from '@/lib/types';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Crown, AlertCircle, X, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';

export default function SubscriptionPage() {
  const { tier: currentTier, subscription, loading: subscriptionLoading } = useSubscription();
  const { currentHousehold } = useHousehold();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [allTiers, setAllTiers] = useState<SubscriptionTierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_tiers')
          .select('*')
          .eq('is_influencer_tier', false)
          .order('monthly_price_cents', { ascending: true });

        if (error) throw error;
        setAllTiers(data || []);
      } catch (error) {
        console.error('Error fetching tiers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTiers();
  }, []);

  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast({
        title: 'Subscription Activated',
        description: 'Your subscription has been successfully activated!',
      });
      router.replace('/dashboard/subscription');
    } else if (canceled === 'true') {
      toast({
        title: 'Checkout Canceled',
        description: 'You can subscribe anytime.',
        variant: 'default',
      });
      router.replace('/dashboard/subscription');
    }
  }, [searchParams, router, toast]);

  const handleSubscribe = async (tierId: string, tierName: string) => {
    if (!currentHousehold) return;

    setCheckingOut(tierId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to subscribe');
        setCheckingOut(null);
        return;
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout-session`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tierId,
          billingPeriod: billingPeriod,
          successUrl: `${window.location.origin}/dashboard/subscription?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/subscription?canceled=true`,
        }),
      });

      const result = await response.json();

      if (result.error) {
        alert(result.error);
        setCheckingOut(null);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to create checkout session. Please try again.');
      setCheckingOut(null);
    }
  };

  const handleManageBilling = async () => {
    if (!currentHousehold || !subscription) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to manage billing');
        return;
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-portal-session`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dashboard/subscription`,
        }),
      });

      const result = await response.json();

      if (result.error) {
        alert(result.error);
        return;
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal. Please try again.');
    }
  };

  if (loading || subscriptionLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const getTierFeatures = (tier: SubscriptionTierData) => {
    const features = [];

    if (tier.name === 'free') {
      features.push('Single household');
      features.push('Manual account tracking only');
      features.push('Calendar & events');
      features.push('Meal planning');
      features.push('Chores & tasks');
      features.push('Basic features to get started');
    } else if (tier.name === 'basic') {
      features.push('Single household');
      features.push('2 Plaid bank connections');
      features.push('Manual account refresh');
      features.push('Avalanche & Snowball strategies');
      features.push('Calendar, meals & chores');
    } else if (tier.name === 'premium') {
      features.push('Multiple households');
      features.push('4 Plaid bank connections');
      features.push('Auto-refresh on page load');
      features.push('Manual loan refresh');
      features.push('Avalanche, Snowball & Snowflake');
      features.push('Pantry tracking');
      features.push('Projects & savings tracking');
    } else if (tier.name === 'elite') {
      features.push('Multiple households');
      features.push('10 Plaid bank connections');
      features.push('Auto-refresh accounts & loans');
      features.push('All debt strategies + custom');
      features.push('Paycheck planner');
      features.push('Full pantry-meal-grocery integration');
      features.push('Projects & savings tracking');
    }

    return features;
  };

  const getButtonText = (tier: SubscriptionTierData) => {
    if (!currentTier) return 'Select Plan';

    if (tier.id === currentTier.id) {
      return 'Current Plan';
    }

    if (tier.monthly_price_cents > currentTier.monthly_price_cents) {
      return 'Upgrade';
    }

    if (tier.monthly_price_cents < currentTier.monthly_price_cents) {
      return 'Downgrade';
    }

    return 'Select Plan';
  };

  const isCurrentPlan = (tier: SubscriptionTierData) => {
    return currentTier?.id === tier.id;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Manage Subscription</h1>
          <p className="text-muted-foreground">
            Choose the plan that works best for your household
          </p>
        </div>

        <div className="flex justify-center items-center gap-4 mb-6">
          <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>
            Monthly
          </span>
          <Button
            variant="outline"
            size="sm"
            className="relative w-16 h-8 rounded-full p-0"
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
          >
            <div
              className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-primary transition-transform duration-200 ${
                billingPeriod === 'yearly' ? 'translate-x-8' : 'translate-x-0'
              }`}
            />
          </Button>
          <span className={`text-sm font-medium ${billingPeriod === 'yearly' ? 'text-primary' : 'text-muted-foreground'}`}>
            Yearly <Badge variant="secondary" className="ml-1">Save up to 20%</Badge>
          </span>
        </div>

      {subscription && (
        <Alert className="mb-8 border-primary/20 bg-primary/5">
          <Crown className="h-4 w-4 text-primary" />
          <AlertDescription>
            You are currently on the <strong>{currentTier?.display_name}</strong> plan.
            {subscription.status === 'active' ? (
              <Button
                variant="link"
                className="ml-2 h-auto p-0 text-primary"
                onClick={handleManageBilling}
              >
                Manage billing
              </Button>
            ) : subscription.status === 'canceled' ? (
              <span className="ml-2 text-muted-foreground">
                (Canceled - expires {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'})
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {allTiers.map((tier) => {
          const isCurrent = isCurrentPlan(tier);
          const features = getTierFeatures(tier);
          const buttonText = getButtonText(tier);
          const isProcessing = checkingOut === tier.id;

          return (
            <Card
              key={tier.id}
              className={`relative ${
                isCurrent
                  ? 'border-primary shadow-lg ring-2 ring-primary'
                  : 'border-border'
              }`}
            >
              {isCurrent && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Current Plan
                </Badge>
              )}

              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {tier.name !== 'free' && (
                    <Crown className="h-5 w-5 text-primary" />
                  )}
                  {tier.display_name}
                </CardTitle>
                <CardDescription>
                  {tier.name === 'free' ? (
                    <span className="text-2xl font-bold">Free</span>
                  ) : (
                    <div>
                      {billingPeriod === 'monthly' ? (
                        <>
                          <div className="text-2xl font-bold">
                            {formatCurrency(tier.monthly_price_cents / 100)}
                            <span className="text-sm font-normal text-muted-foreground">
                              /month
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Billed monthly
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">
                            {formatCurrency(tier.annual_price_cents / 100)}
                            <span className="text-sm font-normal text-muted-foreground">
                              /year
                            </span>
                          </div>
                          <div className="text-sm text-green-600 mt-1">
                            Save {formatCurrency((tier.monthly_price_cents * 12 - tier.annual_price_cents) / 100)}/year
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2 mb-6">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent || isProcessing}
                  onClick={() => handleSubscribe(tier.id, tier.name)}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    buttonText
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-12 text-center">
        <Button
          variant="outline"
          onClick={() => setShowComparison(!showComparison)}
          className="mb-8"
        >
          {showComparison ? 'Hide' : 'Compare'} Plans
        </Button>

        {showComparison && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Plan Comparison</CardTitle>
              <CardDescription>
                Compare features across all subscription tiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">Feature</th>
                      {allTiers.map((tier) => (
                        <th key={tier.id} className="text-center p-4 font-semibold">
                          <div>{tier.display_name}</div>
                          <div className="text-sm font-normal text-muted-foreground mt-1">
                            {tier.name === 'free'
                              ? 'Free'
                              : `${formatCurrency(tier.monthly_price_cents / 100)}/mo`}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-muted/30">
                      <td className="p-4 font-semibold" colSpan={allTiers.length + 1}>
                        Core Features
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Calendar</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Meal Planning</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Chores & Tasks</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4">
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Household Management</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4">
                          {tier.features.household_multi_user ? (
                            <span className="font-semibold">Multiple</span>
                          ) : (
                            <span className="text-muted-foreground">Single</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    <tr className="border-b bg-muted/30">
                      <td className="p-4 font-semibold" colSpan={allTiers.length + 1}>
                        Financial Features
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Bank Connections (Plaid)</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4">
                          {tier.name === 'free' ? (
                            <span className="text-sm text-muted-foreground">Manual only</span>
                          ) : (
                            <span className="font-semibold">{tier.features.plaid_connection_limit}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Auto-Refresh Accounts</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4">
                          {tier.features.auto_refresh_accounts ? (
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          ) : tier.features.auto_refresh_on_load ? (
                            <span className="text-sm">On Load</span>
                          ) : tier.features.manual_refresh_accounts ? (
                            <span className="text-sm text-muted-foreground">Manual</span>
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Auto-Refresh Loans</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4">
                          {tier.features.auto_refresh_loans ? (
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          ) : tier.features.manual_refresh_loans ? (
                            <span className="text-sm text-muted-foreground">Manual</span>
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Debt Payoff Strategies</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4">
                          {tier.name === 'free' ? (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          ) : tier.name === 'basic' ? (
                            <div className="text-sm">
                              <div className="text-xs text-muted-foreground">Avalanche, Snowball</div>
                            </div>
                          ) : tier.name === 'premium' ? (
                            <div className="text-sm">
                              <div className="text-xs text-muted-foreground">+ Snowflake</div>
                            </div>
                          ) : (
                            <div className="text-sm">
                              <div className="text-xs text-muted-foreground">All + Custom + Planner</div>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Paycheck Planner</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4">
                          {tier.features.paycheck_planner ? (
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>

                    <tr className="border-b bg-muted/30">
                      <td className="p-4 font-semibold" colSpan={allTiers.length + 1}>
                        Advanced Features
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Pantry Tracking</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4">
                          {tier.features.pantry_tracking ? (
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Meal-Pantry-Grocery Integration</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4">
                          {tier.features.meal_pantry_grocery_integration ? (
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Projects & Plans Tracking</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4">
                          {tier.features.projects_savings_tracking ? (
                            <Check className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>

                    <tr className="border-b bg-muted/30">
                      <td className="p-4 font-semibold" colSpan={allTiers.length + 1}>
                        Pricing
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Monthly Price</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4 font-semibold">
                          {tier.name === 'free'
                            ? 'Free'
                            : `${formatCurrency(tier.monthly_price_cents / 100)}`}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Annual Price</td>
                      {allTiers.map((tier) => (
                        <td key={tier.id} className="text-center p-4 font-semibold">
                          {tier.name === 'free'
                            ? 'Free'
                            : `${formatCurrency(tier.annual_price_cents / 100)}`}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-4"></td>
                      {allTiers.map((tier) => {
                        const isCurrent = isCurrentPlan(tier);
                        const buttonText = getButtonText(tier);
                        const isProcessing = checkingOut === tier.id;

                        return (
                          <td key={tier.id} className="text-center p-4">
                            <Button
                              size="sm"
                              variant={isCurrent ? 'outline' : 'default'}
                              disabled={isCurrent || isProcessing}
                              onClick={() => handleSubscribe(tier.id, tier.name)}
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Processing...
                                </>
                              ) : (
                                buttonText
                              )}
                            </Button>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-sm text-muted-foreground text-center">
          <p>All plans include calendar, meal planning, chores, and household management.</p>
          <p className="mt-2">Higher tiers unlock bank connectivity and advanced features.</p>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
