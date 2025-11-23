'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Calendar, Trash2, CheckCircle2, Coins, Hand } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

interface Chore {
  id: string;
  name: string;
  description: string | null;
  points: number;
  category: string;
  difficulty: string;
}

interface ChoreAssignment {
  id: string;
  chore_id: string;
  assigned_to: string | null;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  chores: Chore;
  assigned_member: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface HouseholdMember {
  id: string;
  name: string;
  color: string;
  current_coins: number;
}

interface ChoreAssignmentsProps {
  householdId: string;
  chores: Chore[];
  onCoinsUpdate: () => void;
  onDeleteChore: (choreId: string) => void;
  refreshKey?: number;
}

export function ChoreAssignments({ householdId, chores, onCoinsUpdate, onDeleteChore, refreshKey }: ChoreAssignmentsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<ChoreAssignment[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<ChoreAssignment | null>(null);

  const [assignForm, setAssignForm] = useState({
    assigned_to: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    loadAssignments();
    loadMembers();
  }, [householdId, refreshKey]);

  const loadAssignments = async () => {
    try {
      console.log('Loading assignments for household:', householdId);
      const { data, error } = await supabase
        .from('chore_assignments')
        .select(`
          *,
          chores(*),
          assigned_member:household_members!assigned_to(id, name, color)
        `)
        .eq('household_id', householdId)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error loading assignments:', error);
        throw error;
      }
      console.log('Loaded assignments:', data);
      setAssignments(data || []);
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chore assignments',
        variant: 'destructive',
      });
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('household_members')
        .select('id, name, color, current_coins')
        .eq('household_id', householdId)
        .order('name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error('Error loading members:', error);
    }
  };

  const handleOpenAssignDialog = (chore: Chore) => {
    setSelectedChore(chore);
    setAssignForm({
      assigned_to: '',
      due_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setAssignDialogOpen(true);
  };

  const handleClaimChore = async (assignment: ChoreAssignment, memberId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('chore_assignments')
        .update({
          assigned_to: memberId,
          claimed_by: memberId,
          claimed_at: new Date().toISOString(),
        })
        .eq('id', assignment.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Chore claimed successfully!',
      });

      loadAssignments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to claim chore',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignChore = async () => {
    if (!selectedChore) return;

    setLoading(true);
    try {
      const assignedTo = assignForm.assigned_to === 'open' ? null : assignForm.assigned_to || null;

      const { error } = await supabase
        .from('chore_assignments')
        .insert({
          household_id: householdId,
          chore_id: selectedChore.id,
          assigned_to: assignedTo,
          due_date: assignForm.due_date,
          completed: false,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: assignedTo ? 'Chore assigned successfully' : 'Chore posted as open for pickup',
      });

      setAssignDialogOpen(false);
      loadAssignments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign chore',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (assignment: ChoreAssignment) => {
    setLoading(true);
    try {
      const newCompleted = !assignment.completed;
      const completedAt = newCompleted ? new Date().toISOString() : null;

      const { error: updateError } = await supabase
        .from('chore_assignments')
        .update({
          completed: newCompleted,
          completed_at: completedAt,
        })
        .eq('id', assignment.id);

      if (updateError) throw updateError;

      if (newCompleted) {
        const { data: member, error: fetchError } = await supabase
          .from('household_members')
          .select('current_coins, total_coins')
          .eq('id', assignment.assigned_to)
          .single();

        if (fetchError) throw fetchError;

        const newCurrent = (member.current_coins || 0) + assignment.chores.points;
        const newTotal = (member.total_coins || 0) + assignment.chores.points;

        const { error: coinError } = await supabase
          .from('household_members')
          .update({
            current_coins: newCurrent,
            total_coins: newTotal,
          })
          .eq('id', assignment.assigned_to);

        if (coinError) throw coinError;

        toast({
          title: 'Success',
          description: `Chore completed! +${assignment.chores.points} coins`,
        });
      } else {
        const { data: member, error: fetchError } = await supabase
          .from('household_members')
          .select('current_coins, total_coins')
          .eq('id', assignment.assigned_to)
          .single();

        if (fetchError) throw fetchError;

        const newCurrent = Math.max(0, (member.current_coins || 0) - assignment.chores.points);
        const newTotal = Math.max(0, (member.total_coins || 0) - assignment.chores.points);

        const { error: coinError } = await supabase
          .from('household_members')
          .update({
            current_coins: newCurrent,
            total_coins: newTotal,
          })
          .eq('id', assignment.assigned_to);

        if (coinError) throw coinError;

        toast({
          title: 'Success',
          description: 'Chore marked as incomplete',
        });
      }

      loadAssignments();
      loadMembers();
      onCoinsUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update chore',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('chore_assignments')
        .delete()
        .eq('id', assignmentToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Assignment deleted successfully',
      });

      loadAssignments();
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete assignment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

  const openAssignments = assignments.filter(a => !a.completed && !a.assigned_to);
  const pendingAssignments = assignments.filter(a => !a.completed && a.assigned_to);
  const completedAssignments = assignments.filter(a => a.completed);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>Track assigned chores</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="open">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="open">
                Open ({openAssignments.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Assigned ({pendingAssignments.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedAssignments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="open" className="space-y-3 mt-4">
              {openAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No open chores available for pickup
                </p>
              ) : (
                openAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 rounded-lg border border-dashed border-primary/50 bg-primary/5">
                    <div className="flex items-start gap-3">
                      <Hand className="h-5 w-5 text-primary mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{getCategoryIcon(assignment.chores.category)}</span>
                          <h3 className="font-semibold">{assignment.chores.name}</h3>
                          <Badge variant="secondary" className="ml-auto">Open for Pickup</Badge>
                        </div>
                        {assignment.chores.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {assignment.chores.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 flex-wrap mb-3">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(parseISO(assignment.due_date), 'MMM d, yyyy')}
                          </div>
                          <Badge variant="secondary" className="font-semibold">
                            <Coins className="h-3 w-3 mr-1" />
                            {assignment.chores.points} coins
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Claim this chore:</span>
                          <div className="flex gap-2 flex-wrap">
                            {members.map((member) => (
                              <Button
                                key={member.id}
                                variant="outline"
                                size="sm"
                                onClick={() => handleClaimChore(assignment, member.id)}
                                disabled={loading}
                                style={{ borderColor: member.color, color: member.color }}
                              >
                                {member.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setAssignmentToDelete(assignment);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-3 mt-4">
              {pendingAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No assigned chores
                </p>
              ) : (
                pendingAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-start gap-3 p-4 rounded-lg border">
                    <Checkbox
                      checked={assignment.completed}
                      onCheckedChange={() => handleToggleComplete(assignment)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{getCategoryIcon(assignment.chores.category)}</span>
                        <h3 className="font-semibold">{assignment.chores.name}</h3>
                        {assignment.claimed_by && (
                          <Badge variant="outline" className="ml-auto">
                            <Hand className="h-3 w-3 mr-1" />
                            Claimed
                          </Badge>
                        )}
                      </div>
                      {assignment.chores.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {assignment.chores.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span
                            className="font-medium"
                            style={{ color: assignment.assigned_member?.color }}
                          >
                            {assignment.assigned_member?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(parseISO(assignment.due_date), 'MMM d, yyyy')}
                        </div>
                        <Badge variant="secondary" className="font-semibold">
                          <Coins className="h-3 w-3 mr-1" />
                          {assignment.chores.points} coins
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setAssignmentToDelete(assignment);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-3 mt-4">
              {completedAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No completed chores yet
                </p>
              ) : (
                completedAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-start gap-3 p-4 rounded-lg border opacity-75">
                    <Checkbox
                      checked={assignment.completed}
                      onCheckedChange={() => handleToggleComplete(assignment)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl opacity-50">{getCategoryIcon(assignment.chores.category)}</span>
                        <h3 className="font-semibold line-through">{assignment.chores.name}</h3>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span
                            className="font-medium"
                            style={{ color: assignment.assigned_member?.color }}
                          >
                            {assignment.assigned_member?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {assignment.completed_at && format(parseISO(assignment.completed_at), 'MMM d')}
                        </div>
                        <Badge variant="secondary">
                          <Coins className="h-3 w-3 mr-1" />
                          {assignment.chores.points} coins
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setAssignmentToDelete(assignment);
                        setDeleteDialogOpen(true);
                      }}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Available Chores</CardTitle>
            <CardDescription>Assign chores to household members</CardDescription>
          </CardHeader>
          <CardContent>
            {chores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No chores available
              </p>
            ) : (
              <div className="space-y-2">
                {chores.map((chore) => (
                  <div
                    key={chore.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-lg">{getCategoryIcon(chore.category)}</span>
                      <div className="flex-1">
                        <div className="font-medium">{chore.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold text-primary">
                            {chore.points} coins
                          </span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {chore.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenAssignDialog(chore)}
                      >
                        Assign
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteChore(chore.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Household Members</CardTitle>
            <CardDescription>Current coin balances</CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No members found
              </p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-semibold"
                        style={{ backgroundColor: `${member.color}20`, color: member.color }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="font-medium">{member.name}</div>
                    </div>
                    <div className="flex items-center gap-1 text-primary font-semibold">
                      <Coins className="h-4 w-4" />
                      <span>{member.current_coins || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Chore</DialogTitle>
            <DialogDescription>
              Assign {selectedChore?.name} to a household member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="assign-member">Assign To</Label>
              <Select
                value={assignForm.assigned_to}
                onValueChange={(value) => setAssignForm({ ...assignForm, assigned_to: value })}
              >
                <SelectTrigger id="assign-member">
                  <SelectValue placeholder="Select a member or leave open" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">
                    Open for Pickup (Anyone can claim)
                  </SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assign-due-date">Due Date</Label>
              <Input
                id="assign-due-date"
                type="date"
                value={assignForm.due_date}
                onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignChore} disabled={loading}>
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chore assignment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAssignment} disabled={loading}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
