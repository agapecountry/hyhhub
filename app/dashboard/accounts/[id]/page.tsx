'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Download, Trash2, CreditCard as Edit2, Link2, RefreshCw, Users, Check, X, Filter } from 'lucide-react';
import { ManagePayeesDialog } from '@/components/manage-payees-dialog';
import { PlaidSyncButton } from '@/components/plaid-sync-button';
import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/lib/household-context';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import type { TransactionCategory as ImportedTransactionCategory } from '@/lib/types';
import { SearchableCategorySelect } from '@/components/searchable-category-select';
import { IconPicker } from '@/components/icon-picker';
import { SearchablePayeeSelect } from '@/components/searchable-payee-select';

interface Account {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  account_number_last4: string | null;
  balance: number;
  color: string;
  plaid_item_id?: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category_id: string | null;
  notes: string | null;
  is_pending: boolean;
  is_cleared: boolean;
  plaid_transaction_id: string | null;
  debt_id: string | null;
  bill_id?: string | null;
  payee_id: string | null;
  recurring_transaction_id: string | null;
  created_at: string;
  auto_matched?: boolean;
  match_confidence?: 'high' | 'medium' | 'low' | null;
}


interface Debt {
  id: string;
  name: string;
  current_balance: number;
  interest_rate: number;
}

interface Payee {
  id: string;
  name: string;
  default_category_id: string | null;
  default_transaction_type: 'deposit' | 'withdraw' | null;
  debt_id: string | null;
  bill_id: string | null;
  debt_name?: string;
  account_id?: string | null;
  is_transfer_account?: boolean;
}

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentHousehold } = useHousehold();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<ImportedTransactionCategory[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [managePayeesOpen, setManagePayeesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#64748b');
  const [transactionForm, setTransactionForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    payee_id: '',
    transaction_type: 'withdraw' as 'deposit' | 'withdraw',
    amount: '',
    category: '',
    notes: '',
    is_pending: false,
    is_cleared: false,
    debt_id: '',
    is_recurring: false,
    recurring_frequency: 'monthly' as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly',
    recurring_end_date: '',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [filterUncleared, setFilterUncleared] = useState(false);
  const [newPayeeName, setNewPayeeName] = useState('');
  const [transferCategoryId, setTransferCategoryId] = useState<string>('');

  const accountId = params.id as string;
  const isPlaidAccount = account?.plaid_item_id != null;

  const resetTransactionForm = () => {
    setTransactionForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      payee_id: '',
      transaction_type: 'withdraw' as 'deposit' | 'withdraw',
      amount: '',
      category: '',
      notes: '',
      is_pending: false,
      is_cleared: false,
      debt_id: '',
      is_recurring: false,
      recurring_frequency: 'monthly' as 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly',
      recurring_end_date: '',
    });
  };

  useEffect(() => {
    if (currentHousehold && accountId) {
      loadAccountData();
      loadCategories();
      loadDebts();
      loadPayees();
    }
  }, [currentHousehold, accountId]);

  const loadDebts = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('debts')
        .select('id, name, current_balance, interest_rate')
        .eq('household_id', currentHousehold.id)
        .order('name');

      if (error) throw error;
      setDebts(data || []);
    } catch (error: any) {
      console.error('Error loading debts:', error);
    }
  };

  const loadPayees = async () => {
    if (!currentHousehold) return;

    try {
      // Load regular payees
      const { data, error } = await supabase
        .from('payees')
        .select(`
          id,
          name,
          default_category_id,
          default_transaction_type,
          debt_id,
          bill_id,
          debts!payees_debt_id_fkey(name)
        `)
        .eq('household_id', currentHousehold.id)
        .order('name');

      if (error) throw error;

      const payeesWithDebtNames = (data || []).map((payee: any) => ({
        ...payee,
        debt_name: payee.debts?.name || null,
        debts: undefined,
      }));

      // Load accounts as transfer payees (exclude current account)
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name, balance')
        .eq('household_id', currentHousehold.id)
        .neq('id', accountId)
        .order('name');

      if (accountsError) throw accountsError;

      // Load Plaid accounts as transfer payees (exclude current account)
      const { data: plaidAccountsData, error: plaidAccountsError } = await supabase
        .from('plaid_accounts')
        .select('id, name, current_balance')
        .eq('household_id', currentHousehold.id)
        .neq('id', accountId)
        .order('name');

      if (plaidAccountsError) throw plaidAccountsError;

      // Get transfer category for these payees
      const { data: transferCategory } = await supabase
        .from('transaction_categories')
        .select('id')
        .eq('household_id', currentHousehold.id)
        .eq('type', 'transfer')
        .single();

      if (transferCategory) {
        setTransferCategoryId(transferCategory.id);
      }

      // Convert accounts to payee format
      const accountPayees: Payee[] = [
        ...(accountsData || []).map(acc => ({
          id: `account_${acc.id}`,
          name: `Transfer: ${acc.name}`,
          default_category_id: transferCategory?.id || null,
          default_transaction_type: null,
          debt_id: null,
          bill_id: null,
          account_id: acc.id,
          is_transfer_account: true,
        })),
        ...(plaidAccountsData || []).map(acc => ({
          id: `account_${acc.id}`,
          name: `Transfer: ${acc.name}`,
          default_category_id: transferCategory?.id || null,
          default_transaction_type: null,
          debt_id: null,
          bill_id: null,
          account_id: acc.id,
          is_transfer_account: true,
        })),
      ];

      // Combine regular payees with account payees
      setPayees([...payeesWithDebtNames, ...accountPayees]);
    } catch (error: any) {
      console.error('Error loading payees:', error);
    }
  };

  const handleAddPayee = (prefilledName?: string) => {
    // Open ManagePayeesDialog with or without a prefilled name
    setNewPayeeName(prefilledName || '');
    setManagePayeesOpen(true);
  };

  const loadCategories = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error loading categories:', error);
    }
  };

  const handleAddCategory = async () => {
    console.log('handleAddCategory called');
    console.log('currentHousehold:', currentHousehold);
    console.log('newCategoryName:', newCategoryName);

    if (!currentHousehold || !newCategoryName.trim()) {
      console.log('Validation failed - missing household or category name');
      toast({
        title: 'Error',
        description: 'Please enter a category name',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Inserting category...');
      const { error } = await supabase
        .from('transaction_categories')
        .insert({
          household_id: currentHousehold.id,
          name: newCategoryName.trim(),
          type: newCategoryType,
          icon: newCategoryIcon || null,
          color: newCategoryColor,
          is_default: false,
        });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      console.log('Category added successfully');
      toast({
        title: 'Success',
        description: 'Category added successfully',
      });

      setNewCategoryName('');
      setNewCategoryIcon('');
      setNewCategoryColor('#64748b');
      setShowAddCategory(false);
      await loadCategories();
    } catch (error: any) {
      console.error('handleAddCategory error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add category',
        variant: 'destructive',
      });
    }
  };

  const loadAccountData = async () => {
    if (!currentHousehold || !accountId) return;

    setLoading(true);
    try {
      // Try to load from manual accounts first
      let { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', accountId)
        .eq('household_id', currentHousehold.id)
        .single();

      // If not found in manual accounts or RLS blocked, try plaid_accounts
      // PGRST116 = not found, PGRST301 = RLS policy violation (406)
      if (accountError && (accountError.code === 'PGRST116' || accountError.code === 'PGRST301' || accountError.code === '406')) {
        const { data: plaidData, error: plaidError } = await supabase
          .from('plaid_accounts')
          .select('*')
          .eq('id', accountId)
          .eq('household_id', currentHousehold.id)
          .single();

        if (plaidError) throw plaidError;
        
        // Map plaid_accounts fields to match Account interface
        accountData = {
          ...plaidData,
          balance: plaidData.current_balance || 0,
          institution: plaidData.name,
        };
      } else if (accountError) {
        throw accountError;
      }

      setAccount(accountData);

      // Load transactions - check both transactions table (manual) and plaid_transactions table
      let allTransactions: any[] = [];

      // Load from transactions table (manual entries)
      const { data: manualTransactions, error: manualError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', accountId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!manualError && manualTransactions) {
        allTransactions = [...manualTransactions];
      }

      // If this is a Plaid account, also load from plaid_transactions
      if (accountData.plaid_item_id) {
        const { data: plaidAccountData } = await supabase
          .from('plaid_accounts')
          .select('id')
          .eq('id', accountId)
          .single();

        if (plaidAccountData) {
          const { data: plaidTransactions, error: plaidError } = await supabase
            .from('plaid_transactions')
            .select('*')
            .eq('plaid_account_id', plaidAccountData.id)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

          if (!plaidError && plaidTransactions) {
            // Map plaid_transactions to match Transaction interface
            const mappedPlaidTransactions = plaidTransactions.map(t => ({
              id: t.id,
              date: t.date,
              description: t.name,
              amount: -t.amount, // Plaid uses positive for debits, we use negative
              category_id: t.category_id || null,
              notes: t.notes || t.merchant_name || null,
              is_pending: t.pending,
              is_cleared: t.is_cleared !== null ? t.is_cleared : !t.pending, // Use manual override or derive from pending status
              plaid_transaction_id: t.transaction_id,
              debt_id: t.debt_id || null,
              bill_id: t.bill_id || null,
              payee_id: t.payee_id || null,
              recurring_transaction_id: null,
              created_at: t.created_at,
              auto_matched: t.auto_matched || false,
              match_confidence: t.match_confidence || null,
            }));
            
            allTransactions = [...allTransactions, ...mappedPlaidTransactions];
          }
        }
      }

      // Sort all transactions by date
      allTransactions.sort((a, b) => {
        const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateCompare !== 0) return dateCompare;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setTransactions(allTransactions);
    } catch (error: any) {
      console.error('Error loading account data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHousehold || !accountId) return;

    setLoading(true);
    try {
      const rawAmount = parseFloat(transactionForm.amount);
      const amount = transactionForm.transaction_type === 'withdraw' ? -Math.abs(rawAmount) : Math.abs(rawAmount);

      // Check if this is a transfer to another account
      const selectedPayee = payees.find(p => p.id === transactionForm.payee_id);
      const isTransfer = selectedPayee?.is_transfer_account && selectedPayee?.account_id;

      const transactionData: any = {
        account_id: accountId,
        household_id: currentHousehold.id,
        date: transactionForm.date,
        amount: amount,
        description: transactionForm.payee_id ? payees.find(p => p.id === transactionForm.payee_id)?.name || '' : '',
        category_id: isTransfer ? transferCategoryId : (transactionForm.category && transactionForm.category !== '' ? transactionForm.category : null),
        notes: transactionForm.notes || null,
        is_pending: transactionForm.is_pending,
        is_cleared: transactionForm.is_cleared,
        debt_id: transactionForm.debt_id || null,
        payee_id: transactionForm.payee_id || null,
      };

      if (transactionForm.is_recurring) {
        const { data: recurringData, error: recurringError } = await supabase
          .from('recurring_transactions')
          .insert({
            household_id: currentHousehold.id,
            account_id: accountId,
            payee_id: transactionForm.payee_id || null,
            category_id: transactionForm.category && transactionForm.category !== '' ? transactionForm.category : null,
            transaction_type: transactionForm.transaction_type,
            amount: Math.abs(rawAmount),
            description: transactionForm.payee_id ? payees.find(p => p.id === transactionForm.payee_id)?.name || '' : '',
            frequency: transactionForm.recurring_frequency,
            start_date: transactionForm.date,
            end_date: transactionForm.recurring_end_date || null,
            next_due_date: transactionForm.date,
            is_active: true,
            debt_id: transactionForm.debt_id || null,
          })
          .select()
          .single();

        if (recurringError) throw recurringError;
        transactionData.recurring_transaction_id = recurringData.id;
      }

      // Generate transfer ID if this is a transfer
      const transferId = isTransfer ? crypto.randomUUID() : null;
      if (transferId) {
        transactionData.transfer_id = transferId;
      }

      const { error } = await supabase
        .from('transactions')
        .insert(transactionData);

      if (error) throw error;

      // If this is a transfer, create the corresponding transaction in the destination account
      if (isTransfer && selectedPayee?.account_id) {
        const destinationAmount = -amount; // Opposite sign for destination
        const destinationDescription = account?.name ? `Transfer from ${account.name}` : 'Transfer';
        
        const destinationTransaction = {
          account_id: selectedPayee.account_id,
          household_id: currentHousehold.id,
          date: transactionForm.date,
          amount: destinationAmount,
          description: destinationDescription,
          category_id: transferCategoryId,
          notes: transactionForm.notes || null,
          is_pending: false,
          is_cleared: true,
          transfer_id: transferId,
        };

        const { error: destError } = await supabase
          .from('transactions')
          .insert(destinationTransaction);

        if (destError) throw destError;

        // Update destination account balance
        const { data: destAccount, error: destAccountError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', selectedPayee.account_id)
          .single();

        if (!destAccountError && destAccount) {
          await supabase
            .from('accounts')
            .update({ balance: destAccount.balance + destinationAmount })
            .eq('id', selectedPayee.account_id);
        }

        // Also check plaid_accounts
        const { data: destPlaidAccount, error: destPlaidError } = await supabase
          .from('plaid_accounts')
          .select('current_balance')
          .eq('id', selectedPayee.account_id)
          .single();

        if (!destPlaidError && destPlaidAccount) {
          await supabase
            .from('plaid_accounts')
            .update({ current_balance: destPlaidAccount.current_balance + destinationAmount })
            .eq('id', selectedPayee.account_id);
        }
      }

      // Update source account balance
      const newBalance = (account?.balance || 0) + amount;
      const table = isPlaidAccount ? 'plaid_accounts' : 'accounts';
      const balanceField = isPlaidAccount ? 'current_balance' : 'balance';
      await supabase
        .from(table)
        .update({ [balanceField]: newBalance })
        .eq('id', accountId);

      toast({
        title: 'Success',
        description: isTransfer ? 'Transfer completed successfully' : (transactionForm.is_recurring ? 'Recurring transaction created successfully' : 'Transaction added successfully'),
      });

      resetTransactionForm();
      setAddDialogOpen(false);
      await loadAccountData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction || !currentHousehold || !accountId) return;

    setLoading(true);
    try {
      const rawAmount = parseFloat(transactionForm.amount);
      const amount = transactionForm.transaction_type === 'withdraw' ? -Math.abs(rawAmount) : Math.abs(rawAmount);
      const amountDifference = amount - editingTransaction.amount;

      const categoryId = transactionForm.category && transactionForm.category !== '' ? transactionForm.category : null;

      // Check if this is a Plaid transaction
      const isPlaidTransaction = !!editingTransaction.plaid_transaction_id;

      if (isPlaidTransaction) {
        // Update plaid_transactions table and mark as user_modified
        const updatedName = transactionForm.payee_id 
          ? payees.find(p => p.id === transactionForm.payee_id)?.name || editingTransaction.description
          : editingTransaction.description;
        
        // IMPORTANT: Plaid uses opposite sign convention
        // Our UI: withdrawals are negative, deposits are positive
        // Plaid: debits are positive, credits are negative
        // So we need to invert the amount when saving back to Plaid table
        const plaidAmount = -amount;
        
        const { error } = await supabase
          .from('plaid_transactions')
          .update({
            date: transactionForm.date,
            name: updatedName,
            amount: plaidAmount,
            category_id: categoryId,
            payee_id: transactionForm.payee_id || null,
            notes: transactionForm.notes || null,
            pending: transactionForm.is_pending,
            is_cleared: transactionForm.is_cleared,
            debt_id: transactionForm.debt_id || null,
            bill_id: null, // Can be enhanced later if needed
            user_modified: true,
            user_modified_at: new Date().toISOString(),
          })
          .eq('id', editingTransaction.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Plaid transaction updated. Your changes will be preserved during syncs.',
        });
      } else {
        // Update regular transactions table
        const { error } = await supabase
          .from('transactions')
          .update({
            date: transactionForm.date,
            description: transactionForm.payee_id ? payees.find(p => p.id === transactionForm.payee_id)?.name || '' : '',
            amount: amount,
            category_id: categoryId,
            notes: transactionForm.notes || null,
            is_pending: transactionForm.is_pending,
            debt_id: transactionForm.debt_id || null,
            payee_id: transactionForm.payee_id || null,
          })
          .eq('id', editingTransaction.id);

        if (error) throw error;

        // Update account balance for manual transactions only
        const newBalance = (account?.balance || 0) + amountDifference;
        const table = isPlaidAccount ? 'plaid_accounts' : 'accounts';
        await supabase
          .from(table)
          .update({ balance: newBalance })
          .eq('id', accountId);

        toast({
          title: 'Success',
          description: 'Transaction updated successfully',
        });
      }

      setEditingTransaction(null);
      setTransactionForm({
        date: format(new Date(), 'yyyy-MM-dd'),
        payee_id: '',
        transaction_type: 'withdraw',
        amount: '',
        category: '',
        notes: '',
        is_pending: false,
        is_cleared: false,
        debt_id: '',
        is_recurring: false,
        recurring_frequency: 'monthly',
        recurring_end_date: '',
      });
      await loadAccountData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!transactionToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionToDelete.id);

      if (error) throw error;

      // Update account balance
      const newBalance = (account?.balance || 0) - transactionToDelete.amount;
      const table = isPlaidAccount ? 'plaid_accounts' : 'accounts';
      await supabase
        .from(table)
        .update({ balance: newBalance })
        .eq('id', accountId);

      toast({
        title: 'Success',
        description: 'Transaction deleted successfully',
      });

      setDeleteDialogOpen(false);
      setTransactionToDelete(null);

      await loadAccountData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    const isNegative = transaction.amount < 0;
    setTransactionForm({
      date: transaction.date,
      payee_id: transaction.payee_id || '',
      transaction_type: isNegative ? 'withdraw' : 'deposit',
      amount: Math.abs(transaction.amount).toString(),
      category: transaction.category_id || '',
      notes: transaction.notes || '',
      is_pending: transaction.is_pending,
      is_cleared: transaction.is_cleared,
      debt_id: transaction.debt_id || '',
      is_recurring: false,
      recurring_frequency: 'monthly',
      recurring_end_date: '',
    });
  };

  const handlePayeeChange = async (payeeId: string) => {
    const payee = payees.find(p => p.id === payeeId);
    if (payee) {
      let amount = '';
      let categoryId = '';

      // Get category ID
      if (payee.default_category_id) {
        categoryId = payee.default_category_id;
      }

      // If payee is linked to a debt, fetch minimum payment
      if (payee.debt_id) {
        try {
          const { data: debt, error } = await supabase
            .from('debts')
            .select('minimum_payment')
            .eq('id', payee.debt_id)
            .maybeSingle();

          if (!error && debt) {
            amount = debt.minimum_payment.toString();
          }
        } catch (error) {
          console.error('Error fetching debt details:', error);
        }
      }

      // If payee is linked to a bill, fetch bill amount and category
      if (payee.bill_id) {
        try {
          const { data: bill, error } = await supabase
            .from('bills')
            .select('amount, category_id')
            .eq('id', payee.bill_id)
            .maybeSingle();

          if (!error && bill) {
            amount = bill.amount.toString();
            // Get category ID from bill
            if (bill.category_id) {
              categoryId = bill.category_id;
            }
          }
        } catch (error) {
          console.error('Error fetching bill details:', error);
        }
      }

      setTransactionForm(prev => ({
        ...prev,
        payee_id: payeeId,
        transaction_type: payee.default_transaction_type || prev.transaction_type,
        category: categoryId || prev.category,
        amount: amount || prev.amount,
        debt_id: payee.debt_id || prev.debt_id,
      }));
    } else {
      setTransactionForm(prev => ({ ...prev, payee_id: '' }));
    }
  };

  const handleSyncPlaidSuccess = () => {
    // Reload account data to get new transactions
    loadAccountData();
  };

  const handleExportTransactions = () => {
    if (transactions.length === 0) return;

    const csvHeaders = ['Date', 'Description', 'Category', 'Debit', 'Credit', 'Balance', 'Notes', 'Status'];
    const csvRows = runningBalance.map((transaction) => {
      const category = transaction.category_id
        ? categories.find(c => c.id === transaction.category_id)?.name || ''
        : '';
      const debit = transaction.amount < 0 ? Math.abs(transaction.amount).toFixed(2) : '';
      const credit = transaction.amount > 0 ? transaction.amount.toFixed(2) : '';
      const status = transaction.is_pending ? 'Pending' : 'Posted';

      return [
        format(parseISO(transaction.date), 'yyyy-MM-dd'),
        `"${transaction.description.replace(/"/g, '""')}"`,
        `"${category}"`,
        debit,
        credit,
        transaction.balance.toFixed(2),
        `"${(transaction.notes || '').replace(/"/g, '""')}"`,
        status
      ].join(',');
    });

    const csv = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${account?.name.replace(/[^a-z0-9]/gi, '_')}_transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Transactions exported successfully',
    });
  };

  if (loading && !account) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading account...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!account) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Account not found</p>
            <Button onClick={() => router.push('/dashboard/accounts')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Accounts
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const toggleCleared = async (transactionId: string, currentCleared: boolean) => {
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      const isPlaidTransaction = !!transaction?.plaid_transaction_id;
      
      // Update the appropriate table
      const table = isPlaidTransaction ? 'plaid_transactions' : 'transactions';
      const updateData: any = { is_cleared: !currentCleared };
      
      // For Plaid transactions, also mark as user_modified
      if (isPlaidTransaction) {
        updateData.user_modified = true;
        updateData.user_modified_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', transactionId);

      if (error) throw error;

      setTransactions(prev =>
        prev.map(t => t.id === transactionId ? { ...t, is_cleared: !currentCleared } : t)
      );

      toast({
        title: 'Success',
        description: `Transaction marked as ${!currentCleared ? 'cleared' : 'uncleared'}`,
      });
    } catch (error: any) {
      console.error('Error toggling cleared status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update transaction',
        variant: 'destructive',
      });
    }
  };

  if (loading || !account) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const filteredTransactions = filterUncleared
    ? transactions.filter(t => !t.is_cleared)
    : transactions;

  const accountBalance = typeof account.balance === 'number' ? account.balance : 0;
  
  const clearedBalance = accountBalance - transactions
    .filter(t => !t.is_cleared)
    .reduce((sum, t) => sum + t.amount, 0);

  const workingBalance = accountBalance;

  const runningBalance = [...filteredTransactions].reverse().reduce((acc, transaction, index) => {
    const balance = index === 0 ? (accountBalance - filteredTransactions.reduce((sum, t) => sum + t.amount, 0) + transaction.amount) : acc[index - 1].balance + transaction.amount;
    acc.push({ ...transaction, balance });
    return acc;
  }, [] as any[]).reverse();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/accounts')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-primary">{account.name}</h1>
                {isPlaidAccount && (
                  <Badge variant="secondary">
                    <Link2 className="h-3 w-3 mr-1" />
                    Linked
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {account.institution && <span>{account.institution} • </span>}
                <span className="capitalize">{account.type}</span>
                {account.account_number_last4 && <span> • ••••{account.account_number_last4}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPlaidAccount && account.plaid_item_id && (
              <PlaidSyncButton
                plaidItemId={account.plaid_item_id}
                onSuccess={handleSyncPlaidSuccess}
              />
            )}
            <Dialog open={addDialogOpen} onOpenChange={(open) => {
              setAddDialogOpen(open);
              if (!open) resetTransactionForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                    <DialogDescription>
                      Record a new transaction for this account
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddTransaction}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={transactionForm.date}
                          onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="payee">Payer/Payee</Label>
                        <div className="flex gap-2">
                          <SearchablePayeeSelect
                            payees={payees}
                            value={transactionForm.payee_id || 'none'}
                            onValueChange={(value) => {
                              if (value === 'none') {
                                setTransactionForm(prev => ({ ...prev, payee_id: '' }));
                              } else {
                                handlePayeeChange(value);
                              }
                            }}
                            onAddNew={(name) => handleAddPayee(name)}
                            placeholder="Select or type payee..."
                            allowNone={true}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleAddPayee()}
                            title="Manage Payees"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="type">Type</Label>
                          <Select
                            value={transactionForm.transaction_type}
                            onValueChange={(value: 'deposit' | 'withdraw') =>
                              setTransactionForm({ ...transactionForm, transaction_type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="deposit">Deposit</SelectItem>
                              <SelectItem value="withdraw">Withdraw</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={transactionForm.amount}
                            onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="category">Category (Optional)</Label>
                        {showAddCategory ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                placeholder="Category name"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                              />
                              <IconPicker
                                value={newCategoryIcon}
                                onValueChange={setNewCategoryIcon}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Select value={newCategoryType} onValueChange={(value: any) => setNewCategoryType(value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="expense">Expense</SelectItem>
                                  <SelectItem value="income">Income</SelectItem>
                                  <SelectItem value="transfer">Transfer</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="color"
                                value={newCategoryColor}
                                onChange={(e) => setNewCategoryColor(e.target.value)}
                                className="w-20"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleAddCategory();
                                }}
                              >
                                Save Category
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowAddCategory(false);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <SearchableCategorySelect
                              categories={categories}
                              value={transactionForm.category || 'none'}
                              onValueChange={(value) => {
                                console.log('Category select changed:', value);
                                if (value === 'none') {
                                  setTransactionForm({ ...transactionForm, category: '' });
                                } else {
                                  setTransactionForm({ ...transactionForm, category: value });
                                }
                              }}
                              placeholder="Select a category"
                              onAddNew={() => {
                                console.log('Add new category button clicked');
                                setShowAddCategory(true);
                              }}
                              allowNone={true}
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={transactionForm.notes}
                          onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                          placeholder="Additional details..."
                        />
                      </div>

                      <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="is_recurring"
                            checked={transactionForm.is_recurring}
                            onChange={(e) => setTransactionForm({ ...transactionForm, is_recurring: e.target.checked })}
                            className="h-4 w-4"
                          />
                          <Label htmlFor="is_recurring" className="cursor-pointer">
                            Make this a recurring transaction
                          </Label>
                        </div>

                        {transactionForm.is_recurring && (
                          <div className="space-y-4 pl-6">
                            <div>
                              <Label htmlFor="frequency">Frequency</Label>
                              <Select
                                value={transactionForm.recurring_frequency}
                                onValueChange={(value: any) =>
                                  setTransactionForm({ ...transactionForm, recurring_frequency: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="quarterly">Quarterly</SelectItem>
                                  <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="recurring_end_date">End Date (Optional)</Label>
                              <Input
                                id="recurring_end_date"
                                type="date"
                                value={transactionForm.recurring_end_date}
                                onChange={(e) =>
                                  setTransactionForm({ ...transactionForm, recurring_end_date: e.target.value })
                                }
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Leave blank to continue indefinitely
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter className="mt-6">
                      <Button type="button" variant="outline" onClick={() => {
                        setAddDialogOpen(false);
                        resetTransactionForm();
                      }}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Adding...' : 'Add Transaction'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Working Balance</CardTitle>
              <CardDescription>All transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: account.color }}>
                ${workingBalance.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Cleared Balance</CardTitle>
              <CardDescription>Only cleared transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ${clearedBalance.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Uncleared</CardTitle>
              <CardDescription>Pending transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                ${(workingBalance - clearedBalance).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transaction Register</CardTitle>
                <CardDescription>
                  {filterUncleared
                    ? `${filteredTransactions.length} uncleared transaction${filteredTransactions.length !== 1 ? 's' : ''}`
                    : `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`
                  }
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {transactions.length > 0 && (
                  <>
                    <Button
                      variant={filterUncleared ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilterUncleared(!filterUncleared)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {filterUncleared ? 'Show All' : 'Show Uncleared'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportTransactions}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No transactions yet</p>
                {!isPlaidAccount && (
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Transaction
                  </Button>
                )}
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Clear</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runningBalance.map((transaction) => (
                      <TableRow key={transaction.id} className={transaction.is_pending ? 'opacity-60' : ''}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCleared(transaction.id, transaction.is_cleared)}
                            className="h-8 w-8 p-0"
                            title={transaction.is_cleared ? 'Mark as uncleared' : 'Mark as cleared'}
                          >
                            {transaction.is_cleared ? (
                              <Check className="h-5 w-5 text-green-600" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div>
                            {format(parseISO(transaction.date), 'MMM d, yyyy')}
                            {transaction.is_pending && (
                              <Badge variant="outline" className="ml-2 text-xs">Pending</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div
                                className="font-medium cursor-pointer hover:text-primary transition-colors"
                                onClick={() => openEditDialog(transaction)}
                                title="Click to edit"
                              >
                                {transaction.description}
                              </div>
                              {transaction.plaid_transaction_id && (
                                <Badge variant="outline" className="text-xs">Plaid</Badge>
                              )}
                            </div>
                            {transaction.notes && (
                              <div className="text-xs text-muted-foreground">{transaction.notes}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.category_id && (() => {
                            const category = categories.find(c => c.id === transaction.category_id);
                            return category ? (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit">
                                {category.icon && <span>{category.icon}</span>}
                                <span>{category.name}</span>
                              </Badge>
                            ) : null;
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.amount < 0 && (
                            <span className="text-red-600 font-medium">
                              ${Math.abs(transaction.amount).toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.amount > 0 && (
                            <span className="text-green-600 font-medium">
                              ${transaction.amount.toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${transaction.balance.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(transaction)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {!transaction.plaid_transaction_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTransactionToDelete(transaction);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {editingTransaction && (
          <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Transaction</DialogTitle>
                <DialogDescription>
                  Update the transaction details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditTransaction}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-date">Date</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={transactionForm.date}
                      onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-payee">Payer/Payee</Label>
                    <div className="flex gap-2">
                      <Select
                        value={transactionForm.payee_id || 'none'}
                        onValueChange={(value) => {
                          if (value === 'none') {
                            setTransactionForm(prev => ({ ...prev, payee_id: '' }));
                          } else {
                            handlePayeeChange(value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a payee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {payees.map((payee) => (
                            <SelectItem key={payee.id} value={payee.id}>
                              <span className="flex items-center gap-2">
                                {payee.name}
                                {payee.debt_id && (
                                  <Badge variant="outline" className="text-xs">Debt</Badge>
                                )}
                                {payee.bill_id && (
                                  <Badge variant="outline" className="text-xs">Bill</Badge>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setManagePayeesOpen(true)}
                        title="Manage Payees"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-type">Type</Label>
                      <Select
                        value={transactionForm.transaction_type}
                        onValueChange={(value: 'deposit' | 'withdraw') =>
                          setTransactionForm({ ...transactionForm, transaction_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">Deposit</SelectItem>
                          <SelectItem value="withdraw">Withdraw</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit-amount">Amount</Label>
                      <Input
                        id="edit-amount"
                        type="number"
                        step="0.01"
                        value={transactionForm.amount}
                        onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-category">Category</Label>
                    {showAddCategory ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                          />
                          <IconPicker
                            value={newCategoryIcon}
                            onValueChange={setNewCategoryIcon}
                          />
                        </div>
                        <Select
                          value={newCategoryType}
                          onValueChange={(value: 'income' | 'expense' | 'transfer') => setNewCategoryType(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={handleAddCategory}
                            size="sm"
                            className="flex-1"
                          >
                            Save Category
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowAddCategory(false);
                              setNewCategoryName('');
                              setNewCategoryIcon('');
                            }}
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <SearchableCategorySelect
                          categories={categories}
                          value={transactionForm.category || 'none'}
                          onValueChange={(value) => {
                            if (value === 'none') {
                              setTransactionForm({ ...transactionForm, category: '' });
                            } else {
                              setTransactionForm({ ...transactionForm, category: value });
                            }
                          }}
                          placeholder="Select a category"
                          onAddNew={() => {
                            console.log('Add new category button clicked in edit form');
                            setShowAddCategory(true);
                          }}
                          allowNone={true}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      value={transactionForm.notes}
                      onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setEditingTransaction(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Transaction'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        <ManagePayeesDialog
          open={managePayeesOpen}
          onOpenChange={(open) => {
            setManagePayeesOpen(open);
            if (!open) {
              setNewPayeeName(''); // Clear prefilled name when dialog closes
            }
          }}
          householdId={currentHousehold?.id || ''}
          categories={categories}
          onPayeeCreated={(payeeId, payeeName) => {
            loadPayees(); // Reload payees list
            if (payeeId) {
              // Select the newly created payee in the transaction form
              setTransactionForm(prev => ({ ...prev, payee_id: payeeId }));
              // Close the manage payees dialog to return to transaction dialog
              setManagePayeesOpen(false);
              setNewPayeeName('');
            }
          }}
          prefilledName={newPayeeName}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this transaction? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTransaction} disabled={loading}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
