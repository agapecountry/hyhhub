'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useHousehold } from '@/lib/household-context';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomizeDashboardDialog } from '@/components/customize-dashboard-dialog';
import { UpcomingWeekWidget } from '@/components/upcoming-week-widget';
import { PageHelpDialog } from '@/components/page-help-dialog';
import { pageHelpContent } from '@/lib/page-help-content';
import { DollarSign, CreditCard, ChefHat, CheckSquare, Calendar as CalendarIcon, Package, Settings } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentHousehold, loading: householdLoading } = useHousehold();
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState({
    totalAccounts: 0,
    totalBalance: 0,
    activeLoans: 0,
    upcomingEvents: 0,
    recipes: 0,
    pendingChores: 0,
    pantryItems: 0,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !currentHousehold) return;

    const loadPreferences = async () => {
      const { data: prefsData } = await supabase
        .from('user_dashboard_preferences')
        .select('widget_key, is_visible')
        .eq('user_id', user.id)
        .eq('household_id', currentHousehold.id);

      if (prefsData && prefsData.length > 0) {
        const prefsMap: Record<string, boolean> = {};
        prefsData.forEach((pref) => {
          prefsMap[pref.widget_key] = pref.is_visible;
        });
        setVisibleWidgets(prefsMap);
      } else {
        setVisibleWidgets({
          total_balance: true,
          active_loans: true,
          recipes: true,
          upcoming_events: true,
          pending_chores: true,
          pantry_items: true,
        });
      }
    };

    loadPreferences();
  }, [user, currentHousehold]);

  useEffect(() => {
    if (!currentHousehold) return;

    const fetchStats = async () => {
      const [accounts, debts, events, recipes, chores, pantry] = await Promise.all([
        supabase.from('accounts').select('balance', { count: 'exact' }).eq('household_id', currentHousehold.id),
        supabase.from('debts').select('*', { count: 'exact' }).eq('household_id', currentHousehold.id).eq('is_active', true),
        supabase.from('calendar_events').select('*', { count: 'exact' }).eq('household_id', currentHousehold.id).gte('start_time', new Date().toISOString()),
        supabase.from('recipes').select('*', { count: 'exact' }).eq('household_id', currentHousehold.id),
        supabase.from('chore_assignments').select('*', { count: 'exact' }).eq('household_id', currentHousehold.id).eq('completed', false),
        supabase.from('pantry_items').select('*', { count: 'exact' }).eq('household_id', currentHousehold.id),
      ]);

      const totalBalance = accounts.data?.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0) || 0;

      setStats({
        totalAccounts: accounts.count || 0,
        totalBalance,
        activeLoans: debts.count || 0,
        upcomingEvents: events.count || 0,
        recipes: recipes.count || 0,
        pendingChores: chores.count || 0,
        pantryItems: pantry.count || 0,
      });
    };

    fetchStats();
  }, [currentHousehold]);

  const isWidgetVisible = (widgetKey: string): boolean => {
    return visibleWidgets[widgetKey] ?? true;
  };

  if (authLoading || householdLoading) {
    return null;
  }

  // Show message if no household is available
  if (!currentHousehold) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No Household Found</CardTitle>
              <CardDescription>
                You don't have access to any households yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Create a household or ask to be invited to an existing one.
              </p>
              <Button onClick={() => router.push('/dashboard/manage-household')}>
                Manage Households
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">
              {currentHousehold?.name}
            </h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's happening in your household.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PageHelpDialog content={pageHelpContent.dashboard} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomizeDialogOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Customize
            </Button>
          </div>
        </div>

        <UpcomingWeekWidget />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" style={{ minHeight: '140px' }}>
          {isWidgetVisible('total_balance') && (
              <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/dashboard/accounts')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.totalBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across {stats.totalAccounts} accounts
                  </p>
                </CardContent>
              </Card>
            )}

          {isWidgetVisible('active_loans') && (
              <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/dashboard/debt')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeLoans}</div>
                  <p className="text-xs text-muted-foreground">
                    Debt accounts to manage
                  </p>
                </CardContent>
              </Card>
            )}

          {isWidgetVisible('recipes') && (
              <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/dashboard/meals')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recipes</CardTitle>
                  <ChefHat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.recipes}</div>
                  <p className="text-xs text-muted-foreground">
                    Saved in your collection
                  </p>
                </CardContent>
              </Card>
            )}

          {isWidgetVisible('upcoming_events') && (
            <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/dashboard/calendar')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
                <p className="text-xs text-muted-foreground">
                  On your calendar
                </p>
              </CardContent>
            </Card>
          )}

          {isWidgetVisible('pending_chores') && (
            <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/dashboard/chores')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Chores</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingChores}</div>
                <p className="text-xs text-muted-foreground">
                  Waiting to be completed
                </p>
              </CardContent>
            </Card>
          )}

          {isWidgetVisible('pantry_items') && (
            <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => router.push('/dashboard/pantry')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pantry Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pantryItems}</div>
                <p className="text-xs text-muted-foreground">
                  Items in your inventory
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2" style={{ minHeight: '320px' }}>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <span className="text-sm">Add a transaction</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <span className="text-sm">Plan a meal</span>
                <ChefHat className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <span className="text-sm">Create an event</span>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                <span className="text-sm">Assign a chore</span>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Set up your household management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <p className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                  Connect your bank accounts in Budget
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                  Add your favorite recipes to Meal Planning
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
                  Invite family members to collaborate
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">4</span>
                  Set up recurring chores and rewards
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CustomizeDashboardDialog
        open={customizeDialogOpen}
        onOpenChange={setCustomizeDialogOpen}
        onSuccess={() => {
          if (user && currentHousehold) {
            const loadPreferences = async () => {
              const { data: prefsData } = await supabase
                .from('user_dashboard_preferences')
                .select('widget_key, is_visible')
                .eq('user_id', user.id)
                .eq('household_id', currentHousehold.id);

              if (prefsData) {
                const prefsMap: Record<string, boolean> = {};
                prefsData.forEach((pref) => {
                  prefsMap[pref.widget_key] = pref.is_visible;
                });
                setVisibleWidgets(prefsMap);
              }
            };
            loadPreferences();
          }
        }}
      />
    </DashboardLayout>
  );
}
