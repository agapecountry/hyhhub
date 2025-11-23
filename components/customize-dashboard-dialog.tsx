'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { useHousehold } from '@/lib/household-context';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface DashboardWidget {
  widget_key: string;
  display_name: string;
  description: string;
  category: string;
  default_enabled: boolean;
}

interface UserPreference {
  widget_key: string;
  is_visible: boolean;
  sort_order: number;
}

interface CustomizeDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CustomizeDashboardDialog({ open, onOpenChange, onSuccess }: CustomizeDashboardDialogProps) {
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open && user && currentHousehold) {
      loadWidgetsAndPreferences();
    }
  }, [open, user, currentHousehold]);

  const loadWidgetsAndPreferences = async () => {
    if (!user || !currentHousehold) return;

    try {
      const { data: widgetsData, error: widgetsError } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .order('category', { ascending: true })
        .order('display_name', { ascending: true });

      if (widgetsError) throw widgetsError;

      const { data: prefsData, error: prefsError } = await supabase
        .from('user_dashboard_preferences')
        .select('widget_key, is_visible, sort_order')
        .eq('user_id', user.id)
        .eq('household_id', currentHousehold.id);

      if (prefsError) throw prefsError;

      setWidgets(widgetsData || []);

      const prefsMap: Record<string, boolean> = {};
      if (prefsData && prefsData.length > 0) {
        prefsData.forEach((pref) => {
          prefsMap[pref.widget_key] = pref.is_visible;
        });
      } else {
        widgetsData?.forEach((widget) => {
          prefsMap[widget.widget_key] = widget.default_enabled;
        });
      }

      setPreferences(prefsMap);
    } catch (error: any) {
      console.error('Error loading widgets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard settings',
        variant: 'destructive',
      });
    }
  };

  const handleToggle = (widgetKey: string, value: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [widgetKey]: value,
    }));
  };

  const handleSave = async () => {
    if (!user || !currentHousehold) return;

    setLoading(true);
    try {
      const prefsToUpsert = Object.entries(preferences).map(([widget_key, is_visible], index) => ({
        user_id: user.id,
        household_id: currentHousehold.id,
        widget_key,
        is_visible,
        sort_order: index,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('user_dashboard_preferences')
        .upsert(prefsToUpsert, {
          onConflict: 'user_id,household_id,widget_key',
        });

      if (error) throw error;

      toast({
        title: 'Dashboard Updated',
        description: 'Your dashboard preferences have been saved',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save dashboard preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const groupedWidgets = widgets.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, DashboardWidget[]>);

  const categoryLabels: Record<string, string> = {
    financial: 'Financial Widgets',
    household: 'Household Widgets',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Choose which widgets to display on your dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(groupedWidgets).map(([category, categoryWidgets]) => (
            <div key={category} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {categoryLabels[category] || category}
              </h3>
              <div className="space-y-3">
                {categoryWidgets.map((widget) => (
                  <div
                    key={widget.widget_key}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={widget.widget_key}
                        className="text-base font-medium cursor-pointer"
                      >
                        {widget.display_name}
                      </Label>
                      {widget.description && (
                        <p className="text-sm text-muted-foreground">
                          {widget.description}
                        </p>
                      )}
                    </div>
                    <Switch
                      id={widget.widget_key}
                      checked={preferences[widget.widget_key] ?? widget.default_enabled}
                      onCheckedChange={(value) => handleToggle(widget.widget_key, value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
