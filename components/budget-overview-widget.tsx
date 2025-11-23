'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useHousehold } from '@/lib/household-context';
import { supabase } from '@/lib/supabase';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Receipt, Home } from 'lucide-react';

interface BudgetOverviewProps {
  className?: string;
}

interface BudgetData {
  totalIncome: number;
  totalDebts: number;
  totalBills: number;
  totalHouseholdExpenses: number;
  totalExpenses: number;
  netIncome: number;
  incomeItems: Array<{ name: string; amount: number; icon: string; color: string }>;
  debtItems: Array<{ name: string; amount: number; icon: string; color: string }>;
  billItems: Array<{ name: string; amount: number; icon: string; color: string }>;
  householdItems: Array<{ name: string; amount: number; icon: string; color: string }>;
}

export function BudgetOverviewWidget({ className }: BudgetOverviewProps) {
  const { currentHousehold } = useHousehold();
  const [loading, setLoading] = useState(false);
  const [budgetData, setBudgetData] = useState<BudgetData>({
    totalIncome: 0,
    totalDebts: 0,
    totalBills: 0,
    totalHouseholdExpenses: 0,
    totalExpenses: 0,
    netIncome: 0,
    incomeItems: [],
    debtItems: [],
    billItems: [],
    householdItems: [],
  });


  useEffect(() => {
    if (currentHousehold) {
      loadBudgetData();
    }
  }, [currentHousehold]);

  const loadBudgetData = async () => {
    if (!currentHousehold) return;

    try {
      setLoading(true);

      const { data: incomeSourcesData, error: incomeSourcesError } = await supabase
        .from('income_sources')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .eq('is_active', true);

      if (incomeSourcesError) throw incomeSourcesError;

      const { data: paycheckData, error: paycheckError } = await supabase
        .from('paycheck_settings')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .eq('is_active', true);

      if (paycheckError) throw paycheckError;

      const { data: debtsData, error: debtsError } = await supabase
        .from('debts')
        .select('name, minimum_payment, type, transaction_categories(icon, color)')
        .eq('household_id', currentHousehold.id)
        .eq('is_active', true);

      if (debtsError) throw debtsError;

      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('company, amount, transaction_categories(icon, color)')
        .eq('household_id', currentHousehold.id)
        .eq('is_active', true);

      if (billsError) throw billsError;

      const { data: householdData, error: householdError } = await supabase
        .from('budget_categories')
        .select('monthly_amount, transaction_categories(name, icon, color)')
        .eq('household_id', currentHousehold.id)
        .eq('is_active', true);

      if (householdError) throw householdError;

      const incomeItems: Array<{ name: string; amount: number; icon: string; color: string }> = [];

      const hasPaycheckSettings = (paycheckData || []).length > 0;

      if (hasPaycheckSettings) {
        (paycheckData || []).forEach((paycheck, index) => {
          const frequencyLabel = paycheck.payment_frequency === 'weekly' ? 'Weekly Paycheck' :
                                paycheck.payment_frequency === 'biweekly' ? 'Bi-Weekly Paycheck' :
                                paycheck.payment_frequency === 'semimonthly' ? 'Semi-Monthly Paycheck' :
                                'Monthly Paycheck';

          const paychecksPerMonth = paycheck.payment_frequency === 'weekly' ? 4.33 :
                                    paycheck.payment_frequency === 'biweekly' ? 2.17 :
                                    paycheck.payment_frequency === 'semimonthly' ? 2 :
                                    1;

          incomeItems.push({
            name: paycheckData.length > 1 ? `${frequencyLabel} ${index + 1}` : frequencyLabel,
            amount: paycheck.net_pay_amount * paychecksPerMonth,
            icon: '💼',
            color: '#10b981',
          });
        });
      } else {
        (incomeSourcesData || []).forEach((source) => {
          incomeItems.push({
            name: source.name,
            amount: source.monthly_amount,
            icon: '💰',
            color: '#10b981',
          });
        });
      }

      const totalIncome = incomeItems.reduce((sum, item) => sum + item.amount, 0);

      const debtItems = (debtsData || []).map(debt => {
        const debtType = debt.type || 'other';
        let icon = '💰';

        if (debtType.toLowerCase().includes('credit')) icon = '💳';
        else if (debtType.toLowerCase().includes('student')) icon = '🎓';
        else if (debtType.toLowerCase().includes('auto') || debtType.toLowerCase().includes('car')) icon = '🚗';
        else if (debtType.toLowerCase().includes('mortgage') || debtType.toLowerCase().includes('home')) icon = '🏠';
        else if (debt.transaction_categories) icon = (debt.transaction_categories as any).icon || '💰';

        return {
          name: debt.name,
          amount: debt.minimum_payment,
          icon,
          color: (debt.transaction_categories as any)?.color || '#ef4444',
        };
      });

      const totalDebts = debtItems.reduce((sum, item) => sum + item.amount, 0);

      const billItems = (billsData || []).map(bill => ({
        name: bill.company,
        amount: bill.amount,
        icon: (bill.transaction_categories as any)?.icon || '📄',
        color: (bill.transaction_categories as any)?.color || '#f59e0b',
      }));

      const totalBills = billItems.reduce((sum, item) => sum + item.amount, 0);

      const householdItems = (householdData || []).map(cat => ({
        name: (cat.transaction_categories as any)?.name || 'Expense',
        amount: cat.monthly_amount,
        icon: (cat.transaction_categories as any)?.icon || '🏠',
        color: (cat.transaction_categories as any)?.color || '#3b82f6',
      }));

      const totalHouseholdExpenses = householdItems.reduce((sum, item) => sum + item.amount, 0);

      const totalExpenses = totalDebts + totalBills + totalHouseholdExpenses;
      const netIncome = totalIncome - totalExpenses;

      setBudgetData({
        totalIncome,
        totalDebts,
        totalBills,
        totalHouseholdExpenses,
        totalExpenses,
        netIncome,
        incomeItems,
        debtItems,
        billItems,
        householdItems,
      });
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <div className={className}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Budget Overview</h2>
            <p className="text-muted-foreground">Monthly breakdown of your income and expenses</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${budgetData.totalIncome.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">per month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${budgetData.totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Debts + Bills + Household
              </p>
            </CardContent>
          </Card>

          <Card className={budgetData.netIncome >= 0 ? 'border-green-200' : 'border-red-200'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              {budgetData.netIncome >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${budgetData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(budgetData.netIncome).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {budgetData.netIncome >= 0 ? 'Surplus' : 'Deficit'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expense Ratio</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {budgetData.totalIncome > 0 ? ((budgetData.totalExpenses / budgetData.totalIncome) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                of income
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Income
              </CardTitle>
              <CardDescription>Total: ${budgetData.totalIncome.toFixed(2)}</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetData.incomeItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No income recorded for this period</p>
              ) : (
                <div className="space-y-3">
                  {budgetData.incomeItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-green-600">${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-red-600" />
                Debts
              </CardTitle>
              <CardDescription>Total: ${budgetData.totalDebts.toFixed(2)}</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetData.debtItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active debts</p>
              ) : (
                <div className="space-y-3">
                  {budgetData.debtItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-red-600">${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-orange-600" />
                Bills
              </CardTitle>
              <CardDescription>Total: ${budgetData.totalBills.toFixed(2)}</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetData.billItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active bills</p>
              ) : (
                <div className="space-y-3">
                  {budgetData.billItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-orange-600">${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-blue-600" />
                Household Expenses
              </CardTitle>
              <CardDescription>Total: ${budgetData.totalHouseholdExpenses.toFixed(2)}</CardDescription>
            </CardHeader>
            <CardContent>
              {budgetData.householdItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No household expense categories</p>
              ) : (
                <div className="space-y-3">
                  {budgetData.householdItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-blue-600">${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
