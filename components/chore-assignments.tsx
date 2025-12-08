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
import { User, Calendar, Trash2, CheckCircle2, Coins, Hand, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
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
  onAssignmentChange?: () => void;
  refreshKey?: number;
  renderSection?: 'tabs' | 'members' | 'available' | 'all';
}

export function ChoreAssignments({ householdId, chores, onCoinsUpdate, onDeleteChore, onAssignmentChange, refreshKey, renderSection = 'all' }: ChoreAssignmentsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<ChoreAssignment[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [showAllAssignments, setShowAllAssignments] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<ChoreAssignment | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedAssignments, setSelectedAssignments] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [choreSearch, setChoreSearch] = useState('');
  const [showChoreDropdown, setShowChoreDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [assignForm, setAssignForm] = useState({
    assigned_to: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
  });

  // Filter chores based on search
  const filteredChores = chores.filter(chore =>
    chore.name.toLowerCase().includes(choreSearch.toLowerCase()) ||
    chore.category.toLowerCase().includes(choreSearch.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowChoreDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get the current user's household member ID
  useEffect(() => {
    const loadCurrentMember = async () => {
      if (!householdId || !user) return;
      
      const { data } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setCurrentMemberId(data.id);
      }
    };
    
    loadCurrentMember();
  }, [householdId, user]);

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
      onAssignmentChange?.();
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
      onAssignmentChange?.();
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
      onAssignmentChange?.();
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

  const handleBulkDelete = async () => {
    if (selectedAssignments.size === 0) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('chore_assignments')
        .delete()
        .in('id', Array.from(selectedAssignments));

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${selectedAssignments.size} assignment(s) deleted successfully`,
      });

      loadAssignments();
      setBulkDeleteDialogOpen(false);
      setSelectedAssignments(new Set());
      setSelectionMode(false);
      onAssignmentChange?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete assignments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignmentSelection = (assignmentId: string) => {
    setSelectedAssignments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assignmentId)) {
        newSet.delete(assignmentId);
      } else {
        newSet.add(assignmentId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = (assignmentList: ChoreAssignment[]) => {
    const allSelected = assignmentList.every(a => selectedAssignments.has(a.id));
    if (allSelected) {
      // Deselect all in this list
      setSelectedAssignments(prev => {
        const newSet = new Set(prev);
        assignmentList.forEach(a => newSet.delete(a.id));
        return newSet;
      });
    } else {
      // Select all in this list
      setSelectedAssignments(prev => {
        const newSet = new Set(prev);
        assignmentList.forEach(a => newSet.add(a.id));
        return newSet;
      });
    }
  };

  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedAssignments(new Set());
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

  // Filter assignments based on toggle and date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Different date ranges: 3 days for "my chores", 7 days for "show all"
  const daysToShow = showAllAssignments ? 7 : 3;
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysToShow);
  endDate.setHours(23, 59, 59, 999);

  // Open assignments - always show all (no member filter), no date filter
  const openAssignments = assignments.filter(a => !a.completed && !a.assigned_to);

  // Pending/Assigned - filter by member unless "show all" is on
  const pendingAssignments = assignments.filter(a => {
    if (a.completed || !a.assigned_to) return false;
    
    // Filter by member if not showing all
    if (!showAllAssignments && currentMemberId && a.assigned_to !== currentMemberId) {
      return false;
    }
    
    const dueDate = parseISO(a.due_date);
    return dueDate < today || dueDate <= endDate;
  });

  // Completed - filter by member unless "show all" is on
  const completedAssignments = assignments.filter(a => {
    if (!a.completed) return false;
    
    // Filter by member if not showing all
    if (!showAllAssignments && currentMemberId && a.assigned_to !== currentMemberId) {
      return false;
    }
    
    return true;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Track assigned chores</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {selectionMode ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedAssignments.size} selected
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    disabled={selectedAssignments.size === 0 || loading}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelSelectionMode}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                  disabled={assignments.length === 0}
                >
                  Select Multiple
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Switch
              id="show-all"
              checked={showAllAssignments}
              onCheckedChange={setShowAllAssignments}
            />
            <Label htmlFor="show-all" className="text-sm text-muted-foreground cursor-pointer">
              Show all household members
            </Label>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
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
              {selectionMode && openAssignments.length > 0 && (
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={openAssignments.every(a => selectedAssignments.has(a.id))}
                    onCheckedChange={() => toggleSelectAll(openAssignments)}
                  />
                  <span className="text-sm text-muted-foreground">Select all open</span>
                </div>
              )}
              {openAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No open chores available for pickup
                </p>
              ) : (
                openAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 rounded-lg border border-dashed border-primary/50 bg-primary/5">
                    <div className="flex items-start gap-3">
                      {selectionMode ? (
                        <Checkbox
                          checked={selectedAssignments.has(assignment.id)}
                          onCheckedChange={() => toggleAssignmentSelection(assignment.id)}
                          className="mt-1"
                        />
                      ) : (
                        <Hand className="h-5 w-5 text-primary mt-1" />
                      )}
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
                        {!selectionMode && (
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
                        )}
                      </div>
                      {!selectionMode && (
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
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="pending" className="space-y-3 mt-4">
              {selectionMode && pendingAssignments.length > 0 && (
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={pendingAssignments.every(a => selectedAssignments.has(a.id))}
                    onCheckedChange={() => toggleSelectAll(pendingAssignments)}
                  />
                  <span className="text-sm text-muted-foreground">Select all assigned</span>
                </div>
              )}
              {pendingAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No assigned chores
                </p>
              ) : (
                pendingAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-start gap-3 p-4 rounded-lg border">
                    {selectionMode ? (
                      <Checkbox
                        checked={selectedAssignments.has(assignment.id)}
                        onCheckedChange={() => toggleAssignmentSelection(assignment.id)}
                        className="mt-1"
                      />
                    ) : (
                      <Checkbox
                        checked={assignment.completed}
                        onCheckedChange={() => handleToggleComplete(assignment)}
                        className="mt-1"
                      />
                    )}
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
                    {!selectionMode && (
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
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-3 mt-4">
              {selectionMode && completedAssignments.length > 0 && (
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={completedAssignments.every(a => selectedAssignments.has(a.id))}
                    onCheckedChange={() => toggleSelectAll(completedAssignments)}
                  />
                  <span className="text-sm text-muted-foreground">Select all completed</span>
                </div>
              )}
              {completedAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No completed chores yet
                </p>
              ) : (
                completedAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-start gap-3 p-4 rounded-lg border opacity-75">
                    {selectionMode ? (
                      <Checkbox
                        checked={selectedAssignments.has(assignment.id)}
                        onCheckedChange={() => toggleAssignmentSelection(assignment.id)}
                        className="mt-1"
                      />
                    ) : (
                      <Checkbox
                        checked={assignment.completed}
                        onCheckedChange={() => handleToggleComplete(assignment)}
                        className="mt-1"
                      />
                    )}
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
                    {!selectionMode && (
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
                    )}
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedAssignments.size} Assignment(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedAssignments.size} selected chore assignment(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : `Delete ${selectedAssignments.size} Assignment(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
