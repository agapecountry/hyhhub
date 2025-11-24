'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Edit2, X, Check, GripVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

interface Location {
  id: string;
  name: string;
  icon: string;
  display_order: number;
}

interface SortableLocationProps {
  location: Location;
  isEditing: boolean;
  editName: string;
  editIcon: string;
  loading: boolean;
  onEditChange: (name: string, icon: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
}

function SortableLocation({
  location,
  isEditing,
  editName,
  editIcon,
  loading,
  onEditChange,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
}: SortableLocationProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: location.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="p-3">
      {isEditing ? (
        <div className="grid grid-cols-[auto_1fr_140px_auto_auto] gap-2 items-center">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <Input
            value={editName}
            onChange={(e) => onEditChange(e.target.value, editIcon)}
            placeholder="Location name"
          />
          <Select value={editIcon} onValueChange={(value) => onEditChange(editName, value)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <span className="text-xl">{editIcon}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ICON_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{option.value}</span>
                    <span className="text-sm">{option.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={onSave} disabled={loading}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel} disabled={loading}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-2xl">{location.icon}</span>
            <span className="font-medium">{location.name}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onStartEdit} disabled={loading}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete} disabled={loading}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

interface ManagePantryLocationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  onUpdate: () => void;
}

const ICON_OPTIONS = [
  { value: '📦', label: 'Pantry' },
  { value: '🧊', label: 'Fridge' },
  { value: '❄️', label: 'Freezer' },
  { value: '🗃️', label: 'Storage' },
  { value: '🚗', label: 'Garage' },
  { value: '🎒', label: 'Backpack' },
  { value: '👜', label: 'Handbag' },
  { value: '🧰', label: 'Toolbox' },
  { value: '🧺', label: 'Basket' },
  { value: '🪜', label: 'Attic' },
  { value: '⬇️', label: 'Basement' },
  { value: '🚪', label: 'Closet' },
  { value: '🏠', label: 'Shed' },
  { value: '📚', label: 'Shelf' },
  { value: '🗄️', label: 'Cabinet' },
  { value: '🍽️', label: 'Dining Room' },
  { value: '🛏️', label: 'Bedroom' },
  { value: '🚐', label: 'RV/Camper' },
  { value: '🏕️', label: 'Camping Gear' },
  { value: '🎁', label: 'Gift Closet' },
];

export function ManagePantryLocationsDialog({
  open,
  onOpenChange,
  householdId,
  onUpdate,
}: ManagePantryLocationsDialogProps) {
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationIcon, setNewLocationIcon] = useState('📦');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  useEffect(() => {
    if (open && householdId) {
      loadLocations();
    }
  }, [open, householdId]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('pantry_locations')
        .select('*')
        .eq('household_id', householdId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load locations',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = locations.findIndex((loc) => loc.id === active.id);
      const newIndex = locations.findIndex((loc) => loc.id === over.id);

      const newLocations = arrayMove(locations, oldIndex, newIndex);
      setLocations(newLocations);

      const updates = newLocations.map((loc, index) => ({
        id: loc.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('pantry_locations')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      onUpdate();
    }
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a location name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const maxOrder = locations.length > 0
        ? Math.max(...locations.map(loc => loc.display_order || 0))
        : -1;

      const { error } = await supabase.from('pantry_locations').insert({
        household_id: householdId,
        name: newLocationName.trim(),
        icon: newLocationIcon,
        display_order: maxOrder + 1,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location added successfully',
      });

      setNewLocationName('');
      setNewLocationIcon('📦');
      loadLocations();
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add location',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!locationToDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('pantry_locations')
        .delete()
        .eq('id', locationToDelete.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });

      loadLocations();
      onUpdate();
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete location',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (location: Location) => {
    setEditingId(location.id);
    setEditName(location.name);
    setEditIcon(location.icon);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditIcon('');
  };

  const handleUpdateLocation = async (locationId: string) => {
    if (!editName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a location name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('pantry_locations')
        .update({
          name: editName.trim(),
          icon: editIcon,
        })
        .eq('id', locationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location updated successfully',
      });

      setEditingId(null);
      setEditName('');
      setEditIcon('');
      loadLocations();
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update location',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Pantry Locations</DialogTitle>
          <DialogDescription>
            Add, edit, or remove storage locations for your pantry items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Add New Location</h3>
            <div className="grid grid-cols-[1fr_140px_auto] gap-2">
              <div>
                <Label htmlFor="new-location-name">Location Name</Label>
                <Input
                  id="new-location-name"
                  placeholder="e.g., Basement, Garage, Cupboard"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddLocation();
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="new-location-icon">Icon</Label>
                <Select value={newLocationIcon} onValueChange={setNewLocationIcon}>
                  <SelectTrigger id="new-location-icon" className="w-full">
                    <SelectValue>
                      <span className="text-xl">{newLocationIcon}</span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <span className="text-xl">{option.value}</span>
                          <span className="text-sm">{option.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddLocation} disabled={loading}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </Card>

          <div>
            <h3 className="font-semibold mb-3">Current Locations (Drag to Reorder)</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No locations yet. Add your first location above.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={locations.map(loc => loc.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {locations.map((location) => (
                      <SortableLocation
                        key={location.id}
                        location={location}
                        isEditing={editingId === location.id}
                        editName={editName}
                        editIcon={editIcon}
                        loading={loading}
                        onEditChange={(name, icon) => {
                          setEditName(name);
                          setEditIcon(icon);
                        }}
                        onSave={() => handleUpdateLocation(location.id)}
                        onCancel={cancelEdit}
                        onStartEdit={() => startEdit(location)}
                        onDelete={() => {
                          setLocationToDelete(location);
                          setDeleteDialogOpen(true);
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{locationToDelete?.name}"? Items at this location will need to be reassigned. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLocation} disabled={loading}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
