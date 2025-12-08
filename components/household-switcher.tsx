'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHousehold } from '@/lib/household-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Home, Plus, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

export function HouseholdSwitcher() {
  const router = useRouter();
  const { households, currentHousehold, switchHousehold, refreshHouseholds } = useHousehold();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showNewHouseholdDialog, setShowNewHouseholdDialog] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim() || !user) {
      console.log('Cannot create household:', { hasName: !!newHouseholdName.trim(), hasUser: !!user });
      return;
    }

    console.log('Creating household:', newHouseholdName);
    setLoading(true);
    try {
      // Generate a UUID for the new household
      const householdId = crypto.randomUUID();
      
      const { error: householdError } = await supabase
        .from('households')
        .insert({ id: householdId, name: newHouseholdName.trim() });

      if (householdError) {
        console.error('Household creation error:', householdError);
        throw householdError;
      }

      console.log('Household created with id:', householdId);

      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: householdId,
          user_id: user.id,
          role: 'admin',
        });

      if (memberError) {
        console.error('Member creation error:', memberError);
        throw memberError;
      }

      console.log('Member added successfully');

      // Copy user's subscription to the new household
      // First, find the user's existing subscription from any household they own
      const { data: existingSubscription } = await supabase
        .from('household_subscriptions')
        .select('tier_id, status, billing_period, current_period_start, current_period_end')
        .eq('subscription_owner_id', user.id)
        .eq('status', 'active')
        .order('current_period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSubscription) {
        // Copy the subscription to the new household
        const { error: subError } = await supabase
          .from('household_subscriptions')
          .insert({
            household_id: householdId,
            tier_id: existingSubscription.tier_id,
            subscription_owner_id: user.id,
            status: existingSubscription.status,
            billing_period: existingSubscription.billing_period || 'monthly',
            current_period_start: existingSubscription.current_period_start,
            current_period_end: existingSubscription.current_period_end,
          });

        if (subError) {
          console.error('Subscription copy error:', subError);
          // Don't throw - household is created, just log the error
        } else {
          console.log('Subscription copied to new household');
        }
      }

      await refreshHouseholds();
      switchHousehold(householdId);
      setShowNewHouseholdDialog(false);
      setNewHouseholdName('');
      toast({
        title: 'Household Created',
        description: `${newHouseholdName} has been created successfully.`,
      });
    } catch (error: any) {
      console.error('Full error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create household',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!currentHousehold ? (
        <Button
          onClick={() => {
            console.log('Create Household button clicked');
            setShowNewHouseholdDialog(true);
          }}
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Household
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="max-w-[150px] truncate">{currentHousehold.name}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Your Households</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {households.map((household) => (
              <DropdownMenuItem
                key={household.id}
                onClick={() => switchHousehold(household.id)}
                className={household.id === currentHousehold.id ? 'bg-accent' : ''}
              >
                <Home className="h-4 w-4 mr-2" />
                <span className="truncate">{household.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/manage-household')}>
              <Settings className="h-4 w-4 mr-2" />
              Manage Household
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowNewHouseholdDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Household
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={showNewHouseholdDialog} onOpenChange={setShowNewHouseholdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Household</DialogTitle>
            <DialogDescription>
              Give your household a name to get started managing it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="household-name">Household Name</Label>
              <Input
                id="household-name"
                placeholder="e.g., Main House, Cabin, Apartment"
                value={newHouseholdName}
                onChange={(e) => setNewHouseholdName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateHousehold();
                  }
                }}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewHouseholdDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreateHousehold} disabled={loading || !newHouseholdName.trim()}>
              {loading ? 'Creating...' : 'Create Household'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
