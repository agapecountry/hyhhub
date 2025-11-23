'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/lib/household-context';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { DollarSign, TrendingDown, ShoppingBag, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface CategorySpending {
  category_id: string;
  category_name: string;
  icon: string;
  color: string;
  total_amount: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  notes: string | null;
  account_name: string;
  plaid_transaction_id: string | null;
  is_scheduled?: boolean;
  debt_name?: string;
}

interface TransactionCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

type DateFilter = 'this_month' | 'last_month' | 'custom';

interface SpendingBreakdownProps {
  monthOffset?: number;
}

export function SpendingBreakdownWidget({ monthOffset = 0 }: SpendingBreakdownProps) {
  const { currentHousehold } = useHousehold();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [totalSpending, setTotalSpending] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<CategorySpending | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [showCustomDateDialog, setShowCustomDateDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    date: '',
    description: '',
    amount: '',
    category_id: '',
    notes: ''
  });

  useEffect(() => {
    if (currentHousehold) {
      loadSpendingData();
      loadCategories();
    }
  }, [currentHousehold, monthOffset, dateFilter, customStartDate, customEndDate]);

  const loadCategories = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('id, name, icon, color')
        .eq('household_id', currentHousehold.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error loading categories:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (dateFilter === 'this_month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else if (dateFilter === 'last_month') {
      const lastMonth = subMonths(now, 1);
      startDate = startOfMonth(lastMonth);
      endDate = endOfMonth(lastMonth);
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    return { startDate, endDate };
  };

  const loadSpendingData = async () => {
    if (!currentHousehold) return;

    try {
      setLoading(true);

      const { startDate, endDate } = getDateRange();
      // Use format() instead of toISOString() to avoid timezone conversion issues
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      const { data: spendingData, error } = await supabase.rpc('get_spending_breakdown', {
        p_household_id: currentHousehold.id,
        p_start_date: startDateStr,
        p_end_date: endDateStr
      });

      if (error) throw error;

      const formatted = (spendingData || []).map((item: any) => ({
        category_id: item.category_id,
        category_name: item.category_name,
        icon: item.icon || '💰',
        color: item.color || '#3b82f6',
        total_amount: parseFloat(item.total_amount) || 0
      }));

      const total = formatted.reduce((sum: number, item: CategorySpending) => sum + item.total_amount, 0);

      setCategorySpending(formatted);
      setTotalSpending(total);
    } catch (error: any) {
      console.error('Error loading spending breakdown:', error);
      setCategorySpending([]);
      setTotalSpending(0);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryTransactions = async (category: CategorySpending) => {
    if (!currentHousehold) return;

    try {
      setLoadingTransactions(true);
      setSelectedCategory(category);

      const { startDate, endDate } = getDateRange();
      // Use format() instead of toISOString() to avoid timezone conversion issues
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      console.log('Loading transactions for date range:', { startDateStr, endDateStr, categoryId: category.category_id });

      // Fetch actual transactions
      let query = supabase
        .from('transactions')
        .select(`
          id,
          date,
          description,
          amount,
          notes,
          plaid_transaction_id,
          accounts!inner(name)
        `)
        .eq('household_id', currentHousehold.id)
        .lt('amount', 0)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (category.category_id === '00000000-0000-0000-0000-000000000000') {
        query = query.is('category_id', null);
      } else {
        query = query.eq('category_id', category.category_id);
      }

      const { data: txnData, error: txnError } = await query.order('date', { ascending: false });

      if (txnError) throw txnError;

      console.log('Fetched transactions:', txnData?.map(t => ({ date: t.date, description: t.description })));

      const formattedTxns = (txnData || []).map((txn: any) => ({
        id: txn.id,
        date: txn.date,
        description: txn.description,
        amount: Math.abs(txn.amount),
        notes: txn.notes,
        account_name: txn.accounts?.name || 'Unknown',
        plaid_transaction_id: txn.plaid_transaction_id,
        is_scheduled: false
      }));

      // Fetch scheduled debt payments that don't have transactions yet
      const { data: debtData, error: debtError } = await supabase
        .from('debts')
        .select('id, name, minimum_payment, payment_day')
        .eq('household_id', currentHousehold.id)
        .eq('category_id', category.category_id)
        .eq('is_active', true)
        .not('payment_day', 'is', null);

      if (debtError) throw debtError;

      // Filter out debts that have transactions in this period
      const debtsWithoutTransactions = [];
      for (const debt of debtData || []) {
        const { data: existingTxn } = await supabase
          .from('transactions')
          .select('id')
          .eq('debt_id', debt.id)
          .gte('date', startDateStr)
          .lte('date', endDateStr)
          .limit(1);

        if (!existingTxn || existingTxn.length === 0) {
          debtsWithoutTransactions.push(debt);
        }
      }

      // Create scheduled transaction entries for debts in the date range
      const scheduledTxns = debtsWithoutTransactions
        .map((debt: any) => {
          // Get year and month from the date range we're viewing
          const year = startDate.getFullYear();
          const month = startDate.getMonth(); // 0-indexed (0=Jan, 10=Nov, 11=Dec)

          // Find the last valid day of this month
          const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

          // Cap the payment day to what actually exists in this month
          const cappedDay = Math.min(debt.payment_day, lastDayOfMonth);

          // Create the actual payment date for this month
          const paymentDate = new Date(year, month, cappedDay);

          return {
            debt,
            paymentDate,
            cappedDay
          };
        })
        .filter(({ paymentDate }) => {
          // Only include payments that fall in our date range
          return paymentDate >= startDate && paymentDate <= endDate;
        })
        .map(({ debt, paymentDate, cappedDay }) => ({
          id: `scheduled-${debt.id}`,
          date: format(paymentDate, 'yyyy-MM-dd'),
          description: `${debt.name} (Scheduled Payment)`,
          amount: debt.minimum_payment,
          notes: 'Scheduled minimum payment',
          account_name: 'Scheduled',
          plaid_transaction_id: null,
          is_scheduled: true,
          debt_name: debt.name
        }));

      // Combine and sort all items
      const allItems = [...formattedTxns, ...scheduledTxns].sort((a, b) =>
        parseISO(b.date).getTime() - parseISO(a.date).getTime()
      );

      console.log('Final combined items:', allItems.map(i => ({ date: i.date, description: i.description, isScheduled: i.is_scheduled })));

      setCategoryTransactions(allItems);
    } catch (error: any) {
      console.error('Error loading category transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive'
      });
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount.toString(),
      category_id: selectedCategory?.category_id || '',
      notes: transaction.notes || ''
    });
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          date: editForm.date,
          description: editForm.description,
          amount: -Math.abs(parseFloat(editForm.amount)),
          category_id: editForm.category_id || null,
          notes: editForm.notes || null
        })
        .eq('id', editingTransaction.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Transaction updated successfully'
      });

      setEditingTransaction(null);
      if (selectedCategory) {
        loadCategoryTransactions(selectedCategory);
      }
      loadSpendingData();
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to update transaction',
        variant: 'destructive'
      });
    }
  };

  const chartData = categorySpending.map(item => ({
    name: item.icon + ' ' + item.category_name,
    amount: item.total_amount,
    color: item.color,
    icon: item.icon,
    category_name: item.category_name
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-semibold flex items-center gap-2">
            <span>{data.payload.icon}</span>
            <span>{data.payload.category_name}</span>
          </p>
          <p className="text-sm text-primary font-bold">
            ${data.value.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">
            {((data.value / totalSpending) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Breadown</CardTitle>
          <CardDescription>Loading spending data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (categorySpending.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Breakdown</CardTitle>
          <CardDescription>Total Spent across all categories</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground text-center">
            No spending data for this period
          </p>
        </CardContent>
      </Card>
    );
  }

  const getDateRangeLabel = () => {
    const { startDate, endDate } = getDateRange();
    if (dateFilter === 'this_month') return 'This Month';
    if (dateFilter === 'last_month') return 'Last Month';
    if (dateFilter === 'custom') {
      return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    return 'This Month';
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Spending Breakdown
            </CardTitle>
            <CardDescription>
              Total spending across all categories and accounts
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateFilter} onValueChange={(value: DateFilter) => {
              setDateFilter(value);
              if (value === 'custom') {
                setShowCustomDateDialog(true);
              }
            }}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {dateFilter === 'custom' && customStartDate && customEndDate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomDateDialog(true)}
                className="min-w-[200px]"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(customStartDate, 'MMM d, yyyy')} - {format(customEndDate, 'MMM d, yyyy')}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spending</p>
              <p className="text-2xl font-bold text-primary">${totalSpending.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="horizontal"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              onClick={(data) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  const index = data.activeTooltipIndex;
                  if (index !== undefined && categorySpending[index]) {
                    loadCategoryTransactions(categorySpending[index]);
                  }
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis
                type="category"
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={120}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="number"
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]} cursor="pointer">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>

      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{selectedCategory?.icon}</span>
              <span>{selectedCategory?.category_name} Transactions</span>
            </DialogTitle>
            <DialogDescription>
              Total: ${selectedCategory?.total_amount.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          {loadingTransactions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className={transaction.is_scheduled ? 'bg-slate-50' : ''}>
                      <TableCell>{format(parseISO(transaction.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div
                          className={!transaction.plaid_transaction_id && !transaction.is_scheduled ? "cursor-pointer hover:text-primary transition-colors" : ""}
                          onClick={() => !transaction.plaid_transaction_id && !transaction.is_scheduled && handleEditTransaction(transaction)}
                          title={
                            transaction.is_scheduled
                              ? "Scheduled payment (not yet processed)"
                              : transaction.plaid_transaction_id
                                ? "Plaid transactions cannot be edited"
                                : "Click to edit"
                          }
                        >
                          <div className="font-medium">
                            {transaction.description}
                            {transaction.is_scheduled && (
                              <Badge variant="secondary" className="ml-2 text-xs">Scheduled</Badge>
                            )}
                          </div>
                          {transaction.notes && (
                            <div className="text-xs text-muted-foreground">{transaction.notes}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.is_scheduled ? "secondary" : "outline"}>
                          {transaction.account_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${transaction.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update the transaction details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTransaction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={editForm.category_id}
                onValueChange={(value) => setEditForm({ ...editForm, category_id: value })}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon && `${cat.icon} `}{cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTransaction(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>

      <Dialog open={showCustomDateDialog} onOpenChange={(open) => {
        setShowCustomDateDialog(open);
        if (!open) {
          if (!customStartDate || !customEndDate) {
            setCustomStartDate(undefined);
            setCustomEndDate(undefined);
            setDateFilter('this_month');
          }
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {!customStartDate ? 'Select Start Date' : !customEndDate ? 'Select End Date' : 'Date Range Selected'}
            </DialogTitle>
            <DialogDescription>
              {!customStartDate && 'Choose the first day of your date range'}
              {customStartDate && !customEndDate && `Starting from ${format(customStartDate, 'MMM d, yyyy')} - now pick the end date`}
              {customStartDate && customEndDate && `${format(customStartDate, 'MMM d, yyyy')} - ${format(customEndDate, 'MMM d, yyyy')}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {!customStartDate && (
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={(date) => {
                  setCustomStartDate(date);
                }}
                className="rounded-md border"
              />
            )}
            {customStartDate && !customEndDate && (
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={(date) => {
                  setCustomEndDate(date);
                  setTimeout(() => setShowCustomDateDialog(false), 300);
                }}
                disabled={(date) => date < customStartDate}
                defaultMonth={customStartDate}
                className="rounded-md border"
              />
            )}
            {customStartDate && customEndDate && (
              <div className="text-center space-y-4 py-8">
                <div className="text-lg font-semibold text-green-600">
                  Date Range Selected
                </div>
                <Button onClick={() => setShowCustomDateDialog(false)}>
                  Done
                </Button>
              </div>
            )}
          </div>
          {customStartDate && !customEndDate && (
            <div className="flex justify-start pb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCustomStartDate(undefined);
                }}
              >
                Change Start Date
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
