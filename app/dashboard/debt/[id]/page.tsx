'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, DollarSign, TrendingDown, Calendar, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/lib/household-context';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/format';

interface Debt {
  id: string;
  name: string;
  type: string;
  original_balance: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  payment_day: number;
  lender: string | null;
  account_number_last4: string | null;
  is_active: boolean;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
  remaining_balance: number;
  notes: string | null;
  transaction_id: string | null;
  transactions: {
    id: string;
    description: string;
    account_id: string;
    account_name: string | null;
  } | null;
}

export default function DebtDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentHousehold } = useHousehold();
  const [debt, setDebt] = useState<Debt | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    payment_date: '',
    notes: '',
  });

  const debtId = params.id as string;

  useEffect(() => {
    if (currentHousehold && debtId) {
      loadDebtData();
    }
  }, [currentHousehold, debtId]);

  const loadDebtData = async () => {
    if (!currentHousehold || !debtId) return;

    setLoading(true);
    try {
      const { data: debtData, error: debtError } = await supabase
        .from('debts')
        .select('*')
        .eq('id', debtId)
        .eq('household_id', currentHousehold.id)
        .single();

      if (debtError) throw debtError;
      setDebt(debtData);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('debt_payments')
        .select(`
          *,
          transactions (
            id,
            description,
            account_id
          )
        `)
        .eq('debt_id', debtId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Manually fetch account names for transactions
      const paymentsWithAccountNames = await Promise.all(
        (paymentsData || []).map(async (payment) => {
          if (payment.transactions?.account_id) {
            let accountName = null;

            // Try regular accounts first
            const { data: account } = await supabase
              .from('accounts')
              .select('name')
              .eq('id', payment.transactions.account_id)
              .maybeSingle();

            if (account) {
              accountName = account.name;
            } else {
              // Try Plaid accounts
              const { data: plaidAccount } = await supabase
                .from('plaid_accounts')
                .select('name')
                .eq('id', payment.transactions.account_id)
                .maybeSingle();

              if (plaidAccount) {
                accountName = plaidAccount.name;
              }
            }

            return {
              ...payment,
              transactions: {
                ...payment.transactions,
                account_name: accountName,
              },
            };
          }
          return payment;
        })
      );

      setPayments(paymentsWithAccountNames);
    } catch (error: any) {
      console.error('Error loading debt data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load debt',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      amount: payment.amount.toString(),
      payment_date: payment.payment_date,
      notes: payment.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleSavePayment = async () => {
    if (!editingPayment || !currentHousehold) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('debt_payments')
        .update({
          amount: parseFloat(formData.amount),
          payment_date: formData.payment_date,
          notes: formData.notes || null,
        })
        .eq('id', editingPayment.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payment updated successfully',
      });

      setEditDialogOpen(false);
      setEditingPayment(null);
      loadDebtData();
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!deletingPayment) return;

    try {
      setLoading(true);

      // If this payment has a transaction_id, check if the account still exists
      if (deletingPayment.transaction_id && deletingPayment.transactions?.account_id) {
        const accountId = deletingPayment.transactions.account_id;
        
        // Check if account exists in either accounts or plaid_accounts table
        const { data: manualAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('id', accountId)
          .single();
          
        const { data: plaidAccount } = await supabase
          .from('plaid_accounts')
          .select('id')
          .eq('id', accountId)
          .single();
        
        // If account still exists, prevent deletion
        if (manualAccount || plaidAccount) {
          toast({
            title: 'Cannot Delete',
            description: 'This payment is linked to a transaction. Delete the transaction from the account page instead.',
            variant: 'destructive',
          });
          setDeleteDialogOpen(false);
          setDeletingPayment(null);
          setLoading(false);
          return;
        }
        
        // If account doesn't exist, allow deleting just the payment record
        // Transaction remains in database as historical record
      }

      const { error } = await supabase
        .from('debt_payments')
        .delete()
        .eq('id', deletingPayment.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payment deleted successfully',
      });

      setDeleteDialogOpen(false);
      setDeletingPayment(null);
      loadDebtData();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!debt) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Debt not found</div>
        </div>
      </DashboardLayout>
    );
  }

  const totalPrincipalPaid = payments.reduce((sum, p) => sum + p.principal_paid, 0);
  const totalInterestPaid = payments.reduce((sum, p) => sum + p.interest_paid, 0);
  const totalPaid = totalPrincipalPaid + totalInterestPaid;
  
  // Calculate remaining balance: current_balance (starting point) minus all principal paid
  // current_balance is the user-editable starting point, not auto-updated
  const remainingBalance = Math.max(0, debt.current_balance - totalPrincipalPaid);
  
  // Progress percent: how much of the ORIGINAL loan has been paid off
  const progressPercent = ((debt.original_balance - remainingBalance) / debt.original_balance) * 100;

  // Calculate "Balance After" for each payment
  // Payments are sorted by date descending, so we calculate cumulative principal from the end
  const paymentsWithBalanceAfter = payments.map((payment, index) => {
    // Sum principal paid from this payment to the most recent (index 0)
    const cumulativePrincipal = payments
      .slice(0, index + 1)
      .reduce((sum, p) => sum + p.principal_paid, 0);
    return {
      ...payment,
      calculatedBalanceAfter: Math.max(0, debt.current_balance - cumulativePrincipal),
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/debt')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">{debt.name}</h1>
            <p className="text-muted-foreground">
              {debt.type} {debt.lender && `• ${debt.lender}`}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrency(remainingBalance)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Original Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-muted-foreground">
                {formatCurrency(debt.original_balance)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {progressPercent.toFixed(1)}% paid off
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Interest Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {debt.interest_rate.toFixed(3)}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Min: {formatCurrency(debt.minimum_payment)}/mo
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Principal Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPrincipalPaid)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Interest Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalInterestPaid)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  {payments.length} payment{payments.length !== 1 ? 's' : ''} recorded
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No payments recorded yet</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Balance After</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsWithBalanceAfter.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(parseISO(payment.payment_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {payment.transactions ? (
                            <div>
                              <div className="font-medium">{payment.transactions.description}</div>
                              {payment.transactions.account_name && (
                                <div className="text-xs text-muted-foreground">
                                  {payment.transactions.account_name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Manual Entry</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(payment.principal_paid)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {formatCurrency(payment.interest_paid)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.calculatedBalanceAfter)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditPayment(payment)}
                              disabled={loading}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingPayment(payment);
                                setDeleteDialogOpen(true);
                              }}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>
              Update the payment details below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes about this payment..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePayment} disabled={loading}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This action cannot be undone.
              {deletingPayment?.transaction_id && (
                <div className="mt-2 text-destructive font-medium">
                  Note: This payment is linked to a transaction. Please delete the transaction instead.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
