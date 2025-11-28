'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { 
  Home,
  DollarSign,
  CreditCard,
  ChefHat,
  Package,
  Calendar,
  CheckSquare,
  Target,
  BookOpen,
  MessageCircle,
  ArrowLeft,
  ExternalLink,
  Wallet,
  Crown,
  TrendingUp
} from 'lucide-react';

interface Component {
  id: string;
  name: string;
  icon: any;
  description: string;
  quickHelp: string[];
  detailPageUrl?: string; // Future: link to detailed walkthrough page
}

const components: Component[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: Home,
    description: 'Your home hub for viewing household statistics and quick access to features',
    quickHelp: [
      'Customize widgets to show the information most important to you',
      'View summary cards for accounts, debts, meals, and more',
      'Access the upcoming week widget to see bills, events, and chores',
      'Click on any widget to navigate to that section'
    ],
    detailPageUrl: '/dashboard/forum/faq/dashboard'
  },
  {
    id: 'accounts',
    name: 'Accounts',
    icon: DollarSign,
    description: 'Manage bank accounts, track transactions, and monitor balances',
    quickHelp: [
      'Connect Plaid for automatic transaction sync',
      'Add manual transactions to any account including Plaid accounts',
      'Mark transactions as cleared to track your working balance',
      'Categorize transactions for budget tracking',
      'View cleared, working, and uncleared balances'
    ],
    detailPageUrl: '/dashboard/forum/faq/accounts'
  },
  {
    id: 'budget',
    name: 'Budget',
    icon: Wallet,
    description: 'Create and manage budgets using various methods',
    quickHelp: [
      'Use the 50/30/20 budget calculator for balanced spending',
      'Zero-based budgeting for detailed control',
      'Envelope budgeting for category-specific limits',
      'Track spending against budget in real-time',
      'Set up budget alerts and notifications'
    ],
    detailPageUrl: '/dashboard/forum/faq/budget'
  },
  {
    id: 'debt',
    name: 'Debt Payoff',
    icon: CreditCard,
    description: 'Track debts and create payoff strategies',
    quickHelp: [
      'Add all your debts with balances and interest rates',
      'Use debt snowball method (lowest balance first)',
      'Use debt avalanche method (highest interest first)',
      'Track progress with visual charts',
      'Link bills to debt payments for automation'
    ],
    detailPageUrl: '/dashboard/forum/faq/debt'
  },
  {
    id: 'projects',
    name: 'Projects & Savings',
    icon: Target,
    description: 'Plan and track savings goals and projects (Elite feature)',
    quickHelp: [
      'Create savings goals with target amounts',
      'Track contributions and progress',
      'Set deadlines for goal completion',
      'View all projects in one dashboard',
      'Requires Elite subscription tier'
    ],
    detailPageUrl: '/dashboard/forum/faq/projects'
  },
  {
    id: 'meals',
    name: 'Meal Planning',
    icon: ChefHat,
    description: 'Plan meals, manage recipes, and create shopping lists',
    quickHelp: [
      'Create and save custom recipes',
      'Plan meals for the week',
      'Generate shopping lists from meal plans',
      'Track pantry items and expiration dates',
      'Share recipes with household members'
    ],
    detailPageUrl: '/dashboard/forum/faq/meals'
  },
  {
    id: 'pantry',
    name: 'Pantry',
    icon: Package,
    description: 'Manage pantry inventory with barcode scanning',
    quickHelp: [
      'Scan barcodes to quickly add items',
      'Track quantities and expiration dates',
      'Get notified when items are running low',
      'View nutritional information from scanned items',
      'Manual entry available for non-barcoded items'
    ],
    detailPageUrl: '/dashboard/forum/faq/pantry'
  },
  {
    id: 'calendar',
    name: 'Calendar',
    icon: Calendar,
    description: 'Schedule events, appointments, and household activities',
    quickHelp: [
      'Create one-time or recurring events',
      'Assign events to household members',
      'Color-code events by type',
      'Sync with bill due dates automatically',
      'View monthly, weekly, or daily layouts'
    ],
    detailPageUrl: '/dashboard/forum/faq/calendar'
  },
  {
    id: 'chores',
    name: 'Chores',
    icon: CheckSquare,
    description: 'Assign and track household chores',
    quickHelp: [
      'Create chore templates for recurring tasks',
      'Assign chores to household members',
      'Set due dates and frequencies',
      'Mark chores as complete',
      'View completion history and streaks'
    ],
    detailPageUrl: '/dashboard/forum/faq/chores'
  },
  {
    id: 'journal',
    name: 'Notes & Journal',
    icon: BookOpen,
    description: 'Keep personal notes and household journal entries',
    quickHelp: [
      'Write private or shared notes',
      'Organize notes with tags',
      'Search through all journal entries',
      'Attach notes to specific dates',
      'Export journal entries'
    ],
    detailPageUrl: '/dashboard/forum/faq/journal'
  },
  {
    id: 'subscription',
    name: 'Subscription',
    icon: Crown,
    description: 'Manage your Handle Your House subscription',
    quickHelp: [
      'View current subscription tier (Free, Premium, Elite)',
      'Compare feature availability across tiers',
      'Upgrade or downgrade subscription',
      'Manage billing information',
      'View subscription history'
    ],
    detailPageUrl: '/dashboard/forum/faq/subscription'
  }
];

export default function FAQPage() {
  const scrollToComponent = (id: string) => {
    const element = document.getElementById(`component-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">FAQ & Help Center</h1>
            <p className="text-muted-foreground">Learn about Handle Your House features and get help</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/forum">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forum
            </Link>
          </Button>
        </div>

        {/* Quick Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Navigation</CardTitle>
            <CardDescription>Jump to a specific component to learn more</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {components.map((component) => (
                <Button
                  key={component.id}
                  variant="outline"
                  size="sm"
                  onClick={() => scrollToComponent(component.id)}
                  className="justify-start"
                >
                  <component.icon className="h-4 w-4 mr-2" />
                  {component.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>New to Handle Your House? Start here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Create or Join a Household</h3>
              <p className="text-sm text-muted-foreground">
                Start by creating a new household or accepting an invitation to join an existing one. 
                You can be part of multiple households and switch between them.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Connect Your Accounts</h3>
              <p className="text-sm text-muted-foreground">
                Use Plaid to securely connect your bank accounts for automatic transaction syncing, 
                or add accounts manually.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Set Up Your Budget</h3>
              <p className="text-sm text-muted-foreground">
                Choose a budgeting method that works for you (50/30/20, Zero-Based, or Envelope) 
                and start tracking your spending.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">4. Explore Features</h3>
              <p className="text-sm text-muted-foreground">
                Check out meal planning, pantry management, chores, and other features to manage 
                your entire household in one place.
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Component Details */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Component Guides</h2>
          
          {components.map((component, index) => (
            <Card key={component.id} id={`component-${component.id}`} className="scroll-mt-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <component.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{component.name}</CardTitle>
                      <CardDescription>{component.description}</CardDescription>
                    </div>
                  </div>
                  {component.detailPageUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={component.detailPageUrl}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Full Guide
                      </Link>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <h4 className="font-semibold mb-3">Quick Tips:</h4>
                <ul className="space-y-2">
                  {component.quickHelp.map((tip, tipIndex) => (
                    <li key={tipIndex} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Common Questions */}
        <Card>
          <CardHeader>
            <CardTitle>Common Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Can I add manual transactions to Plaid accounts?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! You can add manual transactions to any account, including Plaid-connected accounts. 
                The system will automatically match duplicate transactions when Plaid syncs.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What's the difference between cleared and working balance?</h3>
              <p className="text-sm text-muted-foreground">
                The cleared balance shows only transactions you've marked as cleared (reconciled with your bank). 
                The working balance includes both cleared and pending transactions.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Who can access the community forum?</h3>
              <p className="text-sm text-muted-foreground">
                The community forum is available to Premium and Elite subscribers. Free tier users can 
                access the FAQ and help center but not the community discussions.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How do I switch between households?</h3>
              <p className="text-sm text-muted-foreground">
                Use the household switcher in the header (next to the logo) to view all households 
                you're a member of and switch between them.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Get More Help */}
        <Card>
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
            <CardDescription>Can't find what you're looking for?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/dashboard/forum">
                <MessageCircle className="h-4 w-4 mr-2" />
                Ask in the Community Forum
              </Link>
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Available for Premium and Elite subscribers
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
