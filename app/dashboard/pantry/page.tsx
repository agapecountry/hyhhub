'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Plus, Pencil, Trash2, AlertTriangle, Settings, Lock, Crown, GripVertical } from 'lucide-react';
import { useHousehold } from '@/lib/household-context';
import { useSubscription } from '@/lib/subscription-context';
import { supabase } from '@/lib/supabase';
import { AddPantryItemDialog } from '@/components/add-pantry-item-dialog';
import { EditPantryItemDialog } from '@/components/edit-pantry-item-dialog';
import { ManagePantryLocationsDialog } from '@/components/manage-pantry-locations-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { parseISO, format, startOfDay, differenceInDays } from 'date-fns';
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
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PantryItem {
  id: string;
  household_id: string;
  name: string;
  quantity: number;
  unit: string;
  location: string | null;
  location_id: string | null;
  expiration_date: string | null;
  notes: string | null;
  pantry_locations?: {
    id: string;
    name: string;
    icon: string;
  } | null;
}

interface PantryLocation {
  id: string;
  name: string;
  icon: string;
  display_order: number;
}

interface SortableTabProps {
  id: string;
  location: PantryLocation;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function SortableTab({ id, location, count, isActive, onClick }: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="inline-flex items-center"
    >
      <button
        onClick={onClick}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
          isActive
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mr-1">
          <GripVertical className="h-3 w-3" />
        </span>
        {location.icon} {location.name} ({count})
      </button>
    </div>
  );
}

export default function PantryPage() {
  const router = useRouter();
  const { currentHousehold } = useHousehold();
  const { hasFeature, tier } = useSubscription();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationsDialogOpen, setLocationsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PantryItem | null>(null);
  const [activeLocation, setActiveLocation] = useState<string>('all');
  const [locations, setLocations] = useState<PantryLocation[]>([]);

  const hasPantryAccess = hasFeature('pantry_tracking');

  useEffect(() => {
    if (currentHousehold) {
      fetchItems();
      fetchLocations();
    }
  }, [currentHousehold]);

  const fetchItems = async () => {
    if (!currentHousehold) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('pantry_items')
      .select('*, pantry_locations(id, name, icon)')
      .eq('household_id', currentHousehold.id)
      .order('name');

    if (error) {
      console.error('Error fetching pantry items:', error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const fetchLocations = async () => {
    if (!currentHousehold) return;

    const { data, error } = await supabase
      .from('pantry_locations')
      .select('*')
      .eq('household_id', currentHousehold.id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching locations:', error);
    } else {
      setLocations(data || []);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    const { error } = await supabase
      .from('pantry_items')
      .delete()
      .eq('id', selectedItem.id);

    if (error) {
      console.error('Error deleting item:', error);
    } else {
      fetchItems();
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const getExpirationStatus = (expirationDate: string | null) => {
    if (!expirationDate) return null;

    const today = startOfDay(new Date());
    const expDate = startOfDay(parseISO(expirationDate));
    const diffDays = differenceInDays(expDate, today);

    if (diffDays < 0) return { status: 'expired', label: 'Expired', variant: 'destructive' as const };
    if (diffDays === 0) return { status: 'today', label: 'Expires Today', variant: 'destructive' as const };
    if (diffDays <= 3) return { status: 'urgent', label: `${diffDays} days`, variant: 'destructive' as const };
    if (diffDays <= 7) return { status: 'soon', label: `${diffDays} days`, variant: 'default' as const };
    return null;
  };

  const getLocationCounts = () => {
    const counts: Record<string, number> = {};

    locations.forEach(loc => {
      counts[loc.id] = 0;
    });

    items.forEach(item => {
      if (item.location_id && counts.hasOwnProperty(item.location_id)) {
        counts[item.location_id]++;
      }
    });

    return counts;
  };

  const getExpiringSoon = () => {
    return items.filter(item => {
      const status = getExpirationStatus(item.expiration_date);
      return status && ['expired', 'today', 'urgent', 'soon'].includes(status.status);
    }).sort((a, b) => {
      const dateA = a.expiration_date ? parseISO(a.expiration_date).getTime() : Infinity;
      const dateB = b.expiration_date ? parseISO(b.expiration_date).getTime() : Infinity;
      return dateA - dateB;
    });
  };

  const getFilteredItems = () => {
    if (activeLocation === 'all') return items;
    return items.filter(item => item.location_id === activeLocation);
  };

  const counts = getLocationCounts();
  const expiringSoon = getExpiringSoon();
  const filteredItems = getFilteredItems();

  if (!currentHousehold) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please select a household to view pantry items</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasPantryAccess) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Pantry Tracker</h1>
            <p className="text-muted-foreground">Track inventory and expiration dates</p>
          </div>

          <Card className="border-2 border-primary">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                <CardTitle>Premium Feature</CardTitle>
              </div>
              <CardDescription>
                Pantry tracking is available on Premium and Elite plans
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upgrade to unlock pantry tracking features including:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Track items across pantry, fridge, and freezer
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  Get expiration date alerts
                </li>
                <li className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  Manage custom storage locations
                </li>
              </ul>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => router.push('/dashboard/subscription')} className="flex-1">
                  <Crown className="h-4 w-4 mr-2" />
                  View Plans
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pantry Tracker</h1>
            <p className="text-muted-foreground">Track inventory and expiration dates</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocationsDialogOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Manage Locations
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {expiringSoon.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have {expiringSoon.length} item{expiringSoon.length !== 1 ? 's' : ''} expiring soon
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>Manage your pantry items</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLocation} onValueChange={setActiveLocation}>
              <div className="mb-4 inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground gap-1">
                <button
                  onClick={() => setActiveLocation('all')}
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                    activeLocation === 'all'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  All ({items.length})
                </button>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={locations.map(loc => loc.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {locations.map(location => (
                      <SortableTab
                        key={location.id}
                        id={location.id}
                        location={location}
                        count={counts[location.id] || 0}
                        isActive={activeLocation === location.id}
                        onClick={() => setActiveLocation(location.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No items {activeLocation !== 'all' && `in ${activeLocation}`}
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Expiration</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const expirationStatus = getExpirationStatus(item.expiration_date);
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>
                              {item.quantity} {item.unit}
                            </TableCell>
                            <TableCell>
                              {item.pantry_locations ? (
                                <span>
                                  {item.pantry_locations.icon} {item.pantry_locations.name}
                                </span>
                              ) : (
                                <span className="capitalize">{item.location || 'Unknown'}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.expiration_date ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">
                                    {format(parseISO(item.expiration_date), 'MMM d, yyyy')}
                                  </span>
                                  {expirationStatus && (
                                    <Badge variant={expirationStatus.variant}>
                                      {expirationStatus.label}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.notes || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <AddPantryItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchItems}
      />

      {selectedItem && (
        <EditPantryItemDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          item={selectedItem}
          onSuccess={fetchItems}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {currentHousehold && (
        <ManagePantryLocationsDialog
          open={locationsDialogOpen}
          onOpenChange={setLocationsDialogOpen}
          householdId={currentHousehold.id}
          onUpdate={() => {
            fetchItems();
            fetchLocations();
          }}
        />
      )}
    </DashboardLayout>
  );
}
