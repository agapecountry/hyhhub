'use client';

import { useAuth } from '@/lib/auth-context';
import { useHousehold } from '@/lib/household-context';
import { useSubscription } from '@/lib/subscription-context';
import { Button } from '@/components/ui/button';
import { HouseholdSwitcher } from './household-switcher';
import { CustomizeNavigationDialog } from './customize-navigation-dialog';
import { Chrome as Home, DollarSign, CreditCard, ChefHat, Package, Calendar, SquareCheck as CheckSquare, LogOut, Menu, User, Building2, Crown, TrendingUp, Target, Wallet, PanelLeftClose, PanelLeft, BookOpen } from 'lucide-react';
import { HYHIcon } from './hyh-logo';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/lib/supabase';

const navigation = [
  { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: Home, alwaysShow: true },
  { id: 'accounts', name: 'Accounts', href: '/dashboard/accounts', icon: DollarSign },
  { id: 'budget', name: 'Budget', href: '/dashboard/budget', icon: Wallet },
  { id: 'debt', name: 'Debt Payoff', href: '/dashboard/debt', icon: CreditCard },
  { id: 'projects', name: 'Projects & Plans', href: '/dashboard/projects', icon: Target, requiresElite: true },
  { id: 'meals', name: 'Meal Planning', href: '/dashboard/meals', icon: ChefHat },
  { id: 'pantry', name: 'Pantry', href: '/dashboard/pantry', icon: Package },
  { id: 'calendar', name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { id: 'chores', name: 'Chores', href: '/dashboard/chores', icon: CheckSquare },
  { id: 'journal', name: 'Notes & Journal', href: '/dashboard/journal', icon: BookOpen },
  { id: 'subscription', name: 'Subscription', href: '/dashboard/subscription', icon: Crown, alwaysShow: true },
  { id: 'influencer', name: 'Influencer', href: '/dashboard/influencer', icon: TrendingUp, requiresInfluencer: true },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const { currentHousehold } = useHousehold();
  const { tier } = useSubscription();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const [navCollapsed, setNavCollapsed] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && currentHousehold) {
      loadNavigationPreferences();
    }
  }, [user, currentHousehold]);

  const loadNavigationPreferences = async () => {
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
      }
    } catch (error) {
      console.error('Error loading navigation preferences:', error);
    }
  };

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        if (item.requiresElite && !tier?.features.projects_savings_tracking) {
          return null;
        }

        if (item.requiresInfluencer && !tier?.is_influencer_tier) {
          return null;
        }

        if (!item.alwaysShow && hiddenSections.includes(item.id)) {
          return null;
        }

        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-accent'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 md:h-16 items-center gap-2 md:gap-4 px-3 md:px-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="touch-target">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <div className="flex flex-col gap-4">
                <Link href="/dashboard" className="flex items-center gap-2 px-2">
                  <HYHIcon size={32} />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#1e3a4c] leading-tight">Handle Your House</span>
                    <span className="text-xs text-[#178b9c]">by Agape Country Farms</span>
                  </div>
                </Link>
                <nav className="flex flex-col gap-2">
                  <NavLinks />
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
            <HYHIcon size={28} className="md:w-8 md:h-8" />
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="text-xs md:text-sm font-bold text-[#1e3a4c] leading-tight truncate">Handle Your House</span>
              <span className="text-[10px] md:text-xs text-[#178b9c] truncate">by Agape Country Farms</span>
            </div>
          </Link>

          <div className="flex-1" />

          <HouseholdSwitcher />

          <Button variant="ghost" size="icon" asChild title="Profile" className="touch-target">
            <Link href="/dashboard/profile">
              <User className="h-5 w-5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" onClick={() => signOut()} title="Sign Out" className="touch-target">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="container flex gap-4 md:gap-6 px-3 md:px-4 py-4 md:py-6">
        {!navCollapsed && (
          <aside className="hidden md:block w-64 space-y-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-sm font-medium text-muted-foreground">Navigation</span>
              <div className="flex items-center gap-1">
                <CustomizeNavigationDialog />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setNavCollapsed(true)}
                  title="Hide Navigation"
                  className="h-8 w-8"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <nav className="flex flex-col gap-2">
              <NavLinks />
            </nav>
          </aside>
        )}

        {navCollapsed && (
          <aside className="hidden md:flex flex-col items-center w-12 space-y-4 pt-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNavCollapsed(false)}
              title="Show Navigation"
              className="h-8 w-8"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </aside>
        )}

        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          {!currentHousehold ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Home className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No Household Selected</h2>
              <p className="text-muted-foreground mb-6">
                Create or select a household to start managing
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          {[
            { id: 'dashboard', name: 'Home', href: '/dashboard', icon: Home },
            { id: 'accounts', name: 'Accounts', href: '/dashboard/accounts', icon: DollarSign },
            { id: 'budget', name: 'Budget', href: '/dashboard/budget', icon: Wallet },
            { id: 'meals', name: 'Meals', href: '/dashboard/meals', icon: ChefHat },
            { id: 'calendar', name: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
          ].map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors touch-target min-w-[60px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'scale-110')} />
                <span className="text-[10px] font-medium truncate w-full text-center">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
