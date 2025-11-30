'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useHousehold } from '@/lib/household-context';
import { ArrowRight, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';

interface Account {
  id: string;
  name: string;
  balance: number;
  plaid_item_id?: string | null;
}

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAccountId: string;
  householdId: string;
  onSuccess: () => void;
}

export function TransferDialog({ open, onOpenChange, currentAccountId, householdId, onSuccess }: TransferDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [transferCategoryId, setTransferCategoryId] = useState<string>('');
  
  const [formData, setFormData] = useState({
    toAccountId: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  useEffect(() => {
    if (open && householdId) {
      loadAccounts();
      loadTransferCategory();
    }
  }, [open, householdId]);

  const loadAccounts = async () => {
    try {
      // Load all accounts for this household
      const { data: accountsData, error } = await supabase
        .from('accounts')
        .select('id, name, balance, plaid_item_id')
        .eq('household_id', householdId)
        .order('name');

      if (error) throw error;

      setAccounts(accountsData || []);
      const current = accountsData?.find(a => a.id === currentAccountId);
      setCurrentAccount(current || null);
    } catch (error: any) {
      console.error('Error loading accounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load accounts',
        variant: 'destructive',
      });
    }
  };

  const loadTransferCategory = async () => {
    try {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('id')
        .eq('household_id', householdId)
        .eq('type', 'transfer')
        .single();

      if (error) throw error;
      if (data) {
        setTransferCategoryId(data.id);
      }
    } catch (error: any) {
      console.error('Error loading transfer category:', error);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount || !transferCategoryId) return;

    setLoading(true);
    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      const toAccount = accounts.find(a => a.id === formData.toAccountId);
      if (!toAccount) {
        throw new Error('Please select a destination account');
      }

      // Generate a unique transfer ID to link both transactions
      const transferId = crypto.randomUUID();

      // Create withdrawal transaction (from current account)
      const withdrawalTransaction = {
        account_id: currentAccountId,
        household_id: householdId,
        date: formData.date,
        amount: -amount, // Negative for withdrawal
        description: `Transfer to ${toAccount.name}`,
        category_id: transferCategoryId,
        notes: formData.notes || null,
        is_pending: false,
        is_cleared: true,
        transfer_id: transferId,
      };

      // Create deposit transaction (to destination account)
      const depositTransaction = {
        account_id: formData.toAccountId,
        household_id: householdId,
        date: formData.date,
        amount: amount, // Positive for deposit
        description: `Transfer from ${currentAccount.name}`,
        category_id: transferCategoryId,
        notes: formData.notes || null,
        is_pending: false,
        is_cleared: true,
        transfer_id: transferId,
      };

      // Insert both transactions
      const { error: withdrawalError } = await supabase
        .from('transactions')
        .insert(withdrawalTransaction);

      if (withdrawalError) throw withdrawalError;

      const { error: depositError } = await supabase
        .from('transactions')
        .insert(depositTransaction);

      if (depositError) throw depositError;

      // Update balances
      const newFromBalance = currentAccount.balance - amount;
      const newToBalance = toAccount.balance + amount;

      await supabase
        .from('accounts')
        .update({ balance: newFromBalance })
        .eq('id', currentAccountId);

      await supabase
        .from('accounts')
        .update({ balance: newToBalance })
        .eq('id', formData.toAccountId);

      toast({
        title: 'Success',
        description: `Transferred ${formatCurrency(amount)} to ${toAccount.name}`,
      });

      // Reset form
      setFormData({
        toAccountId: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete transfer',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const availableAccounts = accounts.filter(a => a.id !== currentAccountId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transfer Funds</DialogTitle>
          <DialogDescription>
            Transfer money from {currentAccount?.name} to another account
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleTransfer}>
          <div className="space-y-4 py-4">
            {/* From Account (display only) */}
            <div className="space-y-2">
              <Label>From Account</Label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <span className="font-medium">{currentAccount?.name}</span>
                <span className="text-sm text-muted-foreground">
                  (Balance: {formatCurrency(currentAccount?.balance || 0)})
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            {/* To Account */}
            <div className="space-y-2">
              <Label htmlFor="toAccount">To Account *</Label>
              <Select
                value={formData.toAccountId}
                onValueChange={(value) => setFormData({ ...formData, toAccountId: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center justify-between gap-4">
                        <span>{account.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(account.balance)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add a note about this transfer..."
                rows={2}
              />
            </div>

            {/* Transfer Preview */}
            {formData.amount && formData.toAccountId && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">{currentAccount?.name}</span>
                    <span className="text-red-600 dark:text-red-400">
                      -{formatCurrency(parseFloat(formData.amount))}
                    </span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="flex flex-col items-end">
                    <span className="font-medium">
                      {accounts.find(a => a.id === formData.toAccountId)?.name}
                    </span>
                    <span className="text-green-600 dark:text-green-400">
                      +{formatCurrency(parseFloat(formData.amount))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Transferring...' : 'Complete Transfer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
