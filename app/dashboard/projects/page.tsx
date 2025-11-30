'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useHousehold } from '@/lib/household-context';
import { useSubscription } from '@/lib/subscription-context';
import { supabase } from '@/lib/supabase';
import { SavingsProject, ProjectType, Account } from '@/lib/types';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Target, TrendingUp, Calendar, Trash2, Crown, Pencil, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();
  const { tier } = useSubscription();
  const [projects, setProjects] = useState<SavingsProject[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<SavingsProject | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<SavingsProject | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_type: 'vacation' as ProjectType,
    goal_amount: '',
    target_date: '',
    primary_account_id: '',
    notes: '',
  });

  useEffect(() => {
    if (currentHousehold) {
      fetchProjects();
      fetchAccounts();
    }
  }, [currentHousehold]);

  const fetchProjects = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('savings_projects')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    if (!currentHousehold) return;

    try {
      // Load regular accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('name');

      if (accountsError) throw accountsError;

      // Load Plaid accounts
      const { data: plaidAccountsData, error: plaidError } = await supabase
        .from('plaid_accounts')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('name');

      if (plaidError) throw plaidError;

      // Combine both account types
      const allAccounts = [
        ...(accountsData || []),
        ...(plaidAccountsData || []),
      ];

      setAccounts(allAccounts);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHousehold || !user) return;

    setCreating(true);
    try {
      const projectData = {
        household_id: currentHousehold.id,
        created_by: user.id,
        name: formData.name,
        description: formData.description,
        project_type: formData.project_type,
        goal_amount_cents: Math.round(parseFloat(formData.goal_amount) * 100),
        target_date: formData.target_date || null,
        primary_account_id: formData.primary_account_id || null,
        notes: formData.notes,
      };

      if (editingProject) {
        const { error } = await supabase
          .from('savings_projects')
          .update(projectData)
          .eq('id', editingProject.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('savings_projects')
          .insert(projectData);

        if (error) throw error;
      }

      setFormData({
        name: '',
        description: '',
        project_type: 'vacation',
        goal_amount: '',
        target_date: '',
        primary_account_id: '',
        notes: '',
      });
      setEditingProject(null);
      setDialogOpen(false);
      await fetchProjects();
    } catch (error: any) {
      console.error('Error saving project:', error);
      alert(error.message || 'Failed to save project');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (project: SavingsProject) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      project_type: project.project_type,
      goal_amount: (project.goal_amount_cents / 100).toString(),
      target_date: project.target_date || '',
      primary_account_id: project.primary_account_id || '',
      notes: project.notes,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;

    try {
      const { error } = await supabase
        .from('savings_projects')
        .delete()
        .eq('id', projectToDelete.id);

      if (error) throw error;
      await fetchProjects();
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      project_type: 'vacation',
      goal_amount: '',
      target_date: '',
      primary_account_id: '',
      notes: '',
    });
  };

  const getProgressPercentage = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  const getProjectTypeLabel = (type: ProjectType) => {
    const labels: Record<ProjectType, string> = {
      vacation: 'Vacation',
      purchase: 'Purchase',
      emergency_fund: 'Emergency Fund',
      education: 'Education',
      home: 'Home',
      vehicle: 'Vehicle',
      custom: 'Custom',
    };
    return labels[type];
  };

  if (!tier?.features.projects_savings_tracking) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Alert className="border-primary/20 bg-primary/5">
          <Crown className="h-4 w-4 text-primary" />
          <AlertDescription>
            <div className="font-semibold mb-2">Elite Feature</div>
            Projects & Plans tracking is an Elite tier feature. Upgrade to Elite to access this powerful tool for tracking your savings goals, vacations, and major purchases.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progressBarStyle = (progress: number) => ({
    width: `${progress}%`,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Projects & Plans</h1>
            <p className="text-muted-foreground">
              Track your savings goals, vacations, and major purchases
            </p>
          </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleDialogClose()}>
              <Plus className="h-4 w-4 mr-2" />
              New Project/Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Edit Project/Plan' : 'Create New Project/Plan'}</DialogTitle>
              <DialogDescription>
                Set up a new savings goal to track your progress
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Project/Plan Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Hawaii Vacation"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="project_type">Type</Label>
                    <Select
                      value={formData.project_type}
                      onValueChange={(value) => setFormData({ ...formData, project_type: value as ProjectType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vacation">Vacation</SelectItem>
                        <SelectItem value="purchase">Purchase</SelectItem>
                        <SelectItem value="emergency_fund">Emergency Fund</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="vehicle">Vehicle</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of your project"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="goal_amount">Goal Amount ($)</Label>
                    <Input
                      id="goal_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.goal_amount}
                      onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
                      placeholder="5000.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="target_date">Target Date (Optional)</Label>
                    <Input
                      id="target_date"
                      type="date"
                      value={formData.target_date}
                      onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="primary_account_id">Link to Bank Account (Optional)</Label>
                  <Select
                    value={formData.primary_account_id || undefined}
                    onValueChange={(value) => setFormData({ ...formData, primary_account_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {accounts.map((account) => {
                        const balance = (account as any).balance ?? (account as any).current_balance ?? 0;
                        return (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} - {formatCurrency(balance)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Link an account for reference in budgets and savings plans
                  </p>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional details, links, or notes about this project"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    editingProject ? 'Update Project/Plan' : 'Create Project/Plan'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects or plans yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first project or plan to start tracking your goals
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project/Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const progress = getProgressPercentage(project.current_amount_cents, project.goal_amount_cents);
            const remaining = project.goal_amount_cents - project.current_amount_cents;

            return (
              <Card
                key={project.id}
                className={`cursor-pointer transition-shadow hover:shadow-lg ${project.is_completed ? 'border-green-500' : ''}`}
                onClick={() => router.push(`/dashboard/projects/${project.id}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline">{getProjectTypeLabel(project.project_type)}</Badge>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(project)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setProjectToDelete(project);
                        setDeleteDialogOpen(true);
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  {project.description && (
                    <CardDescription>{project.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-semibold">
                          {formatCurrency(project.current_amount_cents / 100)}
                        </span>
                        <span className="text-muted-foreground">
                          {formatCurrency(project.goal_amount_cents / 100)}
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary transition-all"
                          style={progressBarStyle(progress)}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {progress.toFixed(1)}% complete
                      </p>
                    </div>

                    {remaining > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {formatCurrency(remaining / 100)} remaining
                        </span>
                      </div>
                    )}

                    {project.target_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Target: {new Date(project.target_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {project.primary_account_id && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Linked Account: {accounts.find(a => a.id === project.primary_account_id)?.name || 'Unknown'}
                        </span>
                      </div>
                    )}

                    {project.is_completed && (
                      <Badge className="w-full justify-center bg-green-500">
                        Goal Achieved!
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
