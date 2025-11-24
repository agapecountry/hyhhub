'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Payee, TransactionCategory, TransactionType } from '@/lib/types';

interface ManagePayeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  categories: TransactionCategory[];
  onPayeeCreated?: (payeeId?: string, payeeName?: string) => void;
  prefilledName?: string;
}

export function ManagePayeesDialog({
  open,
  onOpenChange,
  householdId,
  categories,
  onPayeeCreated,
  prefilledName,
}: ManagePayeesDialogProps) {
  const { toast } = useToast();
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPayee, setEditingPayee] = useState<Payee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [payeeToDelete, setPayeeToDelete] = useState<Payee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    default_category_id: '',
    default_transaction_type: '' as TransactionType | '',
    notes: '',
  });

  useEffect(() => {
    if (open && householdId) {
      loadPayees();
      // If a prefilled name is provided, show the form and set the name
      if (prefilledName) {
        setShowForm(true);
        setFormData(prev => ({ ...prev, name: prefilledName }));
      }
    }
  }, [open, householdId, prefilledName]);

  const loadPayees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payees')
      .select('*')
      .eq('household_id', householdId)
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load payees',
        variant: 'destructive',
      });
    } else {
      setPayees(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Payee name is required',
        variant: 'destructive',
      });
      return;
    }

    const payeeData = {
      household_id: householdId,
      name: formData.name.trim(),
      default_category_id: formData.default_category_id || null,
      default_transaction_type: formData.default_transaction_type || null,
      notes: formData.notes || null,
    };

    if (editingPayee) {
      const { error } = await supabase
        .from('payees')
        .update(payeeData)
        .eq('id', editingPayee.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update payee',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Payee updated successfully',
      });
    } else {
      const { data, error } = await supabase
        .from('payees')
        .insert([payeeData])
        .select()
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create payee',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Payee created successfully',
      });
      
      // Return the newly created payee to parent
      onPayeeCreated?.(data?.id, data?.name);
    }

    setFormData({ name: '', default_category_id: '', default_transaction_type: '', notes: '' });
    setEditingPayee(null);
    setShowForm(false);
    loadPayees();
    
    // Only call onPayeeCreated here if we updated (not created)
    if (editingPayee) {
      onPayeeCreated?.();
    }
  };

  const handleEdit = (payee: Payee) => {
    setEditingPayee(payee);
    setFormData({
      name: payee.name,
      default_category_id: payee.default_category_id || '',
      default_transaction_type: payee.default_transaction_type || '',
      notes: payee.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!payeeToDelete) return;

    const { error } = await supabase
      .from('payees')
      .delete()
      .eq('id', payeeToDelete.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete payee',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Payee deleted successfully',
    });
    loadPayees();
    setDeleteDialogOpen(false);
    setPayeeToDelete(null);
  };

  const handleCancel = () => {
    setFormData({ name: '', default_category_id: '', default_transaction_type: '', notes: '' });
    setEditingPayee(null);
    setShowForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Payees</DialogTitle>
          <DialogDescription>
            Create and manage payees with default categories and transaction types
          </DialogDescription>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4">
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add New Payee
            </Button>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Default Type</TableHead>
                    <TableHead>Default Category</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No payees yet. Create your first payee to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payees.map((payee) => {
                      const category = categories.find(c => c.id === payee.default_category_id);
                      return (
                        <TableRow key={payee.id}>
                          <TableCell className="font-medium">{payee.name}</TableCell>
                          <TableCell>
                            {payee.default_transaction_type ? (
                              <span className="capitalize">{payee.default_transaction_type}</span>
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {category ? (
                              <span className="flex items-center gap-2">
                                {category.icon && <span>{category.icon}</span>}
                                <span>{category.name}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(payee)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPayeeToDelete(payee);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="payee-name">Payee Name *</Label>
              <Input
                id="payee-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Walmart, Electric Company, John Doe"
              />
            </div>

            <div>
              <Label htmlFor="default-type">Default Transaction Type</Label>
              <Select
                value={formData.default_transaction_type || 'none'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    default_transaction_type: value === 'none' ? '' : (value as TransactionType),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="withdraw">Withdraw</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="default-category">Default Category</Label>
              <Select
                value={formData.default_category_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, default_category_id: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span className="flex items-center gap-2">
                        {category.icon && <span>{category.icon}</span>}
                        <span>{category.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this payee"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingPayee ? 'Update' : 'Create'} Payee
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{payeeToDelete?.name}"? This action cannot be undone.
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
    </Dialog>
  );
}
