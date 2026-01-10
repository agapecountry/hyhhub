'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar, DollarSign, Edit2, TrendingUp, AlertCircle, Plus, Trash2, CheckCircle, History, X, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHousehold } from '@/lib/household-context';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { format, addDays, addWeeks, addMonths, parseISO, isBefore, isAfter, differenceInDays, startOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generatePaycheckSchedule, type PaycheckPeriod as SchedulePaycheckPeriod, type UnassignedPayment as ScheduleUnassignedPayment } from '@/lib/paycheck-scheduler';
import { formatCurrency } from '@/lib/format';

interface PaycheckSettings {
  id: string;
  household_id: string;
  paycheck_name: string;
  net_pay_amount: number;
  payment_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
  next_paycheck_date: string;
  is_active: boolean;
}

interface Bill {
  id: string;
  company: string;
  amount: number;
  due_date: number;
  category_id: string;
  is_active: boolean;
}

interface Debt {
  id: string;
  name: string;
  minimum_payment: number;
  payment_day: number;
  current_balance: number;
  interest_rate: number;
  extra_payment: number;
}

interface PaymentScheduleItem {
  id: string;
  name: string;
  amount: number;
  due_date: Date;
  type: 'bill' | 'debt' | 'extra-debt' | 'budget';
  status: 'on-time' | 'late' | 'early';
  isSplit?: boolean;
  splitPart?: string;
  isFocusDebt?: boolean;
  isPaid?: boolean;
}

interface PaycheckPeriod {
  paycheckDate: Date;
  paycheckName: string;
  paycheckId: string;
  totalIncome: number;
  totalPayments: number;
  remaining: number;
  payments: PaymentScheduleItem[];
}

interface StoredScheduledPayment {
  id: string;
  paycheck_id: string;
  paycheck_date: string;
  payment_type: 'bill' | 'debt' | 'extra-debt' | 'budget';
  payment_id: string;
  payment_name: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  is_split: boolean;
  split_part: string | null;
}

export function PaycheckPlanner() {
  const { currentHousehold } = useHousehold();
  const [paychecks, setPaychecks] = useState<PaycheckSettings[]>([]);
  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<PaycheckPeriod[]>([]);
  const [historySchedule, setHistorySchedule] = useState<PaycheckPeriod[]>([]);
  const [unassignedPayments, setUnassignedPayments] = useState<ScheduleUnassignedPayment[]>([]);
  const [dismissedPayments, setDismissedPayments] = useState<ScheduleUnassignedPayment[]>([]);
  const [debtStrategy, setDebtStrategy] = useState<string>('');
  const [extraPayment, setExtraPayment] = useState<number>(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPaycheck, setEditingPaycheck] = useState<PaycheckSettings | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paycheckToDelete, setPaycheckToDelete] = useState<PaycheckSettings | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [storedScheduledPayments, setStoredScheduledPayments] = useState<StoredScheduledPayment[]>([]);

  const [formData, setFormData] = useState({
    paycheck_name: '',
    net_pay_amount: '',
    payment_frequency: 'biweekly' as 'weekly' | 'biweekly' | 'semimonthly' | 'monthly',
    next_paycheck_date: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    if (currentHousehold) {
      loadPaychecks();
      loadBillsAndDebts();
      loadStoredScheduledPayments();
    }
  }, [currentHousehold]);

  useEffect(() => {
    if (paychecks.length > 0 && (bills.length > 0 || debts.length > 0 || budgetCategories.length > 0)) {
      generateSchedule();
    } else {
      setSchedule([]);
      setUnassignedPayments([]);
    }
  }, [paychecks, bills, debts, budgetCategories, debtStrategy, extraPayment, storedScheduledPayments]);

  const loadPaychecks = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('paycheck_settings')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .eq('is_active', true)
        .order('paycheck_name');

      if (error) throw error;

      // Don't auto-advance paycheck dates here - let the schedule generation
      // handle past paychecks so they can appear in history with unpaid items
      setPaychecks(data || []);
    } catch (error: any) {
      console.error('Error loading paychecks:', error);
    }
  };


  const loadStoredScheduledPayments = async () => {
    if (!currentHousehold) return;

    try {
      // Load scheduled payments from the last 6 months (matches retention policy)
      const startDate = addMonths(new Date(), -6);
      const { data, error } = await supabase
        .from('paycheck_scheduled_payments')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .gte('paycheck_date', format(startDate, 'yyyy-MM-dd'))
        .order('paycheck_date', { ascending: false });

      if (error) throw error;
      setStoredScheduledPayments(data || []);
    } catch (error: any) {
      console.error('Error loading stored scheduled payments:', error);
    }
  };

  const loadBillsAndDebts = async () => {
    if (!currentHousehold) return;

    try {
      const [billsResult, debtsResult, budgetResult, householdResult, paymentsResult] = await Promise.all([
        supabase
          .from('bills')
          .select('*')
          .eq('household_id', currentHousehold.id)
          .eq('is_active', true)
          .order('due_date'),
        supabase
          .from('debts')
          .select('*')
          .eq('household_id', currentHousehold.id)
          .eq('is_active', true)
          .order('payment_day'),
        supabase
          .from('budget_categories')
          .select(`
            *,
            transaction_categories (
              name,
              icon,
              color
            )
          `)
          .eq('household_id', currentHousehold.id)
          .eq('is_active', true)
          .order('due_date'),
        supabase
          .from('households')
          .select('debt_payoff_strategy, debt_extra_payment')
          .eq('id', currentHousehold.id)
          .maybeSingle(),
        supabase
          .from('debt_payments')
          .select('debt_id, principal_paid')
          .eq('household_id', currentHousehold.id),
      ]);

      if (billsResult.error) throw billsResult.error;
      if (debtsResult.error) throw debtsResult.error;
      if (budgetResult.error) throw budgetResult.error;
      if (householdResult.error) throw householdResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      // Calculate principal paid per debt
      const principalPaidMap = new Map<string, number>();
      (paymentsResult.data || []).forEach(payment => {
        const current = principalPaidMap.get(payment.debt_id) || 0;
        principalPaidMap.set(payment.debt_id, current + payment.principal_paid);
      });

      // Adjust debt current_balance to reflect remaining balance
      const adjustedDebts = (debtsResult.data || []).map(debt => ({
        ...debt,
        current_balance: Math.max(0, debt.current_balance - (principalPaidMap.get(debt.id) || 0)),
      }));

      setBills(billsResult.data || []);
      setDebts(adjustedDebts);

      // Transform budget categories to include name from transaction_categories
      const transformedBudgetCategories = (budgetResult.data || []).map(cat => ({
        ...cat,
        name: cat.transaction_categories?.name || cat.name || 'Unnamed Category',
      }));
      setBudgetCategories(transformedBudgetCategories);

      setDebtStrategy(householdResult.data?.debt_payoff_strategy || '');
      setExtraPayment(householdResult.data?.debt_extra_payment || 0);
    } catch (error: any) {
      console.error('Error loading bills and debts:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      paycheck_name: '',
      net_pay_amount: '',
      payment_frequency: 'biweekly',
      next_paycheck_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setEditingPaycheck(null);
  };

  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (paycheck: PaycheckSettings) => {
    setFormData({
      paycheck_name: paycheck.paycheck_name,
      net_pay_amount: paycheck.net_pay_amount.toString(),
      payment_frequency: paycheck.payment_frequency,
      next_paycheck_date: paycheck.next_paycheck_date,
    });
    setEditingPaycheck(paycheck);
    setDialogOpen(true);
  };

  const handleDelete = (paycheck: PaycheckSettings) => {
    setPaycheckToDelete(paycheck);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!paycheckToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('paycheck_settings')
        .delete()
        .eq('id', paycheckToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Paycheck deleted successfully',
      });

      setDeleteDialogOpen(false);
      setPaycheckToDelete(null);
      await loadPaychecks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete paycheck',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentHousehold) return;

    if (!formData.paycheck_name.trim()) {
      toast({
        title: 'Invalid Name',
        description: 'Please enter a name for this paycheck',
        variant: 'destructive',
      });
      return;
    }

    const netPay = parseFloat(formData.net_pay_amount);
    if (isNaN(netPay) || netPay <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid net pay amount',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (editingPaycheck) {
        const { error } = await supabase
          .from('paycheck_settings')
          .update({
            paycheck_name: formData.paycheck_name,
            net_pay_amount: netPay,
            payment_frequency: formData.payment_frequency,
            next_paycheck_date: formData.next_paycheck_date,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPaycheck.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('paycheck_settings')
          .insert({
            household_id: currentHousehold.id,
            paycheck_name: formData.paycheck_name,
            net_pay_amount: netPay,
            payment_frequency: formData.payment_frequency,
            next_paycheck_date: formData.next_paycheck_date,
            is_active: true,
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: editingPaycheck ? 'Paycheck updated successfully' : 'Paycheck added successfully',
      });

      setDialogOpen(false);
      resetForm();
      await loadPaychecks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save paycheck',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleManualPaid = async (paymentType: string, paymentId: string, dueDate: Date, currentPaidStatus: boolean) => {
    if (!currentHousehold) return;

    try {
      const dueDateStr = format(dueDate, 'yyyy-MM-dd');
      const newPaidStatus = !currentPaidStatus;

      // Update the payment in the scheduled_payments table
      // Update all matching records (in case of duplicates) to ensure consistency
      const { error: updateError } = await supabase
        .from('paycheck_scheduled_payments')
        .update({ is_paid: newPaidStatus })
        .eq('household_id', currentHousehold.id)
        .eq('payment_type', paymentType)
        .eq('payment_id', paymentId)
        .eq('due_date', dueDateStr);

      if (updateError) throw updateError;

      // Update local state for all matching records
      setStoredScheduledPayments(prev => 
        prev.map(sp => 
          sp.payment_type === paymentType &&
          sp.payment_id === paymentId &&
          sp.due_date === dueDateStr
            ? { ...sp, is_paid: newPaidStatus }
            : sp
        )
      );

      toast({
        title: newPaidStatus ? 'Marked as Paid' : 'Unmarked as Paid',
        description: `Payment has been ${newPaidStatus ? 'marked as paid' : 'unmarked'}`,
      });

      // Reload data to refresh UI
      await loadStoredScheduledPayments();
      await generateSchedule();
    } catch (error: any) {
      console.error('Error toggling paid status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment status',
        variant: 'destructive',
      });
    }
  };

  const dismissUnassignedPayment = async (paymentType: string, paymentId: string, dueDate: Date) => {
    if (!currentHousehold) return;

    try {
      const dueDateStr = format(dueDate, 'yyyy-MM-dd');

      // Store dismissed status in paycheck_planner_payments (kept for dismissed tracking only)
      const { data: existing } = await supabase
        .from('paycheck_planner_payments')
        .select('id')
        .eq('household_id', currentHousehold.id)
        .eq('payment_type', paymentType)
        .eq('payment_id', paymentId)
        .eq('paycheck_date', dueDateStr)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('paycheck_planner_payments')
          .update({
            is_dismissed: true,
            marked_by: (await supabase.auth.getUser()).data.user?.id,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('paycheck_planner_payments')
          .insert({
            household_id: currentHousehold.id,
            payment_type: paymentType,
            payment_id: paymentId,
            paycheck_date: dueDateStr,
            is_dismissed: true,
            marked_by: (await supabase.auth.getUser()).data.user?.id,
          });

        if (error) throw error;
      }

      toast({
        title: 'Payment Dismissed',
        description: 'This payment instance has been removed from unassigned list',
      });

      await generateSchedule();
    } catch (error: any) {
      console.error('Error dismissing payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to dismiss payment',
        variant: 'destructive',
      });
    }
  };

  const calculateNextPaycheckDate = (currentDate: Date, frequency: string): Date => {
    switch (frequency) {
      case 'weekly':
        return addWeeks(currentDate, 1);
      case 'biweekly':
        return addWeeks(currentDate, 2);
      case 'semimonthly':
        return addDays(currentDate, 15);
      case 'monthly':
        return addMonths(currentDate, 1);
      default:
        return addWeeks(currentDate, 2);
    }
  };

  const calculatePreviousPaycheckDate = (currentDate: Date, frequency: string): Date => {
    switch (frequency) {
      case 'weekly':
        return addWeeks(currentDate, -1);
      case 'biweekly':
        return addWeeks(currentDate, -2);
      case 'semimonthly':
        return addDays(currentDate, -15);
      case 'monthly':
        return addMonths(currentDate, -1);
      default:
        return addWeeks(currentDate, -2);
    }
  };

  const getNextDueDate = (dayOfMonth: number, fromDate: Date): Date => {
    const result = new Date(fromDate);
    result.setDate(dayOfMonth);

    if (result < fromDate) {
      result.setMonth(result.getMonth() + 1);
    }

    return result;
  };

  const saveNewScheduledPayments = async (scheduledPeriods: PaycheckPeriod[]) => {
    if (!currentHousehold) return;

    try {
      const newPaymentsToAdd: StoredScheduledPayment[] = [];
      
      for (const period of scheduledPeriods) {
        const paycheckDateStr = format(period.paycheckDate, 'yyyy-MM-dd');
        
        // Check if this paycheck already has stored payments
        const existingPayments = storedScheduledPayments.filter(
          sp => sp.paycheck_date === paycheckDateStr && sp.paycheck_id === period.paycheckId
        );
        
        // Only save if no existing payments for this paycheck date
        if (existingPayments.length === 0 && period.payments.length > 0) {
          const paymentsToInsert = period.payments.map(payment => ({
            household_id: currentHousehold.id,
            paycheck_id: period.paycheckId,
            paycheck_date: paycheckDateStr,
            payment_type: payment.type,
            payment_id: payment.id,
            payment_name: payment.name,
            amount: payment.amount,
            due_date: format(payment.due_date, 'yyyy-MM-dd'),
            is_paid: payment.isPaid || false,
            is_split: payment.isSplit || false,
            split_part: payment.splitPart || null,
          }));

          const { data, error } = await supabase
            .from('paycheck_scheduled_payments')
            .insert(paymentsToInsert)
            .select();

          if (error) {
            console.error('Error saving scheduled payments:', error);
          } else if (data) {
            // Add to local tracking for this run
            data.forEach((sp: any) => {
              newPaymentsToAdd.push({
                id: sp.id,
                paycheck_id: sp.paycheck_id,
                paycheck_date: sp.paycheck_date,
                payment_type: sp.payment_type,
                payment_id: sp.payment_id,
                payment_name: sp.payment_name,
                amount: sp.amount,
                due_date: sp.due_date,
                is_paid: sp.is_paid,
                is_split: sp.is_split,
                split_part: sp.split_part,
              });
            });
          }
        }
      }
      
      // Update local state with newly saved payments (without triggering re-render loop)
      if (newPaymentsToAdd.length > 0) {
        setStoredScheduledPayments(prev => [...prev, ...newPaymentsToAdd]);
      }
    } catch (error) {
      console.error('Error in saveNewScheduledPayments:', error);
    }
  };

  const generateSchedule = async () => {
    if (paychecks.length === 0 || !currentHousehold) return;

    const endDate = addMonths(new Date(), 3);
    const today = startOfDay(new Date());
    // Look back 6 months to match retention policy and include past paychecks
    const startDate = addMonths(today, -6);
    // Define the lock threshold - paychecks within 7 days should be locked
    const lockThreshold = addDays(today, 7);
    const allPaycheckDates: Array<{ date: Date; name: string; id: string; amount: number }> = [];

    paychecks.forEach(paycheck => {
      // Use next_paycheck_date as an anchor point to calculate all paycheck dates
      // (both past and future) based on frequency
      const anchorDate = parseISO(paycheck.next_paycheck_date);
      
      // First, calculate backwards from anchor to find past paycheck dates
      let pastDate = anchorDate;
      const pastDates: Date[] = [];
      
      // Go backwards until we're before the start date (2 months ago)
      while (true) {
        const prevDate = calculatePreviousPaycheckDate(pastDate, paycheck.payment_frequency);
        if (isBefore(prevDate, startDate)) break;
        pastDates.unshift(prevDate);
        pastDate = prevDate;
      }
      
      // Add past dates
      pastDates.forEach(date => {
        allPaycheckDates.push({
          date: date,
          name: paycheck.paycheck_name,
          id: paycheck.id,
          amount: paycheck.net_pay_amount,
        });
      });

      // Now add from the anchor date forward
      let currentPaycheckDate = anchorDate;
      while (isBefore(currentPaycheckDate, endDate)) {
        allPaycheckDates.push({
          date: currentPaycheckDate,
          name: paycheck.paycheck_name,
          id: paycheck.id,
          amount: paycheck.net_pay_amount,
        });
        currentPaycheckDate = calculateNextPaycheckDate(currentPaycheckDate, paycheck.payment_frequency);
      }
    });

    allPaycheckDates.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Separate locked and unlocked paycheck periods
    // Locked periods (past OR within 7 days) use STORED scheduled payments (unchangeable)
    // Unlocked periods (more than 7 days away) get freshly scheduled
    const lockedPaycheckPeriods: PaycheckPeriod[] = [];
    const unlockedPaycheckPeriods: PaycheckPeriod[] = [];

    allPaycheckDates.forEach(paycheck => {
      const paycheckDateStr = format(paycheck.date, 'yyyy-MM-dd');
      
      // Lock paychecks that are in the past OR within the next 7 days
      if (isBefore(paycheck.date, lockThreshold)) {
        // For locked paychecks, load from stored scheduled payments
        const storedPayments = storedScheduledPayments.filter(
          sp => sp.paycheck_date === paycheckDateStr && sp.paycheck_id === paycheck.id
        );
        
        const payments: PaymentScheduleItem[] = storedPayments.map(sp => ({
          id: sp.payment_id,
          name: sp.payment_name,
          amount: sp.amount,
          due_date: parseISO(sp.due_date),
          type: sp.payment_type,
          status: 'on-time' as const,
          isSplit: sp.is_split,
          splitPart: sp.split_part || undefined,
          isPaid: sp.is_paid,
        }));
        
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
        
        lockedPaycheckPeriods.push({
          paycheckDate: paycheck.date,
          paycheckName: paycheck.name,
          paycheckId: paycheck.id,
          totalIncome: paycheck.amount,
          totalPayments,
          remaining: paycheck.amount - totalPayments,
          payments,
        });
      } else {
        // Unlocked paychecks (more than 7 days away) can be rescheduled
        unlockedPaycheckPeriods.push({
          paycheckDate: paycheck.date,
          paycheckName: paycheck.name,
          paycheckId: paycheck.id,
          totalIncome: paycheck.amount,
          totalPayments: 0,
          remaining: paycheck.amount,
          payments: [],
        });
      }
    });

    // Filter out bills/debts that are already assigned to locked paychecks
    // This prevents them from appearing in the unassigned list
    const lockedPaymentKeys = new Set<string>();
    lockedPaycheckPeriods.forEach(period => {
      period.payments.forEach(payment => {
        const dueDateStr = format(payment.due_date, 'yyyy-MM-dd');
        const key = `${payment.type}-${payment.id}-${dueDateStr}`;
        lockedPaymentKeys.add(key);
      });
    });

    // Filter bills to exclude those already in locked paychecks
    const availableBills = bills.filter(bill => {
      // Check if this bill's next due date is already locked
      const nextDueDate = new Date();
      nextDueDate.setDate(bill.due_date);
      if (nextDueDate < new Date()) {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }
      const dueDateStr = format(nextDueDate, 'yyyy-MM-dd');
      const key = `bill-${bill.id}-${dueDateStr}`;
      return !lockedPaymentKeys.has(key);
    });

    // Filter debts to exclude those already in locked paychecks
    const availableDebts = debts.filter(debt => {
      const nextDueDate = new Date();
      nextDueDate.setDate(debt.payment_day);
      if (nextDueDate < new Date()) {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }
      const dueDateStr = format(nextDueDate, 'yyyy-MM-dd');
      const key = `debt-${debt.id}-${dueDateStr}`;
      return !lockedPaymentKeys.has(key);
    });

    // Filter budget categories to exclude those already in locked paychecks
    const availableBudgetCategories = budgetCategories.filter(category => {
      const nextDueDate = new Date();
      nextDueDate.setDate(category.due_date);
      if (nextDueDate < new Date()) {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }
      const dueDateStr = format(nextDueDate, 'yyyy-MM-dd');
      const key = `budget-${category.id}-${dueDateStr}`;
      return !lockedPaymentKeys.has(key);
    });

    // Only run the scheduler on UNLOCKED paycheck periods with available (non-locked) payments
    const { schedule: unlockedSchedule, unassigned } = generatePaycheckSchedule(
      unlockedPaycheckPeriods,
      availableBills,
      availableDebts,
      availableBudgetCategories,
      debtStrategy,
      extraPayment
    );

    // Save newly scheduled payments for paychecks that don't have stored data yet
    // This locks them in the database
    await saveNewScheduledPayments(unlockedSchedule);

    // Combine locked periods (with stored payments) with unlocked scheduled periods
    const generatedSchedule = [...lockedPaycheckPeriods, ...unlockedSchedule];

    // Load transactions to mark paid status (look back 6 months to match schedule lookback)
    try {
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('id, date, amount, debt_id, payee_id, payees(bill_id)')
        .eq('household_id', currentHousehold.id)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      if (transError) {
        console.error('Error fetching transactions:', transError);
      }

      // Mark payments as paid based on transactions
      // Only check transaction matching for payments due within the next 60 days (optimization)
      const sixtyDaysFromNow = addDays(today, 60);
      
      generatedSchedule.forEach(period => {
        period.payments.forEach(payment => {
          // Payment.isPaid is already set from stored scheduled payments if it exists
          // Only do transaction matching if not already marked paid
          if (payment.isPaid) {
            return;
          }

          // Skip transaction matching for payments more than 60 days out
          if (isAfter(payment.due_date, sixtyDaysFromNow)) {
            return;
          }

          // Check transaction history - find closest transaction to due date
          const relevantTransactions = (transactions || []).filter(t => {
            // Match by debt_id for debts
            if (payment.type === 'debt' || payment.type === 'extra-debt') {
              return t.debt_id === payment.id;
            }

            // Match by bill_id for bills (through payee)
            if (payment.type === 'bill') {
              if (t.payees) {
                const payeeData = Array.isArray(t.payees) ? t.payees[0] : t.payees;
                if (payeeData?.bill_id === payment.id) {
                  return true;
                }
              }
            }

            return false;
          });

          if (relevantTransactions.length > 0) {
            // Find the transaction closest to this payment's due date
            const closestTransaction = relevantTransactions.reduce((closest, t) => {
              const tDate = parseISO(t.date);
              const closestDate = parseISO(closest.date);
              const tDiff = Math.abs(differenceInDays(tDate, payment.due_date));
              const closestDiff = Math.abs(differenceInDays(closestDate, payment.due_date));
              return tDiff < closestDiff ? t : closest;
            });

            const closestDate = parseISO(closestTransaction.date);
            const daysDiff = Math.abs(differenceInDays(closestDate, payment.due_date));

            // Only mark as paid if transaction is within 7 days of due date
            if (daysDiff <= 7) {
              payment.isPaid = true;
            }
          }
        });
      });
    } catch (error) {
      console.error('Error loading transaction data:', error);
    }

    // Separate into active and history
    const activeSchedule: PaycheckPeriod[] = [];
    const completedSchedule: PaycheckPeriod[] = [];

    generatedSchedule.forEach(period => {
      // If paycheck date is in the past
      if (isBefore(period.paycheckDate, today)) {
        // Paychecks with no payments go to history automatically once date passes
        // Paychecks with payments go to history only when ALL payments are marked paid
        const hasNoPayments = period.payments.length === 0;
        const allPaymentsPaid = period.payments.length > 0 && period.payments.every(p => p.isPaid);
        
        if (hasNoPayments || allPaymentsPaid) {
          completedSchedule.push(period);
        } else {
          activeSchedule.push(period);
        }
      } else {
        activeSchedule.push(period);
      }
    });

    // Separate dismissed payments from unassigned
    // Load dismissed payments from paycheck_planner_payments table
    let dismissedPaymentKeys = new Set<string>();
    try {
      const { data: dismissedData } = await supabase
        .from('paycheck_planner_payments')
        .select('payment_type, payment_id, paycheck_date')
        .eq('household_id', currentHousehold.id)
        .eq('is_dismissed', true);
      
      (dismissedData || []).forEach(d => {
        const key = `${d.payment_type}-${d.payment_id}-${d.paycheck_date}`;
        dismissedPaymentKeys.add(key);
      });
    } catch (error) {
      console.error('Error loading dismissed payments:', error);
    }

    const filteredUnassigned: ScheduleUnassignedPayment[] = [];
    const dismissedList: ScheduleUnassignedPayment[] = [];

    unassigned.forEach(payment => {
      const dueDateStr = format(payment.dueDate, 'yyyy-MM-dd');
      const key = `${payment.type}-${payment.id}-${dueDateStr}`;
      const isDismissed = dismissedPaymentKeys.has(key);

      if (isDismissed) {
        dismissedList.push(payment);
      } else {
        filteredUnassigned.push(payment);
      }
    });

    setSchedule(activeSchedule);
    // Sort history with most recent paycheck first
    completedSchedule.sort((a, b) => b.paycheckDate.getTime() - a.paycheckDate.getTime());
    setHistorySchedule(completedSchedule);
    setUnassignedPayments(filteredUnassigned);
    setDismissedPayments(dismissedList);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Paycheck Planner</CardTitle>
              <CardDescription>
                Manage multiple paychecks and create an optimized payment schedule
              </CardDescription>
            </div>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Paycheck
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paychecks.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No paychecks configured. Add a paycheck to get started with your payment schedule.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {paychecks.map(paycheck => (
                <div key={paycheck.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold">{paycheck.paycheck_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(paycheck.net_pay_amount)}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground capitalize">
                          {paycheck.payment_frequency.replace('biweekly', 'Bi-weekly')}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          Next: {format(parseISO(paycheck.next_paycheck_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(paycheck)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(paycheck)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {schedule.length > 0 && (() => {
        // Filter schedule to only include paychecks in "this month"
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const thisMonthSchedule = schedule.filter(p => {
          const paycheckDate = p.paycheckDate;
          return (paycheckDate >= monthStart && paycheckDate <= monthEnd);
        });

        const thisMonthTotalIncome = thisMonthSchedule.reduce((sum, p) => sum + p.totalIncome, 0);
        const thisMonthTotalPayments = thisMonthSchedule.reduce((sum, p) => sum + p.totalPayments, 0);
        const thisMonthRemaining = thisMonthSchedule.reduce((sum, p) => sum + p.remaining, 0);
        const thisMonthPaymentCount = thisMonthSchedule.reduce((sum, p) => sum + p.payments.length, 0);

        return (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Income (This Month)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(thisMonthTotalIncome)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {thisMonthSchedule.length} paycheck{thisMonthSchedule.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Assigned (This Month)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">
                  {formatCurrency(thisMonthTotalPayments)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {thisMonthPaymentCount} payment{thisMonthPaymentCount !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Remaining (This Month)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${thisMonthRemaining >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {formatCurrency(thisMonthRemaining)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  After all payments
                </p>
              </CardContent>
            </Card>
            <Card className={unassignedPayments.length > 0 ? 'border-destructive' : ''}>
              <CardHeader className="pb-2">
                <CardDescription>Unassigned</CardDescription>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${unassignedPayments.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {unassignedPayments.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {unassignedPayments.length > 0 ? (
                    <span className="text-destructive font-medium">Needs attention</span>
                  ) : (
                    'All payments covered'
                  )}
                </p>
            </CardContent>
          </Card>
        </div>
        );
      })()}

      {schedule.length === 0 && paychecks.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No bills or debts found. Add bills and debts to generate your payment schedule.
          </AlertDescription>
        </Alert>
      )}

      {unassignedPayments.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-1" />
              <div className="flex-1">
                <CardTitle className="text-destructive">Unassigned Payments</CardTitle>
                <CardDescription className="mt-1">
                  The following payments could not be assigned to any paycheck. This may be due to insufficient income or no paychecks available during the billing cycle.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unassignedPayments.map((payment, idx) => (
                <div
                  key={`unassigned-${payment.type}-${payment.id}-${payment.dueDate.getTime()}-${idx}`}
                  className="flex items-center justify-between p-4 bg-background border border-destructive/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold">{payment.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
                            {payment.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Due {format(payment.dueDate, 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-destructive">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-muted-foreground">Cannot be assigned</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissUnassignedPayment(payment.type, payment.id, payment.dueDate)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Action Required:</strong> To assign these payments, you can:
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Increase your paycheck amount(s)</li>
                  <li>Add more paychecks to cover these dates</li>
                  <li>Reduce or remove other bills/debts to free up funds</li>
                  <li>Adjust the due dates of these payments</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">
            Active Schedule
            {schedule.length > 0 && (
              <Badge variant="secondary" className="ml-2">{schedule.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
            {historySchedule.length > 0 && (
              <Badge variant="secondary" className="ml-2">{historySchedule.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6 mt-6">
          {schedule.map((period, index) => (
            <Card key={`${period.paycheckId}-${index}`} className={period.remaining < 0 ? 'border-destructive' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {period.paycheckName} - {format(period.paycheckDate, 'MMMM d, yyyy')}
                </CardTitle>
                <CardDescription>
                  {period.payments.length} payment{period.payments.length !== 1 ? 's' : ''} due
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  {period.remaining < 0 ? 'Over Budget' : 'Remaining'}
                </p>
                <p className={`text-xl font-bold ${period.remaining < 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {period.remaining < 0 ? '-' : ''}{formatCurrency(Math.abs(period.remaining))}
                </p>
              </div>
            </div>
            {period.remaining < 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This paycheck is over budget by {formatCurrency(Math.abs(period.remaining))}. Consider adjusting payment assignments or increasing income.
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm font-medium">Income</span>
                <span className="text-sm font-semibold text-green-600">
                  +{formatCurrency(period.totalIncome)}
                </span>
              </div>

              {period.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No payments due this period
                </p>
              ) : (
                <div className="space-y-2">
                  {period.payments.map((payment, paymentIdx) => (
                    <div
                      key={`${payment.type}-${payment.id}-${payment.due_date.getTime()}-${paymentIdx}`}
                      className={`flex justify-between items-center p-3 rounded-lg ${
                        payment.isFocusDebt
                          ? 'bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700'
                          : 'bg-secondary/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">
                            {payment.name}
                            {payment.isSplit && payment.splitPart && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({payment.splitPart})
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {payment.isPaid && (
                              <Badge className="text-xs bg-green-600 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Paid
                              </Badge>
                            )}
                            <Badge
                              variant={payment.type === 'extra-debt' ? 'default' : 'outline'}
                              className={`text-xs ${payment.isFocusDebt ? 'bg-amber-700 text-white' : ''} ${payment.type === 'budget' ? 'bg-blue-100 text-blue-700 border-blue-300' : ''}`}
                            >
                              {payment.type === 'extra-debt' ? 'EXTRA PAYMENT' : payment.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Due {format(payment.due_date, 'MMM d')}
                            </span>
                            {!payment.isPaid && payment.status === 'late' && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                            {payment.status === 'early' && (
                              <Badge variant="secondary" className="text-xs">
                                Early
                              </Badge>
                            )}
                            {payment.isSplit && (
                              <Badge variant="secondary" className="text-xs">
                                Split Payment
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${payment.isFocusDebt ? 'text-amber-700' : 'text-destructive'}`}>
                          -{formatCurrency(payment.amount)}
                        </span>
                        <Button
                          variant={payment.isPaid ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            toggleManualPaid(payment.type, payment.id, payment.due_date, payment.isPaid || false);
                          }}
                          className={payment.isPaid ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {payment.isPaid ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Paid
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Mark Paid
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-medium">Total Payments</span>
                <span className="font-bold text-destructive">
                  -{formatCurrency(period.totalPayments)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-6">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>History Retention Policy:</strong> Completed paychecks are kept for 6 months, then automatically deleted.
              Dismissed payments are kept for 30 days after their due date, then automatically deleted.
                        </AlertDescription>
          </Alert>

          {dismissedPayments.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <X className="h-5 w-5 text-orange-600 mt-1" />
                  <div className="flex-1">
                    <CardTitle className="text-orange-600">Dismissed Payments</CardTitle>
                    <CardDescription className="mt-1">
                      Payments you've dismissed. These will be automatically deleted 30 days after their due date.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dismissedPayments.map((payment, idx) => (
                    <div
                      key={`dismissed-${payment.type}-${payment.id}-${payment.dueDate.getTime()}-${idx}`}
                      className="flex items-center justify-between p-4 bg-background border border-orange-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <X className="h-4 w-4 text-orange-600" />
                          <div>
                            <p className="font-semibold">{payment.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                                {payment.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Due {format(payment.dueDate, 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">Dismissed</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {historySchedule.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Completed Paychecks</h3>
                  <p className="text-muted-foreground">
                    Paychecks will appear here once all their payments are marked as paid
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            historySchedule.map((period, index) => (
              <Card key={`history-${period.paycheckId}-${index}`} className="border-green-200 bg-green-50/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        {period.paycheckName} - {format(period.paycheckDate, 'MMMM d, yyyy')}
                      </CardTitle>
                      <CardDescription>
                        All {period.payments.length} payment{period.payments.length !== 1 ? 's' : ''} completed
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Saved</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(period.remaining)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-sm font-medium">Income</span>
                      <span className="text-sm font-semibold text-green-600">
                        +{formatCurrency(period.totalIncome)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {period.payments.map((payment, paymentIdx) => (
                        <div
                          key={`history-${payment.type}-${payment.id}-${payment.due_date.getTime()}-${paymentIdx}`}
                          className="flex justify-between items-center p-3 rounded-lg bg-background border border-green-200"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="font-medium text-sm">
                                {payment.name}
                                {payment.isSplit && payment.splitPart && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({payment.splitPart})
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {payment.type === 'extra-debt' ? 'EXTRA PAYMENT' : payment.type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Paid {format(payment.due_date, 'MMM d')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="font-semibold text-sm text-muted-foreground">
                            -{formatCurrency(payment.amount)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="font-medium">Total Paid</span>
                      <span className="font-bold text-muted-foreground">
                        -{formatCurrency(period.totalPayments)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPaycheck ? 'Edit Paycheck' : 'Add Paycheck'}</DialogTitle>
            <DialogDescription>
              {editingPaycheck ? 'Update paycheck information' : 'Add a new paycheck to your household'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="paycheck_name">Paycheck Name</Label>
              <Input
                id="paycheck_name"
                placeholder="e.g., John's Salary, Side Hustle"
                value={formData.paycheck_name}
                onChange={(e) => setFormData({ ...formData, paycheck_name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="net_pay_amount">Net Pay Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="net_pay_amount"
                  type="number"
                  step="0.01"
                  className="pl-9"
                  placeholder="0.00"
                  value={formData.net_pay_amount}
                  onChange={(e) => setFormData({ ...formData, net_pay_amount: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="payment_frequency">Payment Frequency</Label>
              <Select
                value={formData.payment_frequency}
                onValueChange={(value: any) => setFormData({ ...formData, payment_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly (Every 2 weeks)</SelectItem>
                  <SelectItem value="semimonthly">Semi-monthly (Twice a month)</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="next_paycheck_date">Next Paycheck Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="next_paycheck_date"
                  type="date"
                  className="pl-9"
                  value={formData.next_paycheck_date}
                  onChange={(e) => setFormData({ ...formData, next_paycheck_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : editingPaycheck ? 'Update' : 'Add Paycheck'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Paycheck</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {paycheckToDelete?.paycheck_name}? This will remove it from your payment schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
