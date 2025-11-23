'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckSquare, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useHousehold } from '@/lib/household-context';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ChoreAssignments } from '@/components/chore-assignments';
import { ChoreLeaderboard } from '@/components/chore-leaderboard';
import { RewardsShop } from '@/components/rewards-shop';

interface Chore {
  id: string;
  household_id: string;
  name: string;
  description: string | null;
  points: number;
  frequency: string;
  difficulty: string;
  category: string;
}

export default function ChoresPage() {
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [chores, setChores] = useState<Chore[]>([]);
  const [choreDialogOpen, setChoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [choreToDelete, setChoreToDelete] = useState<string | null>(null);

  const [members, setMembers] = useState<any[]>([]);
  const [choreForm, setChoreForm] = useState({
    name: '',
    description: '',
    points: 10,
    frequency: 'once',
    difficulty: 'medium',
    category: 'other',
    assign_immediately: false,
    assigned_to: '',
    due_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (currentHousehold) {
      loadChores();
      loadMembers();
    }
  }, [currentHousehold]);

  const loadChores = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('name');

      if (error) throw error;
      setChores(data || []);
    } catch (error: any) {
      console.error('Error loading chores:', error);
    }
  };

  const loadMembers = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('id, name, color')
        .eq('household_id', currentHousehold.id)
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error('Error loading members:', error);
    }
  };

  const handleOpenChoreDialog = () => {
    setChoreForm({
      name: '',
      description: '',
      points: 10,
      frequency: 'once',
      difficulty: 'medium',
      category: 'other',
      assign_immediately: false,
      assigned_to: '',
      due_date: new Date().toISOString().split('T')[0],
    });
    setChoreDialogOpen(true);
  };

  const handleSaveChore = async () => {
    if (!currentHousehold) return;

    if (!choreForm.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a chore name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: choreData, error: choreError } = await supabase
        .from('chores')
        .insert({
          household_id: currentHousehold.id,
          name: choreForm.name.trim(),
          description: choreForm.description.trim() || null,
          points: choreForm.points,
          frequency: choreForm.frequency,
          difficulty: choreForm.difficulty,
          category: choreForm.category,
        })
        .select()
        .single();

      if (choreError) throw choreError;

      if (choreForm.assign_immediately) {
        const assignedTo = choreForm.assigned_to === 'open' ? null : choreForm.assigned_to || null;

        console.log('Creating assignment:', {
          household_id: currentHousehold.id,
          chore_id: choreData.id,
          assigned_to: assignedTo,
          due_date: choreForm.due_date,
          completed: false,
        });

        const { data: assignData, error: assignError } = await supabase
          .from('chore_assignments')
          .insert({
            household_id: currentHousehold.id,
            chore_id: choreData.id,
            assigned_to: assignedTo,
            due_date: choreForm.due_date,
            completed: false,
          })
          .select();

        if (assignError) {
          console.error('Assignment error:', assignError);
          throw assignError;
        }
        console.log('Assignment created:', assignData);
      }

      toast({
        title: 'Success',
        description: choreForm.assign_immediately
          ? 'Chore created and assigned successfully'
          : 'Chore created successfully',
      });

      setChoreDialogOpen(false);
      loadChores();
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save chore',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeleteDialog = (choreId: string) => {
    setChoreToDelete(choreId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteChore = async () => {
    if (!choreToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('chores')
        .delete()
        .eq('id', choreToDelete);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Chore deleted successfully',
      });

      loadChores();
      setRefreshKey(prev => prev + 1);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete chore',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setChoreToDelete(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      cleaning: '🧹',
      dishes: '🍽️',
      laundry: '🧺',
      pets: '🐾',
      yard: '🌱',
      other: '📋',
    };
    return icons[category] || '📋';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Chores & Rewards</h1>
            <p className="text-muted-foreground">Manage household chores</p>
          </div>
          <Button onClick={handleOpenChoreDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Chore
          </Button>
        </div>

        {currentHousehold && (
          <>
            <ChoreLeaderboard
              householdId={currentHousehold.id}
              refreshKey={refreshKey}
            />

            <ChoreAssignments
              householdId={currentHousehold.id}
              chores={chores}
              refreshKey={refreshKey}
              onDeleteChore={handleOpenDeleteDialog}
              onCoinsUpdate={() => {
                loadChores();
                setRefreshKey(prev => prev + 1);
              }}
            />

            <RewardsShop
              householdId={currentHousehold.id}
              onCoinsUpdate={() => {
                setRefreshKey(prev => prev + 1);
              }}
            />
          </>
        )}
      </div>

      <Dialog open={choreDialogOpen} onOpenChange={setChoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Chore</DialogTitle>
            <DialogDescription>Create a new chore with coins and difficulty</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="chore-name">Chore Name</Label>
              <Input
                id="chore-name"
                value={choreForm.name}
                onChange={(e) => setChoreForm({ ...choreForm, name: e.target.value })}
                placeholder="e.g., Wash the dishes"
              />
            </div>
            <div>
              <Label htmlFor="chore-description">Description (optional)</Label>
              <Textarea
                id="chore-description"
                value={choreForm.description}
                onChange={(e) => setChoreForm({ ...choreForm, description: e.target.value })}
                placeholder="Additional details"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="chore-points">Coins</Label>
                <Input
                  id="chore-points"
                  type="number"
                  min={0}
                  value={choreForm.points}
                  onChange={(e) => setChoreForm({ ...choreForm, points: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="chore-difficulty">Difficulty</Label>
                <Select
                  value={choreForm.difficulty}
                  onValueChange={(value) => setChoreForm({ ...choreForm, difficulty: value })}
                >
                  <SelectTrigger id="chore-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="chore-category">Category</Label>
                <Select
                  value={choreForm.category}
                  onValueChange={(value) => setChoreForm({ ...choreForm, category: value })}
                >
                  <SelectTrigger id="chore-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleaning">🧹 Cleaning</SelectItem>
                    <SelectItem value="dishes">🍽️ Dishes</SelectItem>
                    <SelectItem value="laundry">🧺 Laundry</SelectItem>
                    <SelectItem value="pets">🐾 Pets</SelectItem>
                    <SelectItem value="yard">🌱 Yard</SelectItem>
                    <SelectItem value="other">📋 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="chore-frequency">Frequency</Label>
                <Select
                  value={choreForm.frequency}
                  onValueChange={(value) => setChoreForm({ ...choreForm, frequency: value })}
                >
                  <SelectTrigger id="chore-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="assign_immediately"
                  checked={choreForm.assign_immediately}
                  onChange={(e) => setChoreForm({ ...choreForm, assign_immediately: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="assign_immediately" className="cursor-pointer font-normal">
                  Assign this chore now
                </Label>
              </div>
              {choreForm.assign_immediately && (
                <>
                  <div>
                    <Label htmlFor="assign-to">Assign To</Label>
                    <Select
                      value={choreForm.assigned_to}
                      onValueChange={(value) => setChoreForm({ ...choreForm, assigned_to: value })}
                    >
                      <SelectTrigger id="assign-to">
                        <SelectValue placeholder="Select member or leave open" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open for Pickup (Anyone can claim)</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="due-date">Due Date</Label>
                    <Input
                      id="due-date"
                      type="date"
                      value={choreForm.due_date}
                      onChange={(e) => setChoreForm({ ...choreForm, due_date: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setChoreDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveChore} disabled={loading}>
                {loading ? 'Creating...' : 'Create Chore'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chore</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chore? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChore}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
