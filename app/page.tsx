'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Calendar, UtensilsCrossed, ListChecks, Wallet, Users, Target, BookOpen } from 'lucide-react';
import { HYHLogo, HYHIcon } from '@/components/hyh-logo';
import Link from 'next/link';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50">
        <div className="text-center">
          <HYHIcon size={80} className="mx-auto mb-4" />
          <div className="animate-pulse text-slate-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-teal-50">
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HYHIcon size={40} />
            <div className="flex flex-col">
              <span className="text-base font-bold text-[#1e3a4c] leading-tight">Handle Your House</span>
              <span className="text-xs text-[#178b9c]">by Agape Country Farms</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => router.push('/login')}>
              Sign In
            </Button>
            <Button onClick={() => router.push('/signup')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="mb-8">
            <HYHLogo size={150} showText={false} className="mx-auto" />
          </div>
          <div className="space-y-4">
            <h2 className="text-5xl font-bold text-[#1e3a4c]">
              Handle Your House
            </h2>
            <p className="text-base text-[#178b9c] font-medium">by Agape Country Farms</p>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              All of it, in one place. Manage budgets, meals, chores, calendars, and more for all your households.
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <Button size="lg" onClick={() => router.push('/signup')}>
              Start Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/login')}>
              Sign In
            </Button>
            <Link href="/story">
              <Button size="lg" variant="ghost" className="gap-2">
                <BookOpen className="h-5 w-5" />
                Our Story
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
              <Calendar className="h-12 w-12 text-[#178b9c] mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Shared Calendar</h3>
              <p className="text-sm text-muted-foreground">
                Keep everyone synchronized with events, appointments, and schedules.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
              <UtensilsCrossed className="h-12 w-12 text-[#178b9c] mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Meal Planning</h3>
              <p className="text-sm text-muted-foreground">
                Plan meals, manage pantry inventory, and discover new recipes.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
              <ListChecks className="h-12 w-12 text-[#178b9c] mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Chore Management</h3>
              <p className="text-sm text-muted-foreground">
                Assign tasks, track completion, and reward contributions.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
              <Wallet className="h-12 w-12 text-[#178b9c] mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Budget Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Monitor spending, set budgets, and achieve financial goals together.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
              <Users className="h-12 w-12 text-[#178b9c] mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Multiple Households</h3>
              <p className="text-sm text-muted-foreground">
                Manage all your households from a single account with ease.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
              <Target className="h-12 w-12 text-[#178b9c] mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Debt Payoff</h3>
              <p className="text-sm text-muted-foreground">
                Track debts, manage payoff strategies, and achieve financial freedom.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-6 text-center text-sm text-slate-600 border-t border-slate-200">
        <div className="flex flex-col gap-3">
          <div className="flex justify-center gap-6">
            <Link href="/story" className="hover:text-[#178b9c] transition-colors">
              Our Story
            </Link>
          </div>
          <p>&copy; 2025 Handle Your House by Agape Country Farms, LLC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
