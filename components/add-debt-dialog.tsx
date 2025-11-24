'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SearchableCategorySelect } from '@/components/searchable-category-select';

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
  exclude_from_payoff: boolean;
  category_id: string | null;
}

interface TransactionCategory {
  id: string;
  name: string;
  icon?: string;
}

interface AddDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  onSuccess: () => void;
  editingDebt?: Debt | null;
}

export function AddDebtDialog({ open, onOpenChange, householdId, onSuccess, editingDebt }: AddDebtDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [form, setForm] = useState({
    name: '',
    type: 'other',
    original_balance: '',
    current_balance: '',
    interest_rate: '',
    minimum_payment: '',
    payment_day: '1',
    loan_start_date: new Date().toISOString().split('T')[0],
    term_months: '',
    lender: '',
    account_number_last4: '',
    exclude_from_payoff: false,
    category_id: '',
  });

  useEffect(() => {
    if (open && householdId) {
      loadCategories();
    }
    if (editingDebt) {
      setForm({
        name: editingDebt.name,
        type: editingDebt.type,
        original_balance: editingDebt.original_balance.toString(),
        current_balance: editingDebt.current_balance.toString(),
        interest_rate: editingDebt.interest_rate.toString(),
        minimum_payment: editingDebt.minimum_payment.toString(),
        payment_day: editingDebt.payment_day.toString(),
        loan_start_date: editingDebt.loan_start_date,
        term_months: editingDebt.term_months?.toString() || '',
        lender: editingDebt.lender || '',
        account_number_last4: editingDebt.account_number_last4 || '',
        exclude_from_payoff: editingDebt.exclude_from_payoff || false,
        category_id: editingDebt.category_id || '',
      });
    } else {
      setForm({
        name: '',
        type: 'other',
        original_balance: '',
        current_balance: '',
        interest_rate: '',
        minimum_payment: '',
        payment_day: '1',
        loan_start_date: new Date().toISOString().split('T')[0],
        term_months: '',
        lender: '',
        account_number_last4: '',
        exclude_from_payoff: false,
        category_id: '',
      });
    }
  }, [editingDebt, open, householdId]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('transaction_categories')
      .select('*')
      .eq('household_id', householdId)
      .eq('type', 'expense')
      .order('name');
    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.original_balance || !form.minimum_payment) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const currentBalance = form.current_balance ? parseFloat(form.current_balance) : parseFloat(form.original_balance);

      const debtData = {
        household_id: householdId,
        name: form.name,
        type: form.type,
        original_balance: parseFloat(form.original_balance),
        current_balance: currentBalance,
        interest_rate: form.interest_rate ? parseFloat(form.interest_rate) : 0,
        minimum_payment: parseFloat(form.minimum_payment),
        payment_day: parseInt(form.payment_day),
        loan_start_date: form.loan_start_date,
        term_months: form.term_months ? parseInt(form.term_months) : null,
        lender: form.lender || null,
        account_number_last4: form.account_number_last4 || null,
        is_active: true,
        exclude_from_payoff: form.exclude_from_payoff,
        category_id: form.category_id || null,
      };

      let error;
      if (editingDebt) {
        const result = await supabase
          .from('debts')
          .update(debtData)
          .eq('id', editingDebt.id);
        error = result.error;
      } else {
        const result = await supabase.from('debts').insert(debtData);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description: editingDebt ? 'Debt updated successfully' : 'Debt added successfully',
      });

      setForm({
        name: '',
        type: 'other',
        original_balance: '',
        current_balance: '',
        interest_rate: '',
        minimum_payment: '',
        payment_day: '1',
        loan_start_date: new Date().toISOString().split('T')[0],
        term_months: '',
        lender: '',
        account_number_last4: '',
        exclude_from_payoff: false,
        category_id: '',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add debt',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingDebt ? 'Edit Debt' : 'Add Debt'}</DialogTitle>
          <DialogDescription>
            {editingDebt ? 'Update debt information for refinancing or restructuring' : 'Add a new loan or debt to track'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Debt Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Car Loan, Credit Card"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <SearchableCategorySelect
              categories={categories}
              value={form.category_id || 'none'}
              onValueChange={(value) => {
                if (value === 'none') {
                  setForm({ ...form, category_id: '' });
                } else {
                  setForm({ ...form, category_id: value });
                }
              }}
              placeholder="Select a category"
              allowNone={true}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Helps categorize debt payments in your budget
            </p>
          </div>

          <div>
            <Label htmlFor="original_balance">Original Loan/Credit Limit *</Label>
            <Input
              id="original_balance"
              type="number"
              step="0.01"
              min="0"
              value={form.original_balance}
              onChange={(e) => setForm({ ...form, original_balance: e.target.value })}
              placeholder="0.00"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              The starting balance when the loan was first taken out or credit card limit
            </p>
          </div>

          <div>
            <Label htmlFor="current_balance">Current Balance</Label>
            <Input
              id="current_balance"
              type="number"
              step="0.01"
              min="0"
              value={form.current_balance}
              onChange={(e) => setForm({ ...form, current_balance: e.target.value })}
              placeholder="Leave blank if same as original"
            />
            <p className="text-xs text-muted-foreground mt-1">
              If different from original amount (optional)
            </p>
          </div>

          <div>
            <Label htmlFor="loan_start_date">Loan Start Date</Label>
            <Input
              id="loan_start_date"
              type="date"
              value={form.loan_start_date}
              onChange={(e) => setForm({ ...form, loan_start_date: e.target.value })}
            />
            <p className="text-xs text-muted-foreground mt-1">
              When the loan originally started
            </p>
          </div>

          <div>
            <Label htmlFor="term_months">Loan Term (months)</Label>
            <Input
              id="term_months"
              type="number"
              min="1"
              value={form.term_months}
              onChange={(e) => setForm({ ...form, term_months: e.target.value })}
              placeholder="e.g., 360 for 30 years, 60 for 5 years"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Original loan term in months (e.g., 360 = 30 years, 180 = 15 years, 60 = 5 years)
            </p>
          </div>

          <div>
            <Label htmlFor="interest_rate">Interest Rate (%)</Label>
            <Input
              id="interest_rate"
              type="number"
              step="0.001"
              min="0"
              max="100"
              value={form.interest_rate}
              onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
              placeholder="0.000"
            />
          </div>

          <div>
            <Label htmlFor="minimum_payment">Minimum Payment *</Label>
            <Input
              id="minimum_payment"
              type="number"
              step="0.01"
              min="0"
              value={form.minimum_payment}
              onChange={(e) => setForm({ ...form, minimum_payment: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="payment_day">Payment Due Day</Label>
            <Select value={form.payment_day} onValueChange={(value) => setForm({ ...form, payment_day: value })}>
              <SelectTrigger id="payment_day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={day.toString()}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="lender">Lender</Label>
            <Input
              id="lender"
              value={form.lender}
              onChange={(e) => setForm({ ...form, lender: e.target.value })}
              placeholder="e.g., Bank of America"
            />
          </div>

          <div>
            <Label htmlFor="account_number_last4">Account Last 4 Digits</Label>
            <Input
              id="account_number_last4"
              value={form.account_number_last4}
              onChange={(e) => setForm({ ...form, account_number_last4: e.target.value.slice(0, 4) })}
              placeholder="1234"
              maxLength={4}
            />
          </div>

          <div className="flex items-start space-x-2 p-3 rounded-lg bg-muted/50">
            <Checkbox
              id="exclude_from_payoff"
              checked={form.exclude_from_payoff}
              onCheckedChange={(checked) => setForm({ ...form, exclude_from_payoff: checked as boolean })}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="exclude_from_payoff"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Exclude from payoff plan
              </label>
              <p className="text-xs text-muted-foreground">
                Check this if you don't want this debt included in avalanche/snowball calculations (e.g., mortgages, special terms)
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (editingDebt ? 'Updating...' : 'Adding...') : (editingDebt ? 'Update Debt' : 'Add Debt')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
