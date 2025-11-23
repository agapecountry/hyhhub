'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Plus, Edit, Trash2, Calendar as CalendarIcon, User } from 'lucide-react';
import { useHousehold } from '@/lib/household-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface JournalEntry {
  id: string;
  household_id: string;
  user_id: string;
  subject: string;
  entry_date: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  users?: {
    name: string | null;
    email: string;
  };
}

export default function JournalPage() {
  const { currentHousehold } = useHousehold();
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);

  const [formData, setFormData] = useState({
    subject: '',
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    content: '',
  });

  useEffect(() => {
    if (currentHousehold) {
      loadEntries();
    }
  }, [currentHousehold]);

  const loadEntries = async () => {
    if (!currentHousehold) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          users (
            name,
            email
          )
        `)
        .eq('household_id', currentHousehold.id)
        .is('deleted_at', null)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error: any) {
      console.error('Error loading journal entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to load journal entries',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!currentHousehold || !user) return;

    if (!formData.subject.trim() || !formData.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Subject and content are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('journal_entries')
        .insert({
          household_id: currentHousehold.id,
          user_id: user.id,
          subject: formData.subject,
          entry_date: formData.entry_date,
          content: formData.content,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Journal entry created successfully',
      });

      setIsCreateDialogOpen(false);
      resetForm();
      await loadEntries();
    } catch (error: any) {
      console.error('Error creating journal entry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create journal entry',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedEntry || !currentHousehold) return;

    if (!formData.subject.trim() || !formData.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Subject and content are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('journal_entries')
        .update({
          subject: formData.subject,
          entry_date: formData.entry_date,
          content: formData.content,
        })
        .eq('id', selectedEntry.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Journal entry updated successfully',
      });

      setIsEditDialogOpen(false);
      setSelectedEntry(null);
      resetForm();
      await loadEntries();
    } catch (error: any) {
      console.error('Error updating journal entry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update journal entry',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!entryToDelete) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('journal_entries')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', entryToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Journal entry deleted successfully',
      });

      setIsDeleteDialogOpen(false);
      setEntryToDelete(null);
      await loadEntries();
    } catch (error: any) {
      console.error('Error deleting journal entry:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete journal entry',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      subject: '',
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      content: '',
    });
  };

  const openViewDialog = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setFormData({
      subject: entry.subject,
      entry_date: entry.entry_date,
      content: entry.content,
    });
    setIsViewDialogOpen(false);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (entry: JournalEntry) => {
    setEntryToDelete(entry);
    setIsViewDialogOpen(false);
    setIsDeleteDialogOpen(true);
  };

  const getAuthorName = (entry: JournalEntry) => {
    if (entry.users) {
      const userData = Array.isArray(entry.users) ? entry.users[0] : entry.users;
      return userData?.name || userData?.email || 'Unknown';
    }
    return 'Unknown';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notes & Journal</h1>
            <p className="text-muted-foreground">Keep track of thoughts, memories, and important notes</p>
          </div>
          <Button onClick={() => {
            resetForm();
            setIsCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>

        {loading && entries.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">Loading entries...</div>
            </CardContent>
          </Card>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Journal Entries</h3>
                <p className="text-muted-foreground mb-4">Start writing your first entry</p>
                <Button onClick={() => {
                  resetForm();
                  setIsCreateDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Entry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {entries.map(entry => (
              <Card
                key={entry.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => openViewDialog(entry)}
              >
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-1">{entry.subject}</CardTitle>
                  <CardDescription className="flex items-center gap-2 text-xs">
                    <CalendarIcon className="h-3 w-3" />
                    {format(parseISO(entry.entry_date), 'MMMM d, yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {entry.content}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{getAuthorName(entry)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Journal Entry</DialogTitle>
              <DialogDescription>Create a new journal entry or note</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Entry title or subject"
                />
              </div>
              <div>
                <Label htmlFor="entry_date">Date</Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your journal entry here..."
                  className="min-h-[300px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create Entry'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedEntry && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedEntry.subject}</DialogTitle>
                  <DialogDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {format(parseISO(selectedEntry.entry_date), 'MMMM d, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {getAuthorName(selectedEntry)}
                    </span>
                  </DialogDescription>
                </DialogHeader>
                <div className="whitespace-pre-wrap text-sm">
                  {selectedEntry.content}
                </div>
                <DialogFooter className="gap-2">
                  {user?.id === selectedEntry.user_id && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => openDeleteDialog(selectedEntry)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                      <Button onClick={() => openEditDialog(selectedEntry)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </>
                  )}
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Journal Entry</DialogTitle>
              <DialogDescription>Update your journal entry</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_subject">Subject</Label>
                <Input
                  id="edit_subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Entry title or subject"
                />
              </div>
              <div>
                <Label htmlFor="edit_entry_date">Date</Label>
                <Input
                  id="edit_entry_date"
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_content">Content</Label>
                <Textarea
                  id="edit_content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your journal entry here..."
                  className="min-h-[300px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedEntry(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this journal entry? This action can be undone by an administrator.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEntryToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSoftDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
