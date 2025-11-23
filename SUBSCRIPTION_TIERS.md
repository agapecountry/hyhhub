# Subscription Tier Features

This document outlines the features available in each subscription tier.

## Tier Overview

| Tier | Price (Monthly) | Price (Annual) | Target Audience |
|------|----------------|----------------|-----------------|
| **Free** | $0 | $0 | Basic users trying the app |
| **Basic** | $10 | $100 | Users needing bank connections |
| **Premium** | $15 | $150 | Power users with advanced needs |
| **Elite** | $20 | $200 | Users wanting full automation |
| **InfPrem** | $0 | $0 | Influencers (Premium features) |
| **InfElite** | $0 | $0 | Influencers (Elite features) |

## Feature Comparison

### Core Features

| Feature | Free | Basic | Premium | Elite | InfPrem | InfElite |
|---------|------|-------|---------|-------|---------|----------|
| Calendar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Meal Planning | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chores & Tasks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Household Management | Single | Single | Multiple | Multiple | Multiple | Multiple |

### Financial Features

| Feature | Free | Basic | Premium | Elite | InfPrem | InfElite |
|---------|------|-------|---------|-------|---------|----------|
| Bank Connections (Plaid) | Manual only | 2 | 4 | 10 | 4 | 10 |
| Auto-Refresh Accounts | ❌ | Manual | On Load | ✅ | On Load | ✅ |
| Auto-Refresh Loans | ❌ | ❌ | Manual | ✅ | Manual | ✅ |
| Debt Payoff Strategies | ❌ | ❌ | Avalanche, Snowball, Snowflake | All + Payoff Plan | Avalanche, Snowball, Snowflake | All + Payoff Plan |
| Paycheck Planner | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |

### Advanced Features

| Feature | Free | Basic | Premium | Elite | InfPrem | InfElite |
|---------|------|-------|---------|-------|---------|----------|
| Projects & Plans Tracking | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Pantry Tracking | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Meal-Pantry-Grocery Integration | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |

## Feature Details

### Core Features
- **Calendar**: Shared household calendar for events, appointments, and reminders
- **Meal Planning**: Plan weekly meals for the family
- **Chores & Tasks**: Assign and track household chores with rewards system
- **Household Management**:
  - Single: One household only
  - Multiple: Switch between multiple households

### Financial Features
- **Bank Connections (Plaid)**: Number of bank/loan accounts that can be connected
  - "Manual only" means no automatic connections via Plaid (Free tier)
  - Numbers indicate maximum Plaid connections allowed
- **Auto-Refresh Accounts**:
  - ❌: No automatic refresh available
  - Manual: User must manually click refresh button
  - On Load: Automatically refreshes when account page loads (Premium+)
  - ✅: Automatic daily background sync (Elite only)
- **Auto-Refresh Loans**: Same as above but for loan/debt accounts
  - ❌: Not available (Free, Basic)
  - Manual: Manual refresh only (Premium)
  - ✅: Automatic daily sync (Elite only)
- **Debt Payoff Strategies**:
  - ❌: No debt strategies (Free, Basic)
  - **Avalanche**: Pay off highest interest rate first (saves most money)
  - **Snowball**: Pay off smallest balance first (psychological wins)
  - **Snowflake**: Apply extra payments strategically
  - **Highest Balance**: Pay off largest debt first (Elite only)
  - **Custom**: Create your own payment strategy (Elite only)
  - **Payoff Plan**: Enhanced debt payoff integrated with paycheck planner (Elite only)
- **Paycheck Planner**: Schedule bill payments based on paycheck dates (Elite only)
  - Elite tier includes integrated debt payoff planning

### Advanced Features
- **Projects & Plans Tracking**: Set savings goals for vacations, purchases, or emergencies (Premium+)
- **Pantry Tracking**: Track food inventory and expiration dates with barcode scanning (Premium+)
- **Meal-Pantry-Grocery Integration**: Automatically generate grocery lists from meal plans and pantry inventory (Elite only)

## Pricing

| Tier | Monthly | Annual | Annual Savings |
|------|---------|--------|----------------|
| Free | $0 | $0 | - |
| Basic | $10 | $100 | $20 (17%) |
| Premium | $15 | $150 | $30 (17%) |
| Elite | $20 | $200 | $40 (17%) |

## Tier Progression Guide

### Free → Basic ($10/mo)
**What you gain:**
- 2 Plaid bank connections
- Manual account refresh capability

**Good for:** Users who want to connect 1-2 bank accounts for basic tracking

### Basic → Premium ($5/mo more)
**What you gain:**
- Multiple household support
- 2 additional Plaid connections (4 total)
- Auto-refresh on account load
- Manual loan refresh
- Debt payoff strategies (Avalanche, Snowball, Snowflake)
- Projects & savings tracking
- Pantry tracking

**Good for:** Families managing multiple people or users with debt payoff goals

### Premium → Elite ($5/mo more)
**What you gain:**
- 6 additional Plaid connections (10 total)
- Full automatic daily refresh for accounts and loans
- All debt strategies including custom plans
- Paycheck planner with debt integration
- Meal-Pantry-Grocery full integration

**Good for:** Power users wanting complete automation and advanced planning tools

## Influencer Tiers

### Purpose
Influencer tiers provide free access to premium features for content creators who promote the app.

### Requirements
- Active influencer code
- Content creation agreement
- Promotional activities

### Feature Parity
- **InfPrem**: Identical features to Premium tier (no cost)
- **InfElite**: Identical features to Elite tier (no cost)

### Automatic Synchronization
A database migration ensures influencer tier features automatically match their paid equivalents:
- When Premium features are updated, InfPrem receives the same updates
- When Elite features are updated, InfElite receives the same updates
- This ensures influencers always have the full experience to showcase

## Feature Flag Reference

For developers, here are the feature flags used in the database:

```typescript
interface TierFeatures {
  // Core Features
  calendar_enabled: boolean;
  meal_planning_enabled: boolean;
  chores_enabled: boolean;
  household_multi_user: boolean;

  // Bank Connection Features
  plaid_enabled: boolean;
  plaid_connection_limit: number;
  manual_refresh_accounts: boolean;
  auto_refresh_accounts: boolean;
  auto_refresh_on_load: boolean;
  manual_refresh_loans: boolean;
  auto_refresh_loans: boolean;

  // Debt Management
  debt_strategies: string[]; // ['avalanche', 'snowball', 'snowflake', 'highest_balance', 'custom']
  personalized_debt_plan: boolean;
  paycheck_planner: boolean;

  // Advanced Features
  pantry_tracking: boolean;
  meal_pantry_integration: boolean;
  meal_pantry_grocery_integration: boolean;
  projects_savings_tracking: boolean;
}
```

## Tier-Specific Feature Access

### Free Tier
```json
{
  "calendar_enabled": true,
  "meal_planning_enabled": true,
  "chores_enabled": true,
  "household_multi_user": false,
  "plaid_enabled": false,
  "debt_strategies": [],
  "paycheck_planner": false,
  "pantry_tracking": false,
  "projects_savings_tracking": false
}
```

### Basic Tier
```json
{
  "plaid_enabled": true,
  "plaid_connection_limit": 2,
  "manual_refresh_accounts": true,
  "debt_strategies": []
}
```

### Premium Tier
```json
{
  "household_multi_user": true,
  "plaid_connection_limit": 4,
  "auto_refresh_on_load": true,
  "manual_refresh_loans": true,
  "debt_strategies": ["avalanche", "snowball", "snowflake"],
  "pantry_tracking": true,
  "projects_savings_tracking": true
}
```

### Elite Tier
```json
{
  "plaid_connection_limit": 10,
  "auto_refresh_accounts": true,
  "auto_refresh_loans": true,
  "debt_strategies": ["avalanche", "snowball", "snowflake", "highest_balance", "custom"],
  "personalized_debt_plan": true,
  "paycheck_planner": true,
  "meal_pantry_grocery_integration": true
}
```

## Future Feature Additions

When adding new features:
1. Add feature flag to appropriate paid tier(s)
2. Ensure the same flag is added to corresponding influencer tier(s)
3. Document the feature in this file
4. Update the subscription comparison table in the UI

### Example Migration Pattern

```sql
-- Add feature to Premium
UPDATE subscription_tiers
SET features = jsonb_set(features, '{new_feature}', 'true'::jsonb)
WHERE name = 'premium';

-- Add feature to InfPrem (keep in sync!)
UPDATE subscription_tiers
SET features = jsonb_set(features, '{new_feature}', 'true'::jsonb)
WHERE name = 'infprem';

-- If Elite-only feature:
UPDATE subscription_tiers
SET features = jsonb_set(features, '{elite_feature}', 'true'::jsonb)
WHERE name IN ('elite', 'infelite');
```
