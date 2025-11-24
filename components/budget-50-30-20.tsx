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
  debt_type?: string;
}

export function Budget503020() {
  const { currentHousehold } = useHousehold();
  const [annualIncome, setAnnualIncome] = useState(65000);
  const [creditCardDebt, setCreditCardDebt] = useState(0);
  const [otherLoans, setOtherLoans] = useState(0);
  const [assets, setAssets] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentHousehold) {
      loadFinancialData();
    }
  }, [currentHousehold]);

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
      const totalMonthlyIncome = incomeData?.reduce((sum, source) => sum + source.monthly_amount, 0) || 0;
      const calculatedAnnualIncome = totalMonthlyIncome * 12;
      if (calculatedAnnualIncome > 0) {
        setAnnualIncome(calculatedAnnualIncome);
      }

      // Load debts
      const { data: debtsData, error: debtsError } = await supabase
        .from('debts')
        .select('name, current_balance, debt_type, category_id')
        .eq('household_id', currentHousehold.id)
        .eq('is_active', true);

      if (debtsError) throw debtsError;

      // Load transaction categories to get the Credit Card category
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('transaction_categories')
        .select('id, name')
        .eq('household_id', currentHousehold.id);

      if (categoriesError) throw categoriesError;

      // Find the Credit Card category ID
      const creditCardCategory = categoriesData?.find((cat: any) => 
        cat.name.toLowerCase().includes('credit') && cat.name.toLowerCase().includes('card')
      );

      // Separate credit card debt from other loans based on category
      let ccDebt = 0;
      let loans = 0;

      debtsData?.forEach((debt: any) => {
        // Check if the debt's category_id matches the Credit Card category
        if (creditCardCategory && debt.category_id === creditCardCategory.id) {
          ccDebt += debt.current_balance;
        } else {
          loans += debt.current_balance;
        }
      });

      setCreditCardDebt(ccDebt);
      setOtherLoans(loans);

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDecimal = (num: number) => {
    return num.toFixed(2);
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
            <Label htmlFor="annual-income">Enter your total annual income after taxes:</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="annual-income"
                type="number"
                value={annualIncome}
                onChange={(e) => setAnnualIncome(parseFloat(e.target.value) || 0)}
                className="pl-9 text-lg font-semibold"
                step="1000"
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
              <Label htmlFor="cc-debt" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-rose-600" />
                Enter your total credit card debt:
              </Label>
              <div className="relative w-48">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cc-debt"
                  type="number"
                  value={creditCardDebt}
                  onChange={(e) => setCreditCardDebt(parseFloat(e.target.value) || 0)}
                  className="pl-9"
                  step="100"
                />
              </div>
            </div>
            {creditCardDebt > 0 && (
              <Card className="border-rose-200 bg-rose-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">You could eliminate all credit card debt in:</span>
                    <span className="text-lg font-bold text-rose-600">{formatDecimal(monthsToCCPayoff)} months</span>
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
                <span className="text-lg font-bold text-amber-700">{formatDecimal(monthsToEmergencyFund)} months</span>
              </div>
            </CardContent>
          </Card>

          {/* Other Loans */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="other-loans" className="flex items-center gap-2">
                <Home className="h-4 w-4 text-blue-600" />
                Total student, car, mortgage, personal and other loans:
              </Label>
              <div className="relative w-48">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="other-loans"
                  type="number"
                  value={otherLoans}
                  onChange={(e) => setOtherLoans(parseFloat(e.target.value) || 0)}
                  className="pl-9"
                  step="1000"
                />
              </div>
            </div>
            {otherLoans > 0 && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">You could eliminate all loans in:</span>
                    <span className="text-lg font-bold text-blue-600">{formatDecimal(yearsToLoanPayoff)} years</span>
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
                  type="number"
                  value={assets}
                  onChange={(e) => setAssets(parseFloat(e.target.value) || 0)}
                  className="pl-9"
                  step="1000"
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
