'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, DollarSign, Calendar, Receipt, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/lib/household-context';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/format';

interface Bill {
  id: string;
  company: string;
  account_number: string | null;
  due_date: number;
  frequency: string;
  amount: number;
  notes: string | null;
  is_active: boolean;
  category_id: string;
  transaction_categories: {
    name: string;
    icon: string | null;
    color: string;
  } | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
  transaction_id: string | null;
  transactions: {
    id: string;
    description: string;
    account_id: string;
  } | null;
}

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentHousehold } = useHousehold();
  const [bill, setBill] = useState<Bill | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);

  const billId = params.id as string;

  useEffect(() => {
    if (currentHousehold && billId) {
      loadBillData();
    }
  }, [currentHousehold, billId]);

  const loadBillData = async () => {
    if (!currentHousehold || !billId) return;

    setLoading(true);
    try {
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .select(`
          *,
          transaction_categories (
            name,
            icon,
            color
          )
        `)
        .eq('id', billId)
        .eq('household_id', currentHousehold.id)
        .single();

      if (billError) throw billError;
      setBill(billData);

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('bill_payments')
        .select(`
          *,
          transactions (
            id,
            description,
            account_id
          )
        `)
        .eq('bill_id', billId)
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
    } catch (error: any) {
      console.error('Error loading bill data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load bill',
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
          .maybeSingle();
          
        const { data: plaidAccount } = await supabase
          .from('plaid_accounts')
          .select('id')
          .eq('id', accountId)
          .maybeSingle();
        
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
        .from('bill_payments')
        .delete()
        .eq('id', deletingPayment.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Payment deleted successfully',
      });

      setDeleteDialogOpen(false);
      setDeletingPayment(null);
      loadBillData();
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

  if (!bill) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Bill not found</div>
        </div>
      </DashboardLayout>
    );
  }

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const paymentCount = payments.length;
  const averagePayment = paymentCount > 0 ? totalPaid / paymentCount : 0;

  const frequencyMap: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/accounts')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-primary">{bill.company}</h1>
            <p className="text-muted-foreground">
              {frequencyMap[bill.frequency]} bill • Due on day {bill.due_date}
            </p>
          </div>
          {!bill.is_active && (
            <Badge variant="secondary">Inactive</Badge>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Expected Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(bill.amount)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {frequencyMap[bill.frequency]}
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
                {paymentCount} payment{paymentCount !== 1 ? 's' : ''}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(averagePayment)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Category</CardTitle>
            </CardHeader>
            <CardContent>
              {bill.transaction_categories && (
                <Badge
                  style={{
                    backgroundColor: `${bill.transaction_categories.color}20`,
                    color: bill.transaction_categories.color,
                    borderColor: bill.transaction_categories.color,
                  }}
                  className="text-base"
                >
                  {bill.transaction_categories.icon && `${bill.transaction_categories.icon} `}
                  {bill.transaction_categories.name}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {bill.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{bill.notes}</p>
            </CardContent>
          </Card>
        )}

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
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(parseISO(payment.payment_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {payment.transactions ? (
                            <div className="font-medium">{payment.transactions.description}</div>
                          ) : (
                            <span className="text-muted-foreground">Manual Entry</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {payment.notes || '—'}
                        </TableCell>
                        <TableCell className="text-right">
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This action cannot be undone.
              {deletingPayment?.transaction_id && (
                <div className="mt-2 text-destructive font-medium">
                  Note: This payment is linked to a transaction. Please delete the transaction from the account page instead.
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
