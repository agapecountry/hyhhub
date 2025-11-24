'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

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

interface Location {
  id: string;
  name: string;
  icon: string;
  display_order?: number;
}

interface EditPantryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PantryItem;
  onSuccess: () => void;
}

export function EditPantryItemDialog({ open, onOpenChange, item, onSuccess }: EditPantryItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationIcon, setNewLocationIcon] = useState('📦');
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'unit',
    location_id: '',
    expiration_date: '',
    notes: '',
  });

  useEffect(() => {
    if (open && item) {
      loadLocations();
    }
  }, [open, item]);

  useEffect(() => {
    if (item && locations.length > 0) {
      setFormData({
        name: item.name,
        quantity: item.quantity.toString(),
        unit: item.unit,
        location_id: item.location_id || locations[0].id,
        expiration_date: item.expiration_date || '',
        notes: item.notes || '',
      });
    }
  }, [item, locations]);

  const loadLocations = async () => {
    if (!item) return;

    try {
      const { data, error } = await supabase
        .from('pantry_locations')
        .select('*')
        .eq('household_id', item.household_id)
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    const { error } = await supabase
      .from('pantry_items')
      .update({
        name: formData.name,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        location_id: formData.location_id,
        expiration_date: formData.expiration_date || null,
        notes: formData.notes || null,
      })
      .eq('id', item.id);

    setLoading(false);

    if (error) {
      console.error('Error updating pantry item:', error);
    } else {
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Pantry Item</DialogTitle>
          <DialogDescription>Update the details of this pantry item</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Item Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Flour, Milk, Eggs"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  step="0.01"
                  placeholder="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-unit">Unit</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                  <SelectTrigger id="edit-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unit">unit</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                    <SelectItem value="oz">oz</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="cup">cup</SelectItem>
                    <SelectItem value="tbsp">tbsp</SelectItem>
                    <SelectItem value="tsp">tsp</SelectItem>
                    <SelectItem value="gal">gal</SelectItem>
                    <SelectItem value="qt">qt</SelectItem>
                    <SelectItem value="pt">pt</SelectItem>
                    <SelectItem value="l">l</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="can">can</SelectItem>
                    <SelectItem value="jar">jar</SelectItem>
                    <SelectItem value="box">box</SelectItem>
                    <SelectItem value="bag">bag</SelectItem>
                    <SelectItem value="package">package</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              {!showAddLocation ? (
                <Select value={formData.location_id} onValueChange={(value) => {
                  if (value === 'add_new') {
                    setShowAddLocation(true);
                  } else {
                    setFormData({ ...formData, location_id: value });
                  }
                }}>
                  <SelectTrigger id="edit-location">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.icon} {location.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="add_new" className="text-primary font-semibold">
                      + Add New Location
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <Label htmlFor="new-location-name">Location Name</Label>
                    <Input
                      id="new-location-name"
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                      placeholder="e.g., Garage, Backpack"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-location-icon">Icon</Label>
                    <Select value={newLocationIcon} onValueChange={setNewLocationIcon}>
                      <SelectTrigger id="new-location-icon">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="📦">📦 Pantry</SelectItem>
                        <SelectItem value="🧊">🧊 Fridge</SelectItem>
                        <SelectItem value="❄️">❄️ Freezer</SelectItem>
                        <SelectItem value="🗃️">🗃️ Storage</SelectItem>
                        <SelectItem value="🚗">🚗 Garage</SelectItem>
                        <SelectItem value="🎒">🎒 Backpack</SelectItem>
                        <SelectItem value="👜">👜 Handbag</SelectItem>
                        <SelectItem value="🧰">🧰 Toolbox</SelectItem>
                        <SelectItem value="🧺">🧺 Basket</SelectItem>
                        <SelectItem value="🪜">🪜 Attic</SelectItem>
                        <SelectItem value="⬇️">⬇️ Basement</SelectItem>
                        <SelectItem value="🚪">🚪 Closet</SelectItem>
                        <SelectItem value="🏠">🏠 Shed</SelectItem>
                        <SelectItem value="📚">📚 Shelf</SelectItem>
                        <SelectItem value="🗄️">🗄️ Cabinet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddLocation(false);
                        setNewLocationName('');
                        setNewLocationIcon('📦');
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        if (!newLocationName.trim()) {
                          toast({ title: 'Error', description: 'Please enter a location name', variant: 'destructive' });
                          return;
                        }
                        try {
                          const maxOrder = locations.length > 0 ? Math.max(...locations.map((loc: any) => loc.display_order || 0)) : -1;
                          const { data, error } = await supabase.from('pantry_locations').insert({
                            household_id: item.household_id,
                            name: newLocationName.trim(),
                            icon: newLocationIcon,
                            display_order: maxOrder + 1,
                          }).select().single();
                          if (error) throw error;
                          toast({ title: 'Success', description: `Location "${newLocationName}" created` });
                          setLocations([...locations, data]);
                          setFormData({ ...formData, location_id: data.id });
                          setShowAddLocation(false);
                          setNewLocationName('');
                          setNewLocationIcon('📦');
                        } catch (error: any) {
                          toast({ title: 'Error', description: error.message, variant: 'destructive' });
                        }
                      }}
                      className="flex-1"
                    >
                      Add Location
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-expiration_date">Expiration Date (Optional)</Label>
              <Input
                id="edit-expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
