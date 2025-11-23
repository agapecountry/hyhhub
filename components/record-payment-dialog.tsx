'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Debt {
  id: string;
  name: string;
  current_balance: number;
  interest_rate: number;
}

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debt: Debt | null;
  householdId: string;
  onSuccess: () => void;
}

export function RecordPaymentDialog({ open, onOpenChange, debt, householdId, onSuccess }: RecordPaymentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    principal_paid: '',
    interest_paid: '',
    notes: '',
  });

  const handleAmountChange = (amount: string) => {
    setForm({ ...form, amount });

    if (amount && debt) {
      const paymentAmount = parseFloat(amount);
      const monthlyRate = debt.interest_rate / 100 / 12;
      const interestPaid = debt.current_balance * monthlyRate;
      const principalPaid = Math.max(0, paymentAmount - interestPaid);

      setForm(prev => ({
        ...prev,
        amount,
        interest_paid: interestPaid.toFixed(2),
        principal_paid: principalPaid.toFixed(2),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!debt || !form.amount) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(form.amount);
      const principalPaid = parseFloat(form.principal_paid);
      const interestPaid = parseFloat(form.interest_paid);
      const newBalance = Math.max(0, debt.current_balance - principalPaid);

      const { error: paymentError } = await supabase.from('debt_payments').insert({
        debt_id: debt.id,
        household_id: householdId,
        amount,
        payment_date: form.payment_date,
        principal_paid: principalPaid,
        interest_paid: interestPaid,
        remaining_balance: newBalance,
        notes: form.notes || null,
      });

      if (paymentError) throw paymentError;

      const updateData: any = {
        current_balance: newBalance,
      };

      if (newBalance === 0) {
        updateData.is_active = false;
        updateData.paid_off_at = new Date().toISOString();
      }

      const { error: debtError } = await supabase
        .from('debts')
        .update(updateData)
        .eq('id', debt.id);

      if (debtError) throw debtError;

      toast({
        title: 'Success',
        description: newBalance === 0 ? 'Payment recorded! Debt paid off!' : 'Payment recorded successfully',
      });

      setForm({
        amount: '',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        principal_paid: '',
        interest_paid: '',
        notes: '',
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!debt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for {debt.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Current Balance</div>
            <div className="text-2xl font-bold">${debt.current_balance.toFixed(2)}</div>
          </div>

          <div>
            <Label htmlFor="amount">Payment Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="payment_date">Payment Date *</Label>
            <Input
              id="payment_date"
              type="date"
              value={form.payment_date}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="principal_paid">Principal</Label>
              <Input
                id="principal_paid"
                type="number"
                step="0.01"
                value={form.principal_paid}
                onChange={(e) => setForm({ ...form, principal_paid: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="interest_paid">Interest</Label>
              <Input
                id="interest_paid"
                type="number"
                step="0.01"
                value={form.interest_paid}
                onChange={(e) => setForm({ ...form, interest_paid: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes about this payment"
              rows={3}
            />
          </div>

          {form.principal_paid && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <div className="text-sm text-muted-foreground">New Balance</div>
              <div className="text-xl font-bold">
                ${Math.max(0, debt.current_balance - parseFloat(form.principal_paid)).toFixed(2)}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
