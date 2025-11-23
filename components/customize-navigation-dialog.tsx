'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useHousehold } from '@/lib/household-context';
import { toast } from 'sonner';

interface NavigationSection {
  id: string;
  name: string;
  description: string;
}

const navigationSections: NavigationSection[] = [
  { id: 'accounts', name: 'Accounts', description: 'Manage bank accounts and transactions' },
  { id: 'debt', name: 'Debt Payoff', description: 'Track and manage debt payments' },
  { id: 'projects', name: 'Projects & Plans', description: 'Savings projects and financial goals' },
  { id: 'meals', name: 'Meal Planning', description: 'Plan meals and manage recipes' },
  { id: 'pantry', name: 'Pantry', description: 'Track pantry inventory' },
  { id: 'calendar', name: 'Calendar', description: 'View and manage household events' },
  { id: 'chores', name: 'Chores', description: 'Assign and track household chores' },
];

export function CustomizeNavigationDialog() {
  const { user } = useAuth();
  const { currentHousehold } = useHousehold();
  const [open, setOpen] = useState(false);
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user && currentHousehold) {
      loadPreferences();
    }
  }, [open, user, currentHousehold]);

  const loadPreferences = async () => {
    if (!user || !currentHousehold) return;

    try {
      const { data, error } = await supabase
        .from('user_navigation_preferences')
        .select('hidden_sections')
        .eq('user_id', user.id)
        .eq('household_id', currentHousehold.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHiddenSections(data.hidden_sections || []);
      } else {
        setHiddenSections([]);
      }
    } catch (error) {
      console.error('Error loading navigation preferences:', error);
      toast.error('Failed to load navigation preferences');
    }
  };

  const handleToggleSection = (sectionId: string) => {
    setHiddenSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleSave = async () => {
    if (!user || !currentHousehold) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_navigation_preferences')
        .upsert(
          {
            user_id: user.id,
            household_id: currentHousehold.id,
            hidden_sections: hiddenSections,
          },
          {
            onConflict: 'user_id,household_id',
          }
        );

      if (error) throw error;

      toast.success('Navigation preferences saved');
      setOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error saving navigation preferences:', error);
      toast.error('Failed to save navigation preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Customize Navigation" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Customize Navigation</DialogTitle>
          <DialogDescription>
            Hide sections you don't use to simplify your navigation menu
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {navigationSections.map((section) => (
            <div key={section.id} className="flex items-start space-x-3">
              <Checkbox
                id={section.id}
                checked={!hiddenSections.includes(section.id)}
                onCheckedChange={() => handleToggleSection(section.id)}
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={section.id}
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {section.name}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
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
