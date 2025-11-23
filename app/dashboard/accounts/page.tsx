'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, RefreshCw, Trash2, CircleAlert as AlertCircle, Link2, Wallet, Landmark, CreditCard, Lock, Crown, Receipt, Calendar, DollarSign, Edit, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useHousehold } from '@/lib/household-context';
import { useSubscription } from '@/lib/subscription-context';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import { PageHelpDialog } from '@/components/page-help-dialog';
import { pageHelpContent } from '@/lib/page-help-content';
import { PlaidLinkButton } from '@/components/plaid-link-button';

interface ManualAccount {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  account_number_last4: string | null;
  balance: number;
  color: string;
  is_active: boolean;
  source: 'manual';
}

interface PlaidAccount {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  mask: string | null;
  balance?: number;
  current_balance: number;
  available_balance: number | null;
  is_active: boolean;
  plaid_item_id: string;
  source: 'plaid';
}

interface PlaidItem {
  id: string;
  institution_name: string;
  status: string;
  last_synced_at: string | null;
}

type UnifiedAccount = ManualAccount | PlaidAccount;

interface Bill {
  id: string;
  household_id: string;
  company: string;
  account_number: string | null;
  due_date: number;
  frequency: 'monthly' | 'yearly' | 'quarterly' | 'biannual';
  amount: number;
  category_id: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  category?: {
    id: string;
    name: string;
    icon: string | null;
    color: string;
  };
}

interface TransactionCategory {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string;
}

export default function AccountsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();
  const { tier, hasFeature, canAddPlaidConnection, plaidConnections } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<UnifiedAccount[]>([]);
  const [plaidItems, setPlaidItems] = useState<Map<string, PlaidItem>>(new Map());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'checking' as 'checking' | 'savings' | 'credit',
    institution: '',
    account_number_last4: '',
    current_balance: '',
    color: '#3b82f6',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<UnifiedAccount | null>(null);

  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [billForm, setBillForm] = useState({
    company: '',
    account_number: '',
    due_date: '1',
    frequency: 'monthly' as 'monthly' | 'yearly' | 'quarterly' | 'biannual',
    amount: '',
    category_id: '',
    notes: '',
  });
  const [deleteBillDialogOpen, setDeleteBillDialogOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);

  useEffect(() => {
    if (currentHousehold) {
      loadAllAccounts();
      loadBills();
      loadCategories();
    }
  }, [currentHousehold]);

  const loadAllAccounts = async () => {
    if (!currentHousehold) return;

    try {
      const [manualResult, plaidAccountsResult, plaidItemsResult] = await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('household_id', currentHousehold.id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('plaid_accounts')
          .select('*')
          .eq('household_id', currentHousehold.id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('plaid_items')
          .select('id, institution_name, status, last_synced_at')
          .eq('household_id', currentHousehold.id)
      ]);

      if (manualResult.error) {
        console.error('Error loading manual accounts:', manualResult.error);
        throw manualResult.error;
      }
      if (plaidAccountsResult.error) {
        console.error('Error loading plaid accounts:', plaidAccountsResult.error);
        throw plaidAccountsResult.error;
      }
      if (plaidItemsResult.error) {
        console.error('Error loading plaid items:', plaidItemsResult.error);
        throw plaidItemsResult.error;
      }

      console.log('Manual accounts loaded:', manualResult.data?.length || 0);
      console.log('Plaid accounts loaded:', plaidAccountsResult.data?.length || 0);

      const itemsMap = new Map(
        (plaidItemsResult.data || []).map(item => [item.id, item])
      );
      setPlaidItems(itemsMap);

      const manualAccounts: ManualAccount[] = (manualResult.data || []).map(acc => ({
        ...acc,
        source: 'manual' as const
      }));

      const plaidAccounts: PlaidAccount[] = (plaidAccountsResult.data || []).map(acc => ({
        ...acc,
        source: 'plaid' as const
      }));

      const combined = [...manualAccounts, ...plaidAccounts].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setAccounts(combined);
    } catch (error: any) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleRefreshAccounts = async (itemId: string) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-sync-accounts`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Success',
        description: `Synced ${result.accounts_updated} account(s)`,
      });

      await loadAllAccounts();
    } catch (error: any) {
      console.error('Error refreshing accounts:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to refresh accounts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualAccount = () => {
    setAddDialogOpen(true);
  };

  const handleSubmitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHousehold) return;

    setLoading(true);
    try {
      console.log('Attempting to insert account for household:', currentHousehold.id);
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          household_id: currentHousehold.id,
          name: accountForm.name,
          type: accountForm.type,
          balance: parseFloat(accountForm.current_balance) || 0,
          institution: accountForm.institution || null,
          account_number_last4: accountForm.account_number_last4 || null,
          color: accountForm.color,
          is_active: true,
        })
        .select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      console.log('Account inserted successfully:', data);

      toast({
        title: 'Success',
        description: 'Account created successfully',
      });

      setAccountForm({
        name: '',
        type: 'checking',
        institution: '',
        account_number_last4: '',
        current_balance: '',
        color: '#3b82f6',
      });
      setAddDialogOpen(false);

      console.log('Reloading accounts...');
      await loadAllAccounts();
      console.log('Accounts reloaded');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;

    setLoading(true);
    try {
      const table = accountToDelete.source === 'manual' ? 'accounts' : 'plaid_accounts';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', accountToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Account deleted successfully',
      });

      loadAllAccounts();
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBills = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          category:transaction_categories(id, name, icon, color)
        `)
        .eq('household_id', currentHousehold.id)
        .eq('is_active', true)
        .order('due_date');

      if (error) throw error;
      setBills(data || []);
    } catch (error: any) {
      console.error('Error loading bills:', error);
    }
  };

  const loadCategories = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .eq('type', 'expense')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error loading categories:', error);
    }
  };


  const handleSaveBill = async () => {
    if (!currentHousehold) return;

    const amount = parseFloat(billForm.amount);
    const dueDate = parseInt(billForm.due_date);

    if (!billForm.company.trim() || !billForm.category_id || isNaN(amount) || amount <= 0 || isNaN(dueDate) || dueDate < 1 || dueDate > 31) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (editingBill) {
        const { error } = await supabase
          .from('bills')
          .update({
            company: billForm.company.trim(),
            account_number: billForm.account_number.trim() || null,
            due_date: dueDate,
            frequency: billForm.frequency,
            amount,
            category_id: billForm.category_id,
            notes: billForm.notes.trim() || null,
          })
          .eq('id', editingBill.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Bill updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('bills')
          .insert({
            household_id: currentHousehold.id,
            company: billForm.company.trim(),
            account_number: billForm.account_number.trim() || null,
            due_date: dueDate,
            frequency: billForm.frequency,
            amount,
            category_id: billForm.category_id,
            notes: billForm.notes.trim() || null,
            created_by: user.id,
          });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Bill added successfully',
        });
      }

      setBillForm({
        company: '',
        account_number: '',
        due_date: '1',
        frequency: 'monthly',
        amount: '',
        category_id: '',
        notes: '',
      });
      setEditingBill(null);
      setBillDialogOpen(false);
      loadBills();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save bill',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setBillForm({
      company: bill.company,
      account_number: bill.account_number || '',
      due_date: bill.due_date.toString(),
      frequency: bill.frequency,
      amount: bill.amount.toString(),
      category_id: bill.category_id,
      notes: bill.notes || '',
    });
    setBillDialogOpen(true);
  };

  const handleDeleteBill = async () => {
    if (!billToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', billToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Bill deleted successfully',
      });

      loadBills();
      setDeleteBillDialogOpen(false);
      setBillToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete bill',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      monthly: 'Monthly',
      yearly: 'Yearly',
      quarterly: 'Quarterly',
      biannual: 'Biannual',
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };


  const getAccountIcon = (account: UnifiedAccount) => {
    const type = account.type.toLowerCase();
    if (type.includes('credit')) return <CreditCard className="h-5 w-5" />;
    if (type.includes('deposit') || type.includes('checking') || type.includes('savings')) {
      return <Landmark className="h-5 w-5" />;
    }
    return <Wallet className="h-5 w-5" />;
  };

  const getInstitutionName = (account: UnifiedAccount): string | null => {
    if (account.source === 'manual') {
      return account.institution;
    } else {
      const item = plaidItems.get(account.plaid_item_id);
      return item?.institution_name || null;
    }
  };

  const getAccountMask = (account: UnifiedAccount): string | null => {
    if (account.source === 'manual') {
      return account.account_number_last4;
    } else {
      return account.mask;
    }
  };

  if (!currentHousehold) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Please select a household</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Accounts</h1>
            <p className="text-muted-foreground">Manage all your accounts in one place</p>
          </div>
          <PageHelpDialog content={pageHelpContent.accounts} />
          <div className="flex gap-2">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manual
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Manual Account</DialogTitle>
                  <DialogDescription>
                    Create a new manually tracked account
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitAccount}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Account Name</Label>
                      <Input
                        id="name"
                        value={accountForm.name}
                        onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                        placeholder="e.g., Chase Checking"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Account Type</Label>
                      <Select
                        value={accountForm.type}
                        onValueChange={(value: 'checking' | 'savings' | 'credit') => setAccountForm({ ...accountForm, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checking">Checking</SelectItem>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="credit">Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="institution">Institution (Optional)</Label>
                      <Input
                        id="institution"
                        value={accountForm.institution}
                        onChange={(e) => setAccountForm({ ...accountForm, institution: e.target.value })}
                        placeholder="e.g., Chase Bank"
                      />
                    </div>
                    <div>
                      <Label htmlFor="account_number_last4">Last 4 Digits (Optional)</Label>
                      <Input
                        id="account_number_last4"
                        value={accountForm.account_number_last4}
                        onChange={(e) => setAccountForm({ ...accountForm, account_number_last4: e.target.value.slice(0, 4) })}
                        placeholder="1234"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="current_balance">Current Balance</Label>
                      <Input
                        id="current_balance"
                        type="number"
                        step="0.01"
                        value={accountForm.current_balance}
                        onChange={(e) => setAccountForm({ ...accountForm, current_balance: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="color">Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="color"
                          type="color"
                          value={accountForm.color}
                          onChange={(e) => setAccountForm({ ...accountForm, color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          value={accountForm.color}
                          onChange={(e) => setAccountForm({ ...accountForm, color: e.target.value })}
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Creating...' : 'Create Account'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            {!hasFeature('plaid_enabled') ? (
              <Button disabled>
                <Lock className="h-4 w-4 mr-2" />
                Link Bank
              </Button>
            ) : !canAddPlaidConnection() ? (
              <Button disabled>
                <Lock className="h-4 w-4 mr-2" />
                Limit Reached
              </Button>
            ) : user && currentHousehold ? (
              <PlaidLinkButton
                householdId={currentHousehold.id}
                userId={user.id}
                onSuccess={loadAllAccounts}
              />
            ) : null}
          </div>
        </div>

        {tier && (
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-primary">{tier.display_name} Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {tier.name === 'free' ? (
                        'Manual account tracking only'
                      ) : (
                        <>
                          {plaidConnections.filter(c => c.status === 'active').length} / {tier.features.plaid_connection_limit} bank connections
                          {tier.features.auto_refresh_accounts && ' • Auto-refresh on page load'}
                          {tier.features.auto_refresh_loans && ' • Includes loans'}
                          {!tier.features.auto_refresh_accounts && tier.features.manual_refresh_accounts && ' • Manual refresh only'}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                {tier.name === 'free' && (
                  <Button variant="outline" size="sm">
                    Upgrade for Bank Linking
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}


        {accounts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No accounts yet</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={handleAddManualAccount}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manual Account
                </Button>
                {user && currentHousehold && hasFeature('plaid_enabled') && canAddPlaidConnection() && (
                  <PlaidLinkButton
                    householdId={currentHousehold.id}
                    userId={user.id}
                    onSuccess={loadAllAccounts}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const institution = getInstitutionName(account);
              const mask = getAccountMask(account);
              const isLinked = account.source === 'plaid';

              return (
                <Card
                  key={account.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/accounts/${account.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 rounded-lg bg-primary/10">
                          {getAccountIcon(account)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{account.name}</h3>
                            {isLinked ? (
                              <Badge variant="secondary" className="text-xs">
                                <Link2 className="h-3 w-3 mr-1" />
                                Linked
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Manual
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            {institution && <span>{institution}</span>}
                            {mask && (
                              <>
                                {institution && <span>•</span>}
                                <span>••••{mask}</span>
                              </>
                            )}
                            {account.source === 'plaid' && account.subtype && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{account.subtype}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${account.source === 'plaid' ? account.current_balance?.toFixed(2) || '0.00' : account.balance?.toFixed(2) || '0.00'}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {account.type}
                          </div>
                        </div>
                        {isLinked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRefreshAccounts(account.plaid_item_id);
                            }}
                            disabled={loading}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAccountToDelete(account);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Bills
                </CardTitle>
                <CardDescription>Track recurring bills and payment due dates</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingBill(null);
                  setBillForm({
                    company: '',
                    account_number: '',
                    due_date: '1',
                    frequency: 'monthly',
                    amount: '',
                    category_id: '',
                    notes: '',
                  });
                  setBillDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Bill
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No bills added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                          <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <button
                              onClick={() => router.push(`/dashboard/bills/${bill.id}`)}
                              className="font-semibold hover:text-primary transition-colors cursor-pointer flex items-center gap-2"
                            >
                              {bill.company}
                              <ExternalLink className="h-4 w-4" />
                            </button>
                            {bill.category && (
                              <Badge variant="outline" className="text-xs" style={{ borderColor: bill.category.color }}>
                                {bill.category.icon && <span className="mr-1">{bill.category.icon}</span>}
                                {bill.category.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {bill.due_date}{bill.due_date === 1 ? 'st' : bill.due_date === 2 ? 'nd' : bill.due_date === 3 ? 'rd' : 'th'} of month
                            </span>
                            <span>•</span>
                            <span>{getFrequencyLabel(bill.frequency)}</span>
                            {bill.account_number && (
                              <>
                                <span>•</span>
                                <span>Acct: {bill.account_number}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xl font-bold">${bill.amount.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{getFrequencyLabel(bill.frequency)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditBill(bill)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setBillToDelete(bill);
                            setDeleteBillDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Types</CardTitle>
            <CardDescription>Manage both manually tracked and bank-linked accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Wallet className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Manual Accounts</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track cash, wallets, or accounts you prefer to manage manually
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Link2 className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Linked Accounts</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically sync with 12,000+ banks via Plaid integration
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBill ? 'Edit Bill' : 'Add Bill'}</DialogTitle>
            <DialogDescription>
              {editingBill ? 'Update bill information' : 'Add a new recurring bill to track'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <Input
                id="company"
                placeholder="Electric Company, Netflix, etc."
                value={billForm.company}
                onChange={(e) => setBillForm({ ...billForm, company: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number (Optional)</Label>
              <Input
                id="account_number"
                placeholder="Account or reference number"
                value={billForm.account_number}
                onChange={(e) => setBillForm({ ...billForm, account_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={billForm.category_id}
                onValueChange={(value) => setBillForm({ ...billForm, category_id: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span className="flex items-center gap-2">
                        {category.icon && <span>{category.icon}</span>}
                        {category.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date (Day of Month) *</Label>
                <Select
                  value={billForm.due_date}
                  onValueChange={(value) => setBillForm({ ...billForm, due_date: value })}
                >
                  <SelectTrigger id="due_date">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Select
                  value={billForm.frequency}
                  onValueChange={(value) => setBillForm({ ...billForm, frequency: value as any })}
                >
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="biannual">Biannual</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-9"
                  value={billForm.amount}
                  onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Additional information"
                value={billForm.notes}
                onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBill} disabled={loading}>
              {editingBill ? 'Update' : 'Add'} Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteBillDialogOpen} onOpenChange={setDeleteBillDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{billToDelete?.company}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBill} disabled={loading}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{accountToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} disabled={loading}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
