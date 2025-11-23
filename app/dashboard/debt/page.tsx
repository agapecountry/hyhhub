'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
// import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddDebtDialog } from '@/components/add-debt-dialog';
import { RecordPaymentDialog } from '@/components/record-payment-dialog';
import { CreditCard, Plus, DollarSign, Calendar, TrendingDown, Trash2, CheckCircle2, Clock, TrendingUp, AlertCircle, Edit2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { calculateAvalancheStrategy, calculateSnowballStrategy, calculateTotalInterest, calculatePayoffDate } from '@/lib/debt-calculations';
import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/lib/household-context';
import { useSubscription } from '@/lib/subscription-context';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, differenceInMonths } from 'date-fns';
import { PageHelpDialog } from '@/components/page-help-dialog';
import { pageHelpContent } from '@/lib/page-help-content';

interface Debt {
  id: string;
  name: string;
  type: string;
  original_balance: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  payment_day: number;
  loan_start_date: string;
  term_months: number | null;
  lender: string | null;
  account_number_last4: string | null;
  payoff_strategy: string;
  extra_payment: number;
  is_active: boolean;
  paid_off_at: string | null;
  created_at: string;
  exclude_from_payoff: boolean;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
  remaining_balance: number;
  notes: string | null;
}

export default function DebtPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentHousehold } = useHousehold();
  const { hasFeature, tier } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [extraPayment, setExtraPayment] = useState(0);
  const [chosenStrategy, setChosenStrategy] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);

  useEffect(() => {
    if (currentHousehold) {
      loadDebts();
      loadPayments();
      loadStrategy();
    }
  }, [currentHousehold]);

  const loadStrategy = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('households')
        .select('debt_payoff_strategy, debt_extra_payment')
        .eq('id', currentHousehold.id)
        .single();

      if (error) throw error;

      setChosenStrategy(data.debt_payoff_strategy);
      setExtraPayment(data.debt_extra_payment || 0);
    } catch (error: any) {
      console.error('Error loading strategy:', error);
    }
  };

  const loadDebts = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('is_active', { ascending: false })
        .order('current_balance', { ascending: false });

      if (error) throw error;
      setDebts(data || []);
    } catch (error: any) {
      console.error('Error loading debts:', error);
    }
  };

  const loadPayments = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('payment_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      console.error('Error loading payments:', error);
    }
  };

  const handleDeleteDebt = async () => {
    if (!debtToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('debts').delete().eq('id', debtToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Debt deleted successfully',
      });

      loadDebts();
      loadPayments();
      setDeleteDialogOpen(false);
      setDebtToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete debt',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentDialogOpen(true);
  };

  const handleToggleExclude = async (debt: Debt) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('debts')
        .update({ exclude_from_payoff: !debt.exclude_from_payoff })
        .eq('id', debt.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: debt.exclude_from_payoff
          ? 'Debt included in payoff plan'
          : 'Debt excluded from payoff plan',
      });

      loadDebts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update debt',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChooseStrategy = async (strategy: 'avalanche' | 'snowball') => {
    if (!currentHousehold) return;

    if (!hasFeature('personalized_debt_plan')) {
      toast({
        title: 'Premium Feature',
        description: 'Personalized debt plans are available on Premium and Elite tiers. Upgrade to get your custom payment plan!',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('households')
        .update({
          debt_payoff_strategy: strategy,
          debt_extra_payment: extraPayment,
        })
        .eq('id', currentHousehold.id);

      if (error) throw error;

      setChosenStrategy(strategy);

      toast({
        title: 'Strategy Selected',
        description: `You've chosen the ${strategy} method. Your personalized plan is ready!`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save strategy',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDebtTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      mortgage: '🏠',
      auto: '🚗',
      student: '🎓',
      credit_card: '💳',
      personal: '💰',
      other: '📋',
    };
    return icons[type] || '📋';
  };

  const calculatePayoffMonths = (debt: Debt) => {
    if (debt.current_balance === 0) return 0;
    if (debt.interest_rate === 0) {
      return Math.ceil(debt.current_balance / debt.minimum_payment);
    }

    const monthlyRate = debt.interest_rate / 100 / 12;
    const payment = debt.minimum_payment;
    const balance = debt.current_balance;

    if (payment <= balance * monthlyRate) {
      return 999;
    }

    const months = Math.ceil(
      -Math.log(1 - (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate)
    );

    return months;
  };

  const activeDebts = debts.filter(d => d.is_active);
  const paidOffDebts = debts.filter(d => !d.is_active);

  const totalDebt = activeDebts.reduce((sum, d) => sum + d.current_balance, 0);
  const totalMonthlyPayment = activeDebts.reduce((sum, d) => sum + d.minimum_payment, 0);
  const totalOriginal = activeDebts.reduce((sum, d) => sum + d.original_balance, 0);

  // Filter debts to include only those not excluded from payoff plan
  const includedDebts = activeDebts.filter(d => !d.exclude_from_payoff);

  const avalancheSchedules = calculateAvalancheStrategy(includedDebts, extraPayment);
  const snowballSchedules = calculateSnowballStrategy(includedDebts, extraPayment);

  const avalancheTotalInterest = Array.from(avalancheSchedules.values()).reduce(
    (sum, schedule) => sum + calculateTotalInterest(schedule),
    0
  );
  const snowballTotalInterest = Array.from(snowballSchedules.values()).reduce(
    (sum, schedule) => sum + calculateTotalInterest(schedule),
    0
  );

  const avalanchePayoffDate = Array.from(avalancheSchedules.values())
    .map(s => calculatePayoffDate(s))
    .filter(d => d !== null)
    .sort((a, b) => b!.getTime() - a!.getTime())[0];

  const snowballPayoffDate = Array.from(snowballSchedules.values())
    .map(s => calculatePayoffDate(s))
    .filter(d => d !== null)
    .sort((a, b) => b!.getTime() - a!.getTime())[0];

  if (!currentHousehold) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Please select a household</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Debt Payoff Planner</h1>
            <p className="text-muted-foreground">Track loans and create payoff strategies</p>
          </div>
          <PageHelpDialog content={pageHelpContent.debt} />
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Debt
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalDebt.toFixed(2)}</div>
              {totalOriginal > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {((totalDebt / totalOriginal) * 100).toFixed(1)}% remaining
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Payment</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalMonthlyPayment.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {activeDebts.length} active {activeDebts.length === 1 ? 'debt' : 'debts'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Off</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paidOffDebts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {paidOffDebts.length === 1 ? 'debt' : 'debts'} completed
              </p>
            </CardContent>
          </Card>
        </div>

        {activeDebts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Payoff Strategy Comparison
              </CardTitle>
              <CardDescription>Compare avalanche vs snowball methods</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="extra-payment">Extra Monthly Payment</Label>
                <Input
                  id="extra-payment"
                  type="number"
                  step="1"
                  min="0"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add extra monthly payment to accelerate payoff
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Avalanche Method
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Pay off highest interest rate first
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Interest Paid</div>
                      <div className="text-xl font-bold text-primary">
                        ${avalancheTotalInterest.toFixed(2)}
                      </div>
                    </div>
                    {avalanchePayoffDate && (
                      <div>
                        <div className="text-xs text-muted-foreground">Debt-Free Date</div>
                        <div className="font-semibold">
                          {format(avalanchePayoffDate, 'MMM yyyy')}
                        </div>
                      </div>
                    )}
                    <div className="pt-2">
                      <Badge variant="secondary" className="text-xs">
                        Saves the most money
                      </Badge>
                    </div>
                    {chosenStrategy === 'avalanche' ? (
                      <div className="pt-2">
                        <Badge className="w-full justify-center">Selected Strategy</Badge>
                      </div>
                    ) : (
                      <Button
                        className="w-full mt-2"
                        size="sm"
                        onClick={() => handleChooseStrategy('avalanche')}
                        disabled={loading}
                      >
                        {hasFeature('personalized_debt_plan') ? 'Choose This Plan' : 'Upgrade to Choose'}
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Snowball Method
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Pay off smallest balance first
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Interest Paid</div>
                      <div className="text-xl font-bold text-primary">
                        ${snowballTotalInterest.toFixed(2)}
                      </div>
                    </div>
                    {snowballPayoffDate && (
                      <div>
                        <div className="text-xs text-muted-foreground">Debt-Free Date</div>
                        <div className="font-semibold">
                          {format(snowballPayoffDate, 'MMM yyyy')}
                        </div>
                      </div>
                    )}
                    <div className="pt-2">
                      <Badge variant="secondary" className="text-xs">
                        Quick wins for motivation
                      </Badge>
                    </div>
                    {chosenStrategy === 'snowball' ? (
                      <div className="pt-2">
                        <Badge className="w-full justify-center">Selected Strategy</Badge>
                      </div>
                    ) : (
                      <Button
                        className="w-full mt-2"
                        size="sm"
                        onClick={() => handleChooseStrategy('snowball')}
                        disabled={loading}
                      >
                        {hasFeature('personalized_debt_plan') ? 'Choose This Plan' : 'Upgrade to Choose'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong>Avalanche</strong> saves more money by targeting high-interest debts first.
                  <strong> Snowball</strong> provides psychological wins by eliminating small debts quickly.
                </p>
              </div>

              {!hasFeature('personalized_debt_plan') && (
                <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">Want a Personalized Payment Plan?</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Upgrade to <strong>Premium</strong> or <strong>Elite</strong> to get a customized debt payoff plan that tells you exactly which debt to pay and how much to pay each month.
                      </p>
                      <Link href="/dashboard/subscription">
                        <Button size="sm">
                          View Subscription Plans
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {chosenStrategy && activeDebts.length > 0 && hasFeature('personalized_debt_plan') && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Your Personalized Payment Plan
              </CardTitle>
              <CardDescription>
                Based on your {chosenStrategy} strategy with ${extraPayment.toFixed(2)} extra monthly payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const schedules = chosenStrategy === 'avalanche' ? avalancheSchedules : snowballSchedules;
                const sortedDebts = chosenStrategy === 'avalanche'
                  ? [...includedDebts].sort((a, b) => b.interest_rate - a.interest_rate)
                  : [...includedDebts].sort((a, b) => a.current_balance - b.current_balance);

                const focusDebt = sortedDebts.find(d => d.current_balance > 0);

                return (
                  <>
                    <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{focusDebt && getDebtTypeIcon(focusDebt.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg">Focus Debt: {focusDebt?.name}</h3>
                            <Badge variant="default">Pay Extra Here</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {chosenStrategy === 'avalanche'
                              ? `This debt has the highest interest rate (${focusDebt?.interest_rate.toFixed(3)}%), so paying it off first saves the most money.`
                              : `This debt has the smallest balance ($${focusDebt?.current_balance.toFixed(2)}), so paying it off first provides a quick win.`}
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-muted-foreground">Minimum Payment</div>
                              <div className="text-lg font-bold">${focusDebt?.minimum_payment.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Recommended Payment</div>
                              <div className="text-lg font-bold text-primary">
                                ${focusDebt && (focusDebt.minimum_payment + extraPayment).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {sortedDebts.filter(d => d.id !== focusDebt?.id).length > 0 && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <h4 className="font-semibold mb-1 flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4" />
                          Other Debts - Pay Minimum Only
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Continue making minimum payments on your remaining {sortedDebts.filter(d => d.id !== focusDebt?.id).length} {sortedDebts.filter(d => d.id !== focusDebt?.id).length === 1 ? 'debt' : 'debts'}. See details in the Active Debts section below.
                        </p>
                      </div>
                    )}

                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-muted-foreground">
                        <strong>Important:</strong> Once {focusDebt?.name} is paid off, roll its payment (${focusDebt && (focusDebt.minimum_payment + extraPayment).toFixed(2)})
                        into the next debt on your list. This creates a snowball effect that accelerates your debt payoff!
                      </div>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active Debts ({activeDebts.length})</TabsTrigger>
            <TabsTrigger value="paid">Paid Off ({paidOffDebts.length})</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-4">
            {activeDebts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <TrendingDown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active debts</p>
                  <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Debt
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeDebts.map((debt) => {
                const progressPercent = ((debt.original_balance - debt.current_balance) / debt.original_balance) * 100;
                const payoffMonths = calculatePayoffMonths(debt);

                const sortedDebts = chosenStrategy === 'avalanche'
                  ? [...includedDebts].sort((a, b) => b.interest_rate - a.interest_rate)
                  : [...includedDebts].sort((a, b) => a.current_balance - b.current_balance);
                const focusDebt = sortedDebts.find(d => d.current_balance > 0);
                const isFocusDebt = chosenStrategy && focusDebt?.id === debt.id && hasFeature('personalized_debt_plan') && !debt.exclude_from_payoff;
                const recommendedPayment = isFocusDebt ? debt.minimum_payment + extraPayment : debt.minimum_payment;

                return (
                  <Card key={debt.id} className={isFocusDebt ? 'border-2 border-primary' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{getDebtTypeIcon(debt.type)}</div>
                          <div>
                            <CardTitle className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => router.push(`/dashboard/debt/${debt.id}`)}
                                className="hover:text-primary transition-colors cursor-pointer flex items-center gap-2"
                              >
                                {debt.name}
                                <ExternalLink className="h-4 w-4" />
                              </button>
                              {debt.account_number_last4 && (
                                <span className="text-sm font-normal text-muted-foreground">
                                  ****{debt.account_number_last4}
                                </span>
                              )}
                              {isFocusDebt && (
                                <Badge variant="default" className="text-xs">
                                  Focus Debt
                                </Badge>
                              )}
                              {debt.exclude_from_payoff && (
                                <Badge variant="outline" className="text-xs">
                                  Excluded from Plan
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription>
                              {debt.lender && `${debt.lender} • `}
                              {debt.interest_rate.toFixed(3)}% APR
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleRecordPayment(debt)}
                            disabled={loading}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Pay
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingDebt(debt);
                              setAddDialogOpen(true);
                            }}
                            disabled={loading}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDebtToDelete(debt);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Balance</span>
                          <span className="font-semibold">
                            ${debt.current_balance.toFixed(2)} / ${debt.original_balance.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {progressPercent.toFixed(1)}% paid off
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                        <div>
                          <div className="text-xs text-muted-foreground">Min Payment</div>
                          <div className="font-semibold">${debt.minimum_payment.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Due Day</div>
                          <div className="font-semibold flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {debt.payment_day}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Payoff Time</div>
                          <div className="font-semibold flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {payoffMonths === 999 ? '∞' : `${payoffMonths}mo`}
                          </div>
                        </div>
                      </div>

                      {isFocusDebt && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground">Recommended Payment</div>
                              <div className="text-lg font-bold text-primary">
                                ${recommendedPayment.toFixed(2)}
                              </div>
                            </div>
                            <Badge variant="default">
                              +${extraPayment.toFixed(2)} extra
                            </Badge>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`exclude-${debt.id}`}
                            checked={debt.exclude_from_payoff}
                            onCheckedChange={() => handleToggleExclude(debt)}
                            disabled={loading}
                          />
                          <label
                            htmlFor={`exclude-${debt.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Exclude from payoff plan
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">
                          When checked, this debt won't be included in avalanche/snowball calculations
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="paid" className="space-y-4 mt-4">
            {paidOffDebts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No paid off debts yet</p>
                </CardContent>
              </Card>
            ) : (
              paidOffDebts.map((debt) => (
                <Card key={debt.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl opacity-50">{getDebtTypeIcon(debt.type)}</div>
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/dashboard/debt/${debt.id}`)}
                              className="hover:text-primary transition-colors cursor-pointer flex items-center gap-2 line-through"
                            >
                              {debt.name}
                              <ExternalLink className="h-4 w-4" />
                            </button>
                            <Badge variant="secondary" className="ml-2">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Paid Off
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            Paid off on {debt.paid_off_at && format(parseISO(debt.paid_off_at), 'MMM d, yyyy')}
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDebtToDelete(debt);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Original Balance: ${debt.original_balance.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            {payments.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No payment history yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>Last 10 payments across all debts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">${payment.amount.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(parseISO(payment.payment_date), 'MMM d, yyyy')}
                          </div>
                          {payment.notes && (
                            <div className="text-xs text-muted-foreground mt-1">{payment.notes}</div>
                          )}
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-muted-foreground">
                            Principal: ${payment.principal_paid.toFixed(2)}
                          </div>
                          <div className="text-muted-foreground">
                            Interest: ${payment.interest_paid.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>
      </div>

      <AddDebtDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditingDebt(null);
        }}
        householdId={currentHousehold.id}
        editingDebt={editingDebt}
        onSuccess={() => {
          setEditingDebt(null);
          loadDebts();
          loadPayments();
        }}
      />

      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        debt={selectedDebt}
        householdId={currentHousehold.id}
        onSuccess={() => {
          loadDebts();
          loadPayments();
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Debt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{debtToDelete?.name}"? This will also delete all payment history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDebt} disabled={loading}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
