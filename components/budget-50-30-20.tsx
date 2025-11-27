'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useHousehold } from '@/lib/household-context';
import { supabase } from '@/lib/supabase';
import { DollarSign, TrendingUp, CreditCard, Home, PiggyBank, Wallet } from 'lucide-react';

interface IncomeSource {
  id: string;
  monthly_amount: number;
}

interface Debt {
  id: string;
  name: string;
  current_balance: number;
  type?: string;
}

export function Budget503020() {
  const { currentHousehold } = useHousehold();
  const [annualIncome, setAnnualIncome] = useState(65000);
  const [creditCardDebt, setCreditCardDebt] = useState(0);
  const [otherLoans, setOtherLoans] = useState(0);
  const [assets, setAssets] = useState(0);
  const [monthlyBills, setMonthlyBills] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentHousehold) {
      loadFinancialData();
    }
  }, [currentHousehold]);

  const saveBudgetData = async (data: { annualIncome: number; assets: number }) => {
    if (!currentHousehold) return;

    try {
      await supabase
        .from('household_preferences')
        .upsert({
          household_id: currentHousehold.id,
          preference_key: 'budget_503020_data',
          preference_value: data,
        }, {
          onConflict: 'household_id,preference_key'
        });
    } catch (error) {
      console.error('Error saving budget data:', error);
    }
  };

  const debouncedSave = (income: number, assetValue: number) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    const timeout = setTimeout(() => {
      saveBudgetData({ annualIncome: income, assets: assetValue });
    }, 1000); // Save 1 second after user stops typing
    setSaveTimeout(timeout);
  };

  const loadFinancialData = async () => {
    if (!currentHousehold) return;

    try {
      setLoading(true);

      // Load income sources
      const { data: incomeData, error: incomeError } = await supabase
        .from('income_sources')
        .select('monthly_amount')
        .eq('household_id', currentHousehold.id)
        .eq('is_active', true);

      if (incomeError) throw incomeError;

      // Calculate annual income from monthly sources
      let totalMonthlyIncome = incomeData?.reduce((sum, source) => sum + source.monthly_amount, 0) || 0;

      // If no income sources, try loading from paycheck settings
      if (totalMonthlyIncome === 0) {
        const { data: paychecksData, error: paychecksError } = await supabase
          .from('paycheck_settings')
          .select('net_pay_amount, payment_frequency')
          .eq('household_id', currentHousehold.id);

        if (!paychecksError && paychecksData && paychecksData.length > 0) {
          // Calculate monthly income from all paycheck settings
          totalMonthlyIncome = paychecksData.reduce((sum, paycheck) => {
            let monthlyAmount = 0;
            switch (paycheck.payment_frequency) {
              case 'weekly':
                monthlyAmount = paycheck.net_pay_amount * 4.33;
                break;
              case 'biweekly':
                monthlyAmount = paycheck.net_pay_amount * 2.17;
                break;
              case 'semimonthly':
                monthlyAmount = paycheck.net_pay_amount * 2;
                break;
              case 'monthly':
                monthlyAmount = paycheck.net_pay_amount;
                break;
              default:
                monthlyAmount = paycheck.net_pay_amount;
            }
            return sum + monthlyAmount;
          }, 0);
        }
      }

      const calculatedAnnualIncome = totalMonthlyIncome * 12;
      
      // Load saved budget data
      const { data: budgetData } = await supabase
        .from('household_preferences')
        .select('preference_value')
        .eq('household_id', currentHousehold.id)
        .eq('preference_key', 'budget_503020_data')
        .maybeSingle();

      if (budgetData && budgetData.preference_value) {
        const saved = budgetData.preference_value as any;
        setAnnualIncome(saved.annualIncome || calculatedAnnualIncome || 65000);
        setAssets(saved.assets || 0);
        // Don't override auto-calculated debts and bills
      } else {
        // Use calculated or default
        setAnnualIncome(calculatedAnnualIncome > 0 ? calculatedAnnualIncome : 65000);
      }

      // Load debts
      const { data: debtsData, error: debtsError } = await supabase
        .from('debts')
        .select('name, current_balance, type')
        .eq('household_id', currentHousehold.id)
        .eq('is_active', true);

      if (debtsError) throw debtsError;

      // Separate credit card debt from other loans based on debt type
      let ccDebt = 0;
      let loans = 0;

      debtsData?.forEach((debt: any) => {
        const debtType = debt.type?.toLowerCase() || '';
        // Check if debt type is credit card
        if (debtType.includes('credit') || debtType === 'credit_card') {
          ccDebt += debt.current_balance;
        } else {
          // All other debt types (auto loan, mortgage, student loan, personal loan, etc.)
          loans += debt.current_balance;
        }
      });

      setCreditCardDebt(ccDebt);
      setOtherLoans(loans);

      // Load bills to calculate monthly recurring expenses (needs)
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('amount, frequency')
        .eq('household_id', currentHousehold.id)
        .eq('is_active', true);

      if (billsError) throw billsError;

      // Calculate monthly bills amount based on frequency
      const totalMonthlyBills = billsData?.reduce((sum, bill) => {
        let monthlyAmount = 0;
        switch (bill.frequency) {
          case 'weekly':
            monthlyAmount = bill.amount * 4.33; // Average weeks per month
            break;
          case 'biweekly':
            monthlyAmount = bill.amount * 2.17; // Average biweekly periods per month
            break;
          case 'monthly':
            monthlyAmount = bill.amount;
            break;
          case 'quarterly':
            monthlyAmount = bill.amount / 3;
            break;
          case 'annual':
            monthlyAmount = bill.amount / 12;
            break;
          default:
            monthlyAmount = bill.amount; // Default to treating as monthly
        }
        return sum + monthlyAmount;
      }, 0) || 0;

      setMonthlyBills(totalMonthlyBills);

      // TODO: Add assets tracking if available in database
      // For now, allow manual entry

    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const monthlyIncome = annualIncome / 12;
  const needs = monthlyIncome * 0.5;
  const wants = monthlyIncome * 0.3;
  const savings = monthlyIncome * 0.2;

  // Emergency fund calculations
  const emergencyFundTarget = monthlyIncome * 3;
  const monthsToEmergencyFund = emergencyFundTarget / savings;

  // Debt elimination calculations
  const monthsToCCPayoff = creditCardDebt > 0 ? creditCardDebt / savings : 0;
  const yearsToLoanPayoff = otherLoans > 0 ? (otherLoans / savings) / 12 : 0;

  // Retirement savings (15% after emergency fund and CC paid off)
  const retirementSavings = monthlyIncome * 0.15;

  // Net worth
  const totalLiabilities = creditCardDebt + otherLoans;
  const netWorth = assets - totalLiabilities;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true, // Explicitly enable comma separators
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    }).format(num);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">Loading financial data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            50/30/20 Budget Calculator
          </CardTitle>
          <CardDescription>
            Generate a simple snapshot of your finances based on the 50/30/20 budget rule
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* How it Works */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold mb-3">How it Works →</h3>
            <div className="space-y-1 text-sm">
              <p>🏠 Spend <strong>50%</strong> each month on living expenses (needs)</p>
              <p>🎭 Spend <strong>30%</strong> each month on discretionary expenses (wants)</p>
              <p>💰 Save <strong>20%</strong> each month (or use to eliminate debt)</p>
            </div>
          </div>

          {/* Income Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="annual-income">Total annual income after taxes:</Label>
              {annualIncome > 0 && (
                <span className="text-xl font-bold text-emerald-600">{formatCurrency(annualIncome)}</span>
              )}
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="annual-income"
                type="text"
                value={formatCurrency(annualIncome).replace('$', '')}
                onChange={(e) => {
                  const numValue = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                  setAnnualIncome(numValue);
                  debouncedSave(numValue, assets);
                }}
                className="pl-9"
              />
            </div>
          </div>

          {/* 50/30/20 Breakdown */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">50% Needs</div>
                  <div className="text-2xl font-bold text-emerald-600">{formatCurrency(needs)}</div>
                  <div className="text-xs text-muted-foreground mt-1">per month</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">30% Wants</div>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(wants)}</div>
                  <div className="text-xs text-muted-foreground mt-1">per month</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">20% Savings</div>
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(savings)}</div>
                  <div className="text-xs text-muted-foreground mt-1">per month</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Credit Card Debt */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="cc-debt" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-rose-600" />
                  Total credit card debt:
                </Label>
                {creditCardDebt > 0 && (
                  <span className="text-lg font-bold text-rose-600">{formatCurrency(creditCardDebt)}</span>
                )}
              </div>
              <div className="relative w-48">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cc-debt"
                  type="text"
                  value={formatCurrency(creditCardDebt).replace('$', '')}
                  onChange={(e) => {
                    const numValue = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                    setCreditCardDebt(numValue);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            {creditCardDebt > 0 && (
              <Card className="border-rose-200 bg-rose-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">You could eliminate all credit card debt in:</span>
                    <span className="text-lg font-bold text-rose-600">{formatNumber(monthsToCCPayoff)} months</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Emergency Fund */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">3-month emergency fund target:</span>
                <span className="text-lg font-bold text-amber-700">{formatCurrency(emergencyFundTarget)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Using entire saving allocation, fully funded in:</span>
                <span className="text-lg font-bold text-amber-700">{formatNumber(monthsToEmergencyFund)} months</span>
              </div>
            </CardContent>
          </Card>

          {/* Other Loans */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="other-loans" className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-blue-600" />
                  Total student, car, mortgage, personal and other loans:
                </Label>
                {otherLoans > 0 && (
                  <span className="text-lg font-bold text-blue-600">{formatCurrency(otherLoans)}</span>
                )}
              </div>
              <div className="relative w-48">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="other-loans"
                  type="text"
                  value={formatCurrency(otherLoans).replace('$', '')}
                  onChange={(e) => {
                    const numValue = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                    setOtherLoans(numValue);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            {otherLoans > 0 && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">You could eliminate all loans in:</span>
                    <span className="text-lg font-bold text-blue-600">{formatNumber(yearsToLoanPayoff)} years</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Assets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="assets" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Total value of assets (cash, home, investments, valuables):
              </Label>
              <div className="relative w-48">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="assets"
                  type="text"
                  value={formatCurrency(assets).replace('$', '')}
                  onChange={(e) => {
                    const numValue = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                    setAssets(numValue);
                    debouncedSave(annualIncome, numValue);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Retirement Savings */}
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  After your emergency fund is full and your credit cards paid off, save 15% each month for retirement:
                </p>
                <div className="text-2xl font-bold text-purple-600">{formatCurrency(retirementSavings)}</div>
                <div className="text-xs text-muted-foreground">per month</div>
              </div>
            </CardContent>
          </Card>

          {/* Net Worth */}
          <Card className={`border-2 ${netWorth >= 0 ? 'border-emerald-300 bg-emerald-50/50' : 'border-rose-300 bg-rose-50/50'}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Your current total net worth</span>
                  <p className="text-xs text-muted-foreground">(assets minus liabilities)</p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${netWorth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(netWorth)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
