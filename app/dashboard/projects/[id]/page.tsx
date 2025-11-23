'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useHousehold } from '@/lib/household-context';
import { supabase } from '@/lib/supabase';
import { SavingsProject, Account, ProjectTransaction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Plus, ExternalLink, Trash2, Calendar, DollarSign, TrendingUp, Pencil, Link as LinkIcon } from 'lucide-react';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();
  const [project, setProject] = useState<SavingsProject | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<ProjectTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<number | null>(null);

  const [linkForm, setLinkForm] = useState({ title: '', url: '' });
  const [transactionForm, setTransactionForm] = useState({
    amount: '',
    transaction_type: 'deposit' as 'deposit' | 'withdrawal',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    selected_account_id: '',
    create_account_transaction: false,
  });
  const [notesForm, setNotesForm] = useState('');

  useEffect(() => {
    if (params.id && currentHousehold) {
      fetchProjectDetails();
    }
  }, [params.id, currentHousehold]);

  const fetchProjectDetails = async () => {
    if (!params.id || !currentHousehold) return;

    try {
      const { data: projectData, error: projectError } = await supabase
        .from('savings_projects')
        .select('*')
        .eq('id', params.id)
        .eq('household_id', currentHousehold.id)
        .maybeSingle();

      if (projectError) throw projectError;
      if (!projectData) {
        router.push('/dashboard/projects');
        return;
      }

      setProject(projectData);
      setNotesForm(projectData.notes || '');

      if (projectData.primary_account_id) {
        const { data: accountData } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', projectData.primary_account_id)
          .maybeSingle();

        if (accountData) {
          setAccount(accountData);
        }
      }

      const { data: transactionsData } = await supabase
        .from('project_transactions')
        .select('*')
        .eq('project_id', params.id)
        .order('transaction_date', { ascending: false });

      if (transactionsData) {
        setTransactions(transactionsData);
      }

      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('name');

      if (accountsData) {
        setAccounts(accountsData);
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !linkForm.title || !linkForm.url) return;

    try {
      const updatedLinks = [...(project.related_links || []), { title: linkForm.title, url: linkForm.url }];

      const { error } = await supabase
        .from('savings_projects')
        .update({ related_links: updatedLinks })
        .eq('id', project.id);

      if (error) throw error;

      setProject({ ...project, related_links: updatedLinks });
      setLinkForm({ title: '', url: '' });
      setLinkDialogOpen(false);
    } catch (error) {
      console.error('Error adding link:', error);
    }
  };

  const handleDeleteLink = async () => {
    if (!project || linkToDelete === null) return;

    try {
      const updatedLinks = project.related_links.filter((_, i) => i !== linkToDelete);

      const { error } = await supabase
        .from('savings_projects')
        .update({ related_links: updatedLinks })
        .eq('id', project.id);

      if (error) throw error;

      setProject({ ...project, related_links: updatedLinks });
      setDeleteDialogOpen(false);
      setLinkToDelete(null);
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !user || !transactionForm.amount) return;

    if (transactionForm.create_account_transaction && !transactionForm.selected_account_id) {
      alert('Please select an account to link this transaction to.');
      return;
    }

    try {
      const accountIdToUse = transactionForm.create_account_transaction
        ? transactionForm.selected_account_id
        : project.primary_account_id;

      await supabase
        .from('project_transactions')
        .insert({
          project_id: project.id,
          account_id: accountIdToUse,
          created_by: user.id,
          amount_cents: Math.round(parseFloat(transactionForm.amount) * 100),
          transaction_type: transactionForm.transaction_type,
          description: transactionForm.description,
          transaction_date: transactionForm.transaction_date,
        });

      if (transactionForm.create_account_transaction && transactionForm.selected_account_id && currentHousehold) {
        const amountDecimal = parseFloat(transactionForm.amount);
        const multiplier = transactionForm.transaction_type === 'deposit' ? 1 : -1;

        await supabase
          .from('transactions')
          .insert({
            household_id: currentHousehold.id,
            account_id: transactionForm.selected_account_id,
            date: transactionForm.transaction_date,
            amount: amountDecimal * multiplier,
            description: transactionForm.description || `${project.name} - ${transactionForm.transaction_type}`,
          });
      }

      setTransactionForm({
        amount: '',
        transaction_type: 'deposit',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
        selected_account_id: '',
        create_account_transaction: false,
      });
      setTransactionDialogOpen(false);
      await fetchProjectDetails();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  };

  const handleUpdateNotes = async () => {
    if (!project) return;

    try {
      await supabase
        .from('savings_projects')
        .update({ notes: notesForm })
        .eq('id', project.id);

      setProject({ ...project, notes: notesForm });
      setNotesDialogOpen(false);
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const getProgressPercentage = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  const getProjectTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vacation: 'Vacation',
      purchase: 'Purchase',
      emergency_fund: 'Emergency Fund',
      education: 'Education',
      home: 'Home',
      vehicle: 'Vehicle',
      custom: 'Custom',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const progress = getProgressPercentage(project.current_amount_cents, project.goal_amount_cents);
  const remaining = project.goal_amount_cents - project.current_amount_cents;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="outline" className="mb-2">{getProjectTypeLabel(project.project_type)}</Badge>
                  <CardTitle className="text-3xl">{project.name}</CardTitle>
                  {project.description && (
                    <CardDescription className="mt-2">{project.description}</CardDescription>
                  )}
                </div>
                {project.is_completed && (
                  <Badge className="bg-green-500">Completed</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-2xl font-bold">
                    ${(project.current_amount_cents / 100).toFixed(2)}
                  </span>
                  <span className="text-lg text-muted-foreground">
                    of ${(project.goal_amount_cents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {progress.toFixed(1)}% complete
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {remaining > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="font-semibold">${(remaining / 100).toFixed(2)}</p>
                    </div>
                  </div>
                )}
                {project.target_date && (
                  <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Target Date</p>
                      <p className="font-semibold">{new Date(project.target_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>

              {account && (
                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Linked Account</p>
                    <p className="font-semibold">{account.name}</p>
                    <p className="text-sm text-muted-foreground">${account.balance.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Related Links</CardTitle>
                <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Link
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Related Link</DialogTitle>
                      <DialogDescription>
                        Add a link to a website, booking, or other resource related to this project.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddLink}>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            value={linkForm.title}
                            onChange={(e) => setLinkForm({ ...linkForm, title: e.target.value })}
                            placeholder="Hotel Booking"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="url">URL</Label>
                          <Input
                            id="url"
                            type="url"
                            value={linkForm.url}
                            onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                            placeholder="https://example.com"
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Link</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {project.related_links && project.related_links.length > 0 ? (
                <div className="space-y-2">
                  {project.related_links.map((link, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:underline flex-1"
                      >
                        <LinkIcon className="h-4 w-4" />
                        <span>{link.title}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setLinkToDelete(index);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No links added yet. Add links to websites, bookings, or resources for this project.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Notes</CardTitle>
                <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Notes
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Project Notes</DialogTitle>
                      <DialogDescription>
                        Add details, vacation plans, or any other information about this project.
                      </DialogDescription>
                    </DialogHeader>
                    <div>
                      <Textarea
                        value={notesForm}
                        onChange={(e) => setNotesForm(e.target.value)}
                        placeholder="Add notes, details, plans, etc."
                        rows={8}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateNotes}>Save Notes</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {project.notes ? (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {project.notes}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notes yet. Add notes to track details and plans for this project.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Transactions</CardTitle>
                <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Transaction</DialogTitle>
                      <DialogDescription>
                        Record a deposit or withdrawal for this project.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddTransaction}>
                      <div className="space-y-4">
                        <div>
                          <Label>Type</Label>
                          <div className="flex gap-4 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                value="deposit"
                                checked={transactionForm.transaction_type === 'deposit'}
                                onChange={() => setTransactionForm({ ...transactionForm, transaction_type: 'deposit' })}
                              />
                              <span>Deposit</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                value="withdrawal"
                                checked={transactionForm.transaction_type === 'withdrawal'}
                                onChange={() => setTransactionForm({ ...transactionForm, transaction_type: 'withdrawal' })}
                              />
                              <span>Withdrawal</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="amount">Amount ($)</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={transactionForm.amount}
                            onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                            placeholder="100.00"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="transaction_date">Date</Label>
                          <Input
                            id="transaction_date"
                            type="date"
                            value={transactionForm.transaction_date}
                            onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Input
                            id="description"
                            value={transactionForm.description}
                            onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                            placeholder="Monthly contribution"
                          />
                        </div>
                        <div className="space-y-3 pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="create_account_transaction"
                              checked={transactionForm.create_account_transaction}
                              onChange={(e) => setTransactionForm({ ...transactionForm, create_account_transaction: e.target.checked })}
                              className="h-4 w-4"
                            />
                            <Label htmlFor="create_account_transaction" className="cursor-pointer font-normal">
                              Link to account and create transaction in account history
                            </Label>
                          </div>
                          {transactionForm.create_account_transaction && (
                            <div>
                              <Label htmlFor="selected_account_id">Select Account</Label>
                              <Select
                                value={transactionForm.selected_account_id}
                                onValueChange={(value) => setTransactionForm({ ...transactionForm, selected_account_id: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose an account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                      {acc.name} (${acc.balance.toFixed(2)})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => setTransactionDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Transaction</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={transaction.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                            {transaction.transaction_type === 'deposit' ? '+' : '-'}
                            ${(transaction.amount_cents / 100).toFixed(2)}
                          </span>
                        </div>
                        {transaction.description && (
                          <p className="text-xs text-muted-foreground">{transaction.description}</p>
                        )}
                        {transaction.account_id && (
                          <p className="text-xs text-muted-foreground">
                            Linked to: {accounts.find(acc => acc.id === transaction.account_id)?.name || 'Account'}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.transaction_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No transactions yet. Add transactions to track your progress.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this link? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLink}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
