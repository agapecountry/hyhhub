'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Plus, Edit2, Trash2, ShoppingCart, Lock, Crown, Calendar, Receipt, ExternalLink } from 'lucide-react';
import { useHousehold } from '@/lib/household-context';
import { useSubscription } from '@/lib/subscription-context';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PaycheckPlanner } from '@/components/paycheck-planner';
import { SpendingBreakdownWidget } from '@/components/spending-breakdown-widget';
import { BudgetOverviewWidget } from '@/components/budget-overview-widget';
import { logSecurityEvent } from '@/lib/security-logger';
import { useAuth } from '@/lib/auth-context';
import { SearchableCategorySelect } from '@/components/searchable-category-select';
import { IconPicker } from '@/components/icon-picker';
import { Budget503020 } from '@/components/budget-50-30-20';
import { formatCurrency } from '@/lib/format';

interface TransactionCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

interface BudgetCategory {
  id: string;
  household_id: string;
  transaction_category_id: string;
  name: string;
  monthly_amount: number;
  due_date: number;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  category_type?: string;
  transaction_categories?: {
    name: string;
    icon: string;
    color: string;
    type: string;
  } | null;
}

interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  monthly_amount: number;
  payment_frequency: string;
  notes: string | null;
}

export default function BudgetPage() {
  const router = useRouter();
  const { currentHousehold } = useHousehold();
  const { tier, hasFeature } = useSubscription();
  const { user } = useAuth();
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [transactionCategories, setTransactionCategories] = useState<TransactionCategory[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<BudgetCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [incomeDeleteDialogOpen, setIncomeDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<IncomeSource | null>(null);
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null);

  // Always default to overview tab
  const [activeTab, setActiveTab] = useState('overview');

  const [formData, setFormData] = useState({
    transaction_category_id: '',
    monthly_amount: '',
    due_date: '31',
  });

  const [incomeFormData, setIncomeFormData] = useState({
    name: '',
    amount: '',
    payment_frequency: 'monthly',
    notes: '',
  });

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense' | 'transfer'>('expense');

  useEffect(() => {
    if (currentHousehold) {
      loadCategories();
      loadTransactionCategories();
      loadIncomeSources();
    }
  }, [currentHousehold]);

  const loadCategories = async () => {
    if (!currentHousehold) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budget_categories')
        .select(`
          *,
          transaction_categories (
            name,
            icon,
            color,
            type
          )
        `)
        .eq('household_id', currentHousehold.id)
        .eq('is_active', true)
        .order('created_at');

      if (error) throw error;

      // Transform the data to flatten the structure
      const transformedData = (data || []).map(cat => ({
        ...cat,
        name: cat.transaction_categories?.name || cat.name,
        icon: cat.transaction_categories?.icon || cat.icon,
        color: cat.transaction_categories?.color || cat.color,
        category_type: cat.transaction_categories?.type
      }));

      setCategories(transformedData);
    } catch (error: any) {
      console.error('Error loading budget categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load budget categories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionCategories = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .eq('type', 'expense')
        .order('name');

      if (error) throw error;
      setTransactionCategories(data || []);
    } catch (error: any) {
      console.error('Error loading transaction categories:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!currentHousehold || !newCategoryName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a category name',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('transaction_categories')
        .insert({
          household_id: currentHousehold.id,
          name: newCategoryName.trim(),
          type: newCategoryType,
          icon: newCategoryIcon || null,
          color: '#64748b',
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Category added successfully',
      });

      // Set the new category as selected
      setFormData({ ...formData, transaction_category_id: data.id });
      setNewCategoryName('');
      setNewCategoryIcon('');
      setShowAddCategory(false);
      await loadTransactionCategories();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add category',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      transaction_category_id: '',
      monthly_amount: '',
      due_date: '31',
    });
    setEditingCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHousehold) return;

    try {
      setLoading(true);

      const categoryData = {
        household_id: currentHousehold.id,
        transaction_category_id: formData.transaction_category_id,
        monthly_amount: parseFloat(formData.monthly_amount),
        due_date: parseInt(formData.due_date),
        is_active: true,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('budget_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Budget category updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('budget_categories')
          .insert([categoryData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Budget category created successfully',
        });
      }

      setDialogOpen(false);
      resetForm();
      loadCategories();
    } catch (error: any) {
      console.error('Error saving budget category:', error);
      toast({
        title: 'Error',
        description: 'Failed to save budget category',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: BudgetCategory) => {
    setEditingCategory(category);
    setFormData({
      transaction_category_id: category.transaction_category_id,
      monthly_amount: category.monthly_amount.toString(),
      due_date: category.due_date.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      setLoading(true);

      const categoryName = categoryToDelete.transaction_categories?.name || 'Unknown';

      const { error } = await supabase
        .from('budget_categories')
        .delete()
        .eq('id', categoryToDelete.id);

      if (error) throw error;

      if (user && currentHousehold) {
        await logSecurityEvent({
          eventType: 'data_modification',
          category: 'budget',
          severity: 'info',
          userId: user.id,
          householdId: currentHousehold.id,
          resourceType: 'budget_category',
          resourceId: categoryToDelete.id,
          action: 'delete',
          status: 'success',
          details: {
            category_name: categoryName,
            monthly_amount: categoryToDelete.monthly_amount
          },
        });
      }

      toast({
        title: 'Success',
        description: 'Budget category deleted successfully',
      });

      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      loadCategories();
    } catch (error: any) {
      console.error('Error deleting budget category:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete budget category',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadIncomeSources = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncomeSources(data || []);
    } catch (error: any) {
      console.error('Error loading income sources:', error);
    }
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!incomeFormData.name || !incomeFormData.amount) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const amount = parseFloat(incomeFormData.amount);
      const paymentsPerMonth = incomeFormData.payment_frequency === 'weekly' ? 4.33 :
                               incomeFormData.payment_frequency === 'biweekly' ? 2.17 :
                               incomeFormData.payment_frequency === 'semimonthly' ? 2 :
                               1;
      const monthlyAmount = amount * paymentsPerMonth;

      if (editingIncome) {
        const { error } = await supabase
          .from('income_sources')
          .update({
            name: incomeFormData.name,
            amount,
            payment_frequency: incomeFormData.payment_frequency,
            monthly_amount: monthlyAmount,
            notes: incomeFormData.notes || null,
          })
          .eq('id', editingIncome.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Income source updated successfully',
        });
      } else {
        const { error } = await supabase.from('income_sources').insert({
          household_id: currentHousehold?.id,
          name: incomeFormData.name,
          amount,
          payment_frequency: incomeFormData.payment_frequency,
          monthly_amount: monthlyAmount,
          notes: incomeFormData.notes || null,
          created_by: user?.id,
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Income source added successfully',
        });
      }

      setIncomeDialogOpen(false);
      resetIncomeForm();
      loadIncomeSources();
    } catch (error: any) {
      console.error('Error saving income source:', error);
      toast({
        title: 'Error',
        description: 'Failed to save income source',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetIncomeForm = () => {
    setIncomeFormData({
      name: '',
      amount: '',
      payment_frequency: 'monthly',
      notes: '',
    });
    setEditingIncome(null);
  };

  const handleEditIncome = (income: IncomeSource) => {
    setEditingIncome(income);
    setIncomeFormData({
      name: income.name,
      amount: income.amount.toString(),
      payment_frequency: income.payment_frequency,
      notes: income.notes || '',
    });
    setIncomeDialogOpen(true);
  };

  const handleDeleteIncome = async () => {
    if (!incomeToDelete) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('income_sources')
        .delete()
        .eq('id', incomeToDelete.id);

      if (error) throw error;

      if (user && currentHousehold) {
        await logSecurityEvent({
          eventType: 'data_modification',
          category: 'budget',
          severity: 'info',
          userId: user.id,
          householdId: currentHousehold.id,
          resourceType: 'income_source',
          resourceId: incomeToDelete.id,
          action: 'delete',
          status: 'success',
          details: {
            income_name: incomeToDelete.name,
            monthly_amount: incomeToDelete.monthly_amount
          },
        });
      }

      toast({
        title: 'Success',
        description: 'Income source deleted successfully',
      });

      setIncomeDeleteDialogOpen(false);
      setIncomeToDelete(null);
      loadIncomeSources();
    } catch (error: any) {
      console.error('Error deleting income source:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete income source',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalBudget = categories.reduce((sum, cat) => sum + cat.monthly_amount, 0);
  const totalIncome = incomeSources.reduce((sum, source) => sum + source.monthly_amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Budget</h1>
            <p className="text-muted-foreground">Plan your paychecks and budget household expenses.</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Budget Overview</TabsTrigger>
            <TabsTrigger value="income-expenses">Income & Expenses</TabsTrigger>
            <TabsTrigger value="50-30-20">50/30/20 Rule</TabsTrigger>
            <TabsTrigger value="paycheck">Paycheck Planner</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <SpendingBreakdownWidget />
            <BudgetOverviewWidget />
          </TabsContent>

          <TabsContent value="income-expenses" className="space-y-6 mt-6">
            {hasFeature('paycheck_planner') && (
              <Card className="border-slate-200 bg-slate-50/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Crown className="h-5 w-5 text-slate-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-slate-900">Elite Feature Available</h3>
                      <p className="text-sm text-slate-700 mt-1">
                        You have access to the advanced Paycheck Planner! Use the Paycheck Planner tab for detailed income tracking with automatic bill scheduling. If you use the Paycheck Planner, you do not need to add income sources here.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Income Sources</h2>
                <p className="text-muted-foreground">Track your monthly income sources.</p>
              </div>
              <Dialog open={incomeDialogOpen} onOpenChange={(open) => {
                setIncomeDialogOpen(open);
                if (!open) resetIncomeForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Income Source
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingIncome ? 'Edit' : 'Add'} Income Source</DialogTitle>
                    <DialogDescription>
                      Add a monthly income source like salary, side gig, or other income
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleIncomeSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="income-name">Name</Label>
                      <Input
                        id="income-name"
                        placeholder="e.g., John's Salary"
                        value={incomeFormData.name}
                        onChange={(e) => setIncomeFormData({ ...incomeFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="income-frequency">Payment Frequency</Label>
                      <Select
                        value={incomeFormData.payment_frequency}
                        onValueChange={(value) => setIncomeFormData({ ...incomeFormData, payment_frequency: value })}
                      >
                        <SelectTrigger id="income-frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-Weekly (Every 2 weeks)</SelectItem>
                          <SelectItem value="semimonthly">Semi-Monthly (Twice a month)</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="income-amount">Amount Per Payment</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="income-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="pl-9"
                          value={incomeFormData.amount}
                          onChange={(e) => setIncomeFormData({ ...incomeFormData, amount: e.target.value })}
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {incomeFormData.amount && parseFloat(incomeFormData.amount) > 0 ? (
                          <>
                            Monthly: ${(parseFloat(incomeFormData.amount) * (
                              incomeFormData.payment_frequency === 'weekly' ? 4.33 :
                              incomeFormData.payment_frequency === 'biweekly' ? 2.17 :
                              incomeFormData.payment_frequency === 'semimonthly' ? 2 :
                              1
                            ))}
                          </>
                        ) : (
                          'Enter amount to see monthly calculation'
                        )}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="income-notes">Notes (Optional)</Label>
                      <Input
                        id="income-notes"
                        placeholder="Additional details"
                        value={incomeFormData.notes}
                        onChange={(e) => setIncomeFormData({ ...incomeFormData, notes: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? 'Saving...' : editingIncome ? 'Update' : 'Add'} Income Source
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIncomeDialogOpen(false);
                          resetIncomeForm();
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Total Monthly Income: {formatCurrency(totalIncome)}</span>
                </CardTitle>
                <CardDescription>
                  Manage your income sources for budget tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                {incomeSources.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No income sources yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Add your income sources to see accurate budget calculations
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incomeSources.map((income) => (
                      <div
                        key={income.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                            <div>
                              <div className="font-semibold">{income.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {formatCurrency(income.amount)} / {
                                  income.payment_frequency === 'weekly' ? 'week' :
                                  income.payment_frequency === 'biweekly' ? 'bi-weekly' :
                                  income.payment_frequency === 'semimonthly' ? 'semi-monthly' :
                                  'month'
                                }
                              </div>
                              {income.notes && (
                                <div className="text-sm text-muted-foreground">{income.notes}</div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-emerald-600">{formatCurrency(income.monthly_amount)}</div>
                            <div className="text-xs text-muted-foreground">per month</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditIncome(income)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setIncomeToDelete(income);
                                setIncomeDeleteDialogOpen(true);
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

            {/* Household Expenses Section */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Household Expenses</h2>
                <p className="text-muted-foreground">Budget for your household expenses.</p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit' : 'Add'} Budget Category</DialogTitle>
                <DialogDescription>
                  Create a category for monthly expenses like groceries, gas, or fun money
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  {showAddCategory ? (
                    <div className="space-y-2 p-4 border rounded-lg">
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
                    <SearchableCategorySelect
                      categories={transactionCategories}
                      value={formData.transaction_category_id}
                      onValueChange={(value) => setFormData({ ...formData, transaction_category_id: value })}
                      placeholder="Select a category"
                      allowNone={false}
                      onAddNew={() => setShowAddCategory(true)}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Choose from your expense categories
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_amount">Monthly Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="monthly_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.monthly_amount}
                      onChange={(e) => setFormData({ ...formData, monthly_amount: e.target.value })}
                      placeholder="0.00"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date (Day of Month)</Label>
                  <Input
                    id="due_date"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Default is 15th for scheduling in paycheck planner
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Total Expenses Budget</CardTitle>
            <CardDescription>Sum of all budgeted expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(totalBudget)}</div>
          </CardContent>
        </Card>

        {categories.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No budget categories yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create categories to track your monthly expenses
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Category
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              return (
                <Card key={category.id} className="relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 w-1 h-full opacity-60"
                    style={{ backgroundColor: category.color || '#64748b' }}
                  />
                  <CardHeader className="pl-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg text-2xl opacity-80"
                          style={{ backgroundColor: `${category.color}15` || '#64748b15' }}
                        >
                          {category.icon || '📌'}
                        </div>
                        <div>
                          <CardTitle className="text-base">{category.name}</CardTitle>
                          <CardDescription className="text-xs">
                            Due: {category.due_date}th of each month
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCategoryToDelete(category);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pl-6">
                    <div className="text-2xl font-bold">{formatCurrency(category.monthly_amount)}</div>
                    <p className="text-xs text-muted-foreground">per month</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
          </TabsContent>

          <TabsContent value="50-30-20" className="space-y-6 mt-6">
            {hasFeature('paycheck_planner') ? (
              <Budget503020 />
            ) : (
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <CardTitle>Elite Feature</CardTitle>
                  </div>
                  <CardDescription>
                    Upgrade to Elite to access the 50/30/20 Budget Calculator
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      The 50/30/20 Budget Calculator helps you:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <DollarSign className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Allocate 50% of income to needs, 30% to wants, 20% to savings</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Calculate emergency fund timeline (3 months income)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Receipt className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Project debt payoff timelines for credit cards and loans</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ShoppingCart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Track net worth (assets minus liabilities)</span>
                      </li>
                    </ul>
                  </div>
                  <Button
                    onClick={() => router.push('/dashboard/subscription')}
                    className="w-full"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Elite
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="paycheck" className="space-y-6 mt-6">
            {hasFeature('paycheck_planner') ? (
              <PaycheckPlanner />
            ) : (
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <CardTitle>Premium Feature</CardTitle>
                  </div>
                  <CardDescription>
                    Upgrade to Premium or Elite to access the Paycheck Planner
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      The Paycheck Planner helps you:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Schedule bills and payments across multiple paychecks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <DollarSign className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Track remaining funds after scheduled payments</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Receipt className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Optimize debt payments with avalanche or snowball strategies</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <ShoppingCart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>Plan budget allocations for the next 3 months</span>
                      </li>
                    </ul>
                  </div>
                  <Button
                    onClick={() => router.push('/dashboard/subscription')}
                    className="w-full"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {categoryToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={incomeDeleteDialogOpen} onOpenChange={setIncomeDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Income Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {incomeToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIncomeToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIncome}
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
