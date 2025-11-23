export interface HelpContent {
  title: string;
  description: string;
  features: string[];
}

export const pageHelpContent: Record<string, HelpContent> = {
  dashboard: {
    title: 'Dashboard Overview',
    description: 'Your central hub for household management and quick insights.',
    features: [
      'View customizable widgets to see what matters most',
      'Quick access to upcoming events and tasks',
      'See spending breakdowns and financial summaries',
      'Drag and drop to rearrange widgets',
      'Navigate to any section from the sidebar',
    ],
  },
  accounts: {
    title: 'Accounts & Banking',
    description: 'Track all your financial accounts in one place.',
    features: [
      'Add manual accounts (checking, savings, credit cards)',
      'Link bank accounts with Plaid (Premium feature)',
      'View account balances and transactions',
      'Set up recurring bills and payments',
      'Manage payees for easy transaction tracking',
    ],
  },
  debt: {
    title: 'Debt Payoff',
    description: 'Strategic tools to eliminate debt faster.',
    features: [
      'Track multiple debts with detailed information',
      'Choose from proven payoff strategies (Avalanche, Snowball, Snowflake)',
      'See your payoff timeline with visual charts',
      'Record payments and track progress',
      'Get a personalized debt elimination plan (Premium feature)',
    ],
  },
  budget: {
    title: 'Budget Planning',
    description: 'Create and manage your household budget.',
    features: [
      'Set up budget categories for income and expenses',
      'Define monthly budgets for each category',
      'Track actual spending vs budgeted amounts',
      'View spending trends and insights',
      'Adjust budgets as your needs change',
    ],
  },
  calendar: {
    title: 'Family Calendar',
    description: 'Keep everyone on the same page with shared events.',
    features: [
      'Create events for the whole household',
      'Assign events to specific family members',
      'Color-code events by category',
      'Set reminders for important dates',
      'View monthly, weekly, or daily schedules',
    ],
  },
  meals: {
    title: 'Meal Planning',
    description: 'Plan meals, save recipes, and create shopping lists.',
    features: [
      'Browse and search for recipes',
      'Create weekly meal plans',
      'Generate shopping lists from meal plans',
      'Save favorite recipes for quick access',
      'Integrate with pantry inventory (Elite feature)',
    ],
  },
  pantry: {
    title: 'Pantry Inventory',
    description: 'Track what you have and reduce food waste.',
    features: [
      'Scan barcodes to quickly add items',
      'Organize items by location (fridge, freezer, pantry)',
      'Track expiration dates and get alerts',
      'See what you have before shopping',
      'Link with meal planning for automatic updates (Elite feature)',
    ],
  },
  chores: {
    title: 'Chores & Tasks',
    description: 'Assign and track household responsibilities.',
    features: [
      'Create one-time or recurring chores',
      'Assign tasks to family members',
      'Award points for completed chores',
      'View leaderboards and completion stats',
      'Set up automatic chore rotations',
    ],
  },
  projects: {
    title: 'Savings Projects',
    description: 'Plan and track savings for future goals.',
    features: [
      'Create projects for major purchases or goals',
      'Set target amounts and deadlines',
      'Track contributions over time',
      'Link to specific accounts',
      'Visualize progress with charts',
    ],
  },
  profile: {
    title: 'Profile & Settings',
    description: 'Manage your account and preferences.',
    features: [
      'Update your personal information',
      'Set your timezone for accurate scheduling',
      'View security audit logs',
      'Manage account settings',
      'Access subscription details',
    ],
  },
  'manage-household': {
    title: 'Household Management',
    description: 'Control who has access and what they can do.',
    features: [
      'Invite new members via email',
      'Set member roles (admin, member, child)',
      'Customize permissions for each member',
      'Manage pending invitations',
      'Remove members if needed',
    ],
  },
  subscription: {
    title: 'Subscription Plans',
    description: 'Choose the plan that fits your household needs.',
    features: [
      'Compare Free, Basic, Premium, and Elite tiers',
      'See detailed feature comparisons',
      'Upgrade or downgrade anytime',
      'Manage billing through Stripe',
      'View current plan and connection limits',
    ],
  },
  influencer: {
    title: 'Influencer Program',
    description: 'Share HYH Hub and earn rewards.',
    features: [
      'Get your unique referral code',
      'Track signups and conversions',
      'See your earnings and payout history',
      'Access exclusive influencer tier benefits',
      'Download promotional materials',
    ],
  },
};
