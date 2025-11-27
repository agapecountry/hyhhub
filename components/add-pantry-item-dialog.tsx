'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScanBarcode, X } from 'lucide-react';
import { useHousehold } from '@/lib/household-context';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { toast } from '@/hooks/use-toast';

interface AddPantryItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Location {
  id: string;
  name: string;
  icon: string;
  display_order?: number;
}

export function AddPantryItemDialog({ open, onOpenChange, onSuccess }: AddPantryItemDialogProps) {
  const { currentHousehold } = useHousehold();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lookingUpProduct, setLookingUpProduct] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [productFound, setProductFound] = useState<boolean | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [activeTab, setActiveTab] = useState('manual');
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationIcon, setNewLocationIcon] = useState('📦');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'unit',
    location_id: '',
    expiration_date: '',
    notes: '',
  });

  useEffect(() => {
    if (open && currentHousehold) {
      loadLocations();
    }
    if (!open) {
      if (scanning) {
        stopScanner();
      }
      // Clear form when dialog closes
      setFormData({
        name: '',
        quantity: '',
        unit: 'unit',
        location_id: '',
        expiration_date: '',
        notes: '',
      });
      setScannedBarcode(null);
      setProductFound(null);
    }
  }, [open, currentHousehold, scanning]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const loadLocations = async () => {
    if (!currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('pantry_locations')
        .select('*')
        .eq('household_id', currentHousehold.id)
        .order('name');

      if (error) throw error;
      setLocations(data || []);

      // Auto-select first location when dialog opens
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, location_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const lookupProduct = async (barcode: string) => {
    setLookingUpProduct(true);
    setProductFound(null);

    console.log('Looking up barcode:', barcode);

    try {
      // Use Open Food Facts (works with CORS, good international coverage)
      const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const offData = await offResponse.json();

      if (offData.status === 1 && offData.product) {
        const product = offData.product;
        // Use imported English name first, fallback to other names
        const productName = product.product_name_en_imported 
          || product.product_name_en 
          || product.product_name_es 
          || product.product_name 
          || 'Unknown Product';
        
        // Build notes with available product information
        let notes = `Barcode: ${barcode}`;
        if (product.brands) notes += `\nBrand: ${product.brands}`;
        
        // Add nutritional information if available
        if (product.nutriments) {
          const n = product.nutriments;
          notes += '\n\nNutrition (per 100g):';
          if (n['energy-kcal_100g']) notes += `\nCalories: ${Math.round(n['energy-kcal_100g'])} kcal`;
          if (n.fat_100g) notes += `\nFat: ${n.fat_100g}g`;
          if (n['saturated-fat_100g']) notes += `\n  Saturated: ${n['saturated-fat_100g']}g`;
          if (n.carbohydrates_100g) notes += `\nCarbs: ${n.carbohydrates_100g}g`;
          if (n.sugars_100g) notes += `\n  Sugars: ${n.sugars_100g}g`;
          if (n.fiber_100g) notes += `\n  Fiber: ${n.fiber_100g}g`;
          if (n.proteins_100g) notes += `\nProtein: ${n.proteins_100g}g`;
          if (n.salt_100g) notes += `\nSalt: ${n.salt_100g}g`;
          if (n.sodium_100g) notes += `\nSodium: ${Math.round(n.sodium_100g * 1000)}mg`;
        }
        
        // Try to extract quantity and unit from product data
        let suggestedQuantity = '1';
        let suggestedUnit = 'unit';
        
        if (product.quantity) {
          const qtyStr = product.quantity.toLowerCase();
          // Parse common formats like "16 oz", "1 lb", "500 ml"
          const match = qtyStr.match(/(\d+\.?\d*)\s*([a-z]+)/);
          if (match) {
            suggestedQuantity = match[1];
            const unit = match[2];
            // Map common units
            if (['oz', 'ounce', 'ounces'].includes(unit)) suggestedUnit = 'oz';
            else if (['lb', 'lbs', 'pound', 'pounds'].includes(unit)) suggestedUnit = 'lb';
            else if (['g', 'gram', 'grams'].includes(unit)) suggestedUnit = 'g';
            else if (['kg', 'kilogram', 'kilograms'].includes(unit)) suggestedUnit = 'kg';
            else if (['ml', 'milliliter', 'milliliters'].includes(unit)) suggestedUnit = 'ml';
            else if (['l', 'liter', 'liters'].includes(unit)) suggestedUnit = 'l';
          }
        }

        setFormData(prev => ({
          ...prev,
          name: productName,
          quantity: suggestedQuantity,
          unit: suggestedUnit,
          notes: notes,
        }));
        setProductFound(true);
      } else {
        // Product not found - save barcode for manual entry
        setFormData(prev => ({ 
          ...prev, 
          notes: `Barcode: ${barcode}\n\nProduct not found in Open Food Facts database. Please enter details manually.` 
        }));
        setProductFound(false);
      }
    } catch (error) {
      console.error('Error looking up product:', error);
      setFormData(prev => ({ 
        ...prev, 
        notes: `Barcode: ${barcode}\n\nError looking up product. Please enter details manually.` 
      }));
      setProductFound(false);
    } finally {
      setLookingUpProduct(false);
      setActiveTab('manual');
    }
  };

  const startScanner = async () => {
    try {
      setScanning(true);

      // Wait for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 300));

      const html5QrCode = new Html5Qrcode('barcode-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 300, height: 150 },
          // @ts-ignore - formatsToSupport exists but not in type definitions
          formatsToSupport: [
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
        },
        (decodedText) => {
          console.log('Scanned barcode:', decodedText);
          setScannedBarcode(decodedText);
          stopScanner();
          lookupProduct(decodedText);
        },
        () => {}
      );
    } catch (error) {
      console.error('Error starting scanner:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: 'Camera Error',
        description: `Unable to start camera: ${errorMessage}. Please make sure camera permissions are enabled.`,
        variant: 'destructive',
      });
      
      setScanning(false);
      scannerRef.current = null;
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          setScanning(false);
          scannerRef.current = null;
        })
        .catch(() => {
          setScanning(false);
        });
    } else {
      setScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHousehold) return;

    setLoading(true);

    const { error } = await supabase.from('pantry_items').insert({
      household_id: currentHousehold.id,
      name: formData.name,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      location_id: formData.location_id,
      expiration_date: formData.expiration_date || null,
      notes: formData.notes || null,
    });

    setLoading(false);

    if (error) {
      console.error('Error adding pantry item:', error);
      toast({
        title: 'Error adding item',
        description: error.message || 'Failed to add pantry item. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Item added',
        description: 'Pantry item has been added successfully.',
      });
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && scanning) {
        stopScanner();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Pantry Item</DialogTitle>
          <DialogDescription>Add a new item to your pantry inventory</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="scan">Scan Barcode</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {scannedBarcode && (
                  <div className="p-3 bg-primary/10 border border-primary rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ScanBarcode className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Barcode scanned: {scannedBarcode}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setScannedBarcode(null);
                        setProductFound(null);
                        setFormData({ ...formData, notes: '' });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Flour, Milk, Eggs"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  placeholder="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                  <SelectTrigger id="unit">
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
              <Label htmlFor="location">Location</Label>
              {!showAddLocation ? (
                <>
                  <Select value={formData.location_id} onValueChange={(value) => {
                    if (value === 'add_new') {
                      setShowAddLocation(true);
                    } else {
                      setFormData({ ...formData, location_id: value });
                    }
                  }} required>
                    <SelectTrigger id="location">
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
                  {locations.length === 0 && (
                    <p className="text-xs text-amber-700">No locations available. Please add a location below.</p>
                  )}
                </>
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
                          const maxOrder = locations.length > 0 ? Math.max(...locations.map(loc => loc.display_order || 0)) : -1;
                          const { data, error } = await supabase.from('pantry_locations').insert({
                            household_id: currentHousehold!.id,
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
              <Label htmlFor="expiration_date">Expiration Date (Optional)</Label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
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
                <Button
                  type="submit"
                  disabled={loading || !formData.name.trim() || !formData.quantity.trim() || !formData.location_id}
                >
                  {loading ? 'Adding...' : 'Add Item'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="scan">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Manual Barcode Entry</Label>
                <p className="text-sm text-muted-foreground">
                  Type or paste a barcode number
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter barcode number"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && manualBarcode.trim()) {
                        setScannedBarcode(manualBarcode.trim());
                        lookupProduct(manualBarcode.trim());
                        setManualBarcode('');
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      if (manualBarcode.trim()) {
                        setScannedBarcode(manualBarcode.trim());
                        lookupProduct(manualBarcode.trim());
                        setManualBarcode('');
                      }
                    }}
                    disabled={!manualBarcode.trim() || lookingUpProduct}
                    type="button"
                  >
                    Lookup
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or scan with camera</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Scan Product Barcode</Label>
                <p className="text-sm text-muted-foreground">
                  Point your camera at a product barcode to scan it
                </p>
              </div>

              {!scanning ? (
                <Button onClick={startScanner} className="w-full" type="button">
                  <ScanBarcode className="h-4 w-4 mr-2" />
                  Start Camera
                </Button>
              ) : (
                <>
                  <div
                    id="barcode-reader"
                    className="w-full rounded-lg overflow-hidden border-2 border-primary"
                    style={{ minHeight: '300px' }}
                  ></div>
                  <Button onClick={stopScanner} variant="destructive" className="w-full" type="button">
                    Stop Scanning
                  </Button>
                </>
              )}

              {lookingUpProduct && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm">Looking up product information...</span>
                  </div>
                </div>
              )}

              {scannedBarcode && !lookingUpProduct && (
                <div className={`p-4 border-2 rounded-lg ${
                  productFound
                    ? 'bg-green-50 border-green-500'
                    : 'bg-amber-100 border-amber-600'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ScanBarcode className="h-5 w-5" />
                    <span className="font-semibold">
                      {productFound ? 'Product Found!' : 'Barcode Scanned'}
                    </span>
                  </div>
                  <p className="text-sm mb-3">Code: {scannedBarcode}</p>
                  {productFound ? (
                    <>
                      <p className="text-sm font-medium mb-2">Product details auto-filled!</p>
                      <p className="text-xs text-muted-foreground">
                        Switch to Manual Entry tab to review and complete the details
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Product not found in database. Switch to Manual Entry tab to add details manually.
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
