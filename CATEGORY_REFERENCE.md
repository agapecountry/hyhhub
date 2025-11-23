# Transaction Categories Reference

This document lists all standardized transaction categories used throughout the application.

## Overview

- **Total Categories**: 27 (20 expense + 6 income + 1 transfer)
- **Usage**: Bills, Transactions, Budget Planning
- **Customizable**: Users can add custom categories per household

## Expense Categories (20)

| Category Name | Icon | Color | Description |
|--------------|------|-------|-------------|
| Fitness & Sports | 🏋️‍♂️ | #22c55e | Gym memberships, sports equipment, fitness classes |
| Food & Dining | 🍽️ | #f59e0b | Restaurants, takeout, dining experiences |
| Gifts | 🎁 | #ec4899 | Presents, gift cards, donations |
| Healthcare | 🏥 | #14b8a6 | Medical expenses, prescriptions, health services |
| Home Essentials | 🛒 | #10b981 | Groceries, household supplies, cleaning products |
| Housing | 🏠 | #8b5cf6 | Rent, mortgage, property taxes, HOA fees |
| Insurances | 🛡️ | #06b6d4 | Health, auto, home, life insurance |
| Investments | 📈 | #a855f7 | Stocks, bonds, retirement contributions |
| Leisure | 🎉 | #f97316 | Entertainment, hobbies, fun activities |
| Media & Streaming | 📺 | #6366f1 | Netflix, Spotify, streaming services |
| Personal Administration | 🗂️ | #64748b | Banking fees, legal services, admin costs |
| Personal Maintenance | 🧍‍♂️ | #84cc16 | Haircuts, clothing, personal care |
| Pets | 🐾 | #22c55e | Pet food, vet visits, pet supplies |
| Professional Services & Fees | ⚖️ | #3b82f6 | Lawyers, accountants, professional services |
| Savings | 🏦 | #10b981 | Emergency fund, savings goals |
| Service Subscriptions | 📅 | #8b5cf6 | Phone plans, software subscriptions, memberships |
| Technology | 💻 | #6366f1 | Electronics, software, tech services |
| Transportation | 🚗 | #3b82f6 | Gas, car payments, public transit, rideshare |
| Unexpected | ⚠️ | #ef4444 | Emergency expenses, unexpected costs |
| Utilities | 💡 | #eab308 | Electric, water, gas, internet, phone |

## Income Categories (6)

| Category Name | Icon | Color | Description |
|--------------|------|-------|-------------|
| Salary | 💰 | #10b981 | Regular employment income |
| Freelance | 💼 | #3b82f6 | Contract work, gig economy income |
| Investment Returns | 📈 | #8b5cf6 | Dividends, capital gains, interest |
| Bonus | 🎉 | #f59e0b | Work bonuses, performance incentives |
| Refund | ↩️ | #06b6d4 | Tax refunds, purchase refunds |
| Other Income | 💵 | #22c55e | Miscellaneous income sources |

## Transfer Category (1)

| Category Name | Icon | Color | Description |
|--------------|------|-------|-------------|
| Transfer | 🔄 | #64748b | Moving money between accounts |

## Removed Duplicates

The following old category names have been consolidated:

| Old Name | New Name | Reason |
|----------|----------|--------|
| Insurance | Insurances | More accurate plural form |
| Pet Care | Pets | Shorter, clearer |
| Subscriptions | Service Subscriptions | Distinguishes from media subscriptions |
| Dining Out | Food & Dining | More comprehensive |
| Rent/Mortgage | Housing | Includes all housing costs |

## Usage in Application

### Bills & Transactions
- Select category from dropdown when creating bills or transactions
- Categories help track spending patterns
- Used for reporting and analysis

### Budget Planning
- Choose expense categories to budget for
- Set monthly amount and due date
- Links to transaction category for consistent naming

### Custom Categories
- Admins and co-parents can create custom categories
- Custom categories are household-specific
- Cannot delete default categories (is_default=true)

## Database Structure

```sql
-- Transaction Categories (source of truth)
transaction_categories
  - id, household_id, name, type, icon, color, is_default

-- Budget Categories (amounts only)
budget_categories
  - id, household_id, transaction_category_id
  - monthly_amount, due_date
  - Inherits: name, icon, color from transaction_category

-- View for easy queries
budget_categories_with_details
  - Joins budget + transaction categories
  - Single view with all display information
```
