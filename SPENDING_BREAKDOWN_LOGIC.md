# Spending Breakdown Widget - Deduplication Logic

## Overview

The Spending Breakdown Widget aggregates spending data from multiple sources while ensuring no double-counting occurs. It pulls from transactions, debts, bills, and budget categories to provide a comprehensive view of household spending.

## Data Sources

### 1. Transactions (Primary Source)
- **Table**: `transactions`
- **Priority**: Highest (actual spending)
- **What it includes**: All bank account transactions with negative amounts (expenses)
- **Key fields**:
  - `amount` (negative for expenses)
  - `category_id` (links to transaction_categories)
  - `debt_id` (links to debts)
  - `payee_id` (links to payees, which may link to debts or bills)
  - `date` (transaction date)

### 2. Debts
- **Table**: `debts`
- **Priority**: Secondary (only if no transaction exists)
- **What it includes**: Minimum debt payments for active debts
- **Key fields**:
  - `minimum_payment` (monthly payment amount)
  - `payment_day` (day of month payment is due)
  - `is_active` (only active debts)

### 3. Bills
- **Table**: `bills`
- **Priority**: Secondary (only if no transaction exists)
- **What it includes**: Recurring bill payments
- **Key fields**:
  - `amount` (bill amount)
  - `due_date` (day of month bill is due)
  - `is_active` (only active bills)
  - `category_id` (links to transaction_categories)

### 4. Budget Categories
- **Table**: `budget_categories`
- **Priority**: Informational only (NOT included in spending totals)
- **Purpose**: For planning, not actual spending tracking
- **Note**: Budget categories are displayed separately on the budget page but do not contribute to the spending breakdown totals

## Deduplication Logic

The database function `get_spending_breakdown()` implements a three-tier deduplication strategy:

### Tier 1: Transactions (Always Included)
All actual transactions are included as they represent real spending. These are the source of truth.

```sql
-- Get all expense transactions
SELECT * FROM transactions
WHERE amount < 0  -- Expenses are negative
  AND date BETWEEN start_date AND end_date
```

### Tier 2: Debt Payments (Only if No Transaction Exists)
Debt minimum payments are only included if:
1. The debt is active and has a payment_day in the date range
2. **AND** no transaction references this debt (via `debt_id`)
3. **AND** no transaction references this debt via a payee (via `payee_id` → `debt_id`)

```sql
-- Only include debts WITHOUT corresponding transactions
SELECT * FROM debts d
WHERE d.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.debt_id = d.id  -- Direct link
      AND t.date BETWEEN start_date AND end_date
  )
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    INNER JOIN payees p ON t.payee_id = p.id
    WHERE p.debt_id = d.id  -- Indirect link via payee
      AND t.date BETWEEN start_date AND end_date
  )
```

### Tier 3: Bills (Only if No Transaction Exists)
Bill payments are only included if:
1. The bill is active and has a due_date in the date range
2. **AND** no transaction references this bill via a payee (via `payee_id` → `bill_id`)

```sql
-- Only include bills WITHOUT corresponding transactions
SELECT * FROM bills b
WHERE b.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    INNER JOIN payees p ON t.payee_id = p.id
    WHERE p.bill_id = b.id  -- Link via payee
      AND t.date BETWEEN start_date AND end_date
  )
```

## Category Aggregation

All spending is aggregated by transaction category:

1. **Transactions with categories**: Use the category from `transaction_categories`
2. **Transactions without categories**: Grouped under "Uncategorized"
3. **Debt payments**: Grouped under "Debt Payment" category (or linked category if specified)
4. **Bills**: Use the bill's assigned category or "Bills" default

## Example Scenarios

### Scenario 1: Transaction Recorded for Debt Payment
**Setup:**
- Debt: Car Loan, minimum payment $300, due on 15th
- Transaction: $300 payment to "Auto Lender" on Nov 15, linked to debt via `debt_id`

**Result:**
- Transaction is counted: $300 in "Debt Payment" category
- Debt minimum payment is NOT counted (excluded by deduplication)
- **Total: $300 (no duplication)**

### Scenario 2: Transaction Recorded via Payee
**Setup:**
- Debt: Credit Card, minimum payment $150, due on 10th
- Payee: "Chase Bank" linked to debt via `debt_id`
- Transaction: $150 payment to "Chase Bank" (payee) on Nov 10

**Result:**
- Transaction is counted: $150 in "Debt Payment" category
- Debt minimum payment is NOT counted (excluded via payee linkage)
- **Total: $150 (no duplication)**

### Scenario 3: No Transaction Recorded Yet
**Setup:**
- Debt: Student Loan, minimum payment $200, due on 20th
- No transaction recorded for November yet

**Result:**
- Debt minimum payment IS counted: $200 in "Debt Payment" category
- **Total: $200 (scheduled payment shown)**

### Scenario 4: Bill Paid via Transaction
**Setup:**
- Bill: Electric Bill, $120, due on 5th
- Payee: "Power Company" linked to bill via `bill_id`
- Transaction: $120 payment to "Power Company" on Nov 5

**Result:**
- Transaction is counted: $120 in "Utilities" category
- Bill is NOT counted separately (excluded via payee linkage)
- **Total: $120 (no duplication)**

### Scenario 5: Mixed Spending
**Setup:**
- Transaction 1: $100 groceries (category: "Groceries")
- Transaction 2: $50 gas (category: "Transportation")
- Debt: $300 car payment (linked transaction exists)
- Bill: $150 internet (no transaction yet)

**Result:**
- Groceries: $100
- Transportation: $50
- Debt Payment: $300 (from transaction)
- Internet: $150 (from bill, no transaction yet)
- **Total: $600**

## Visual Representation

The widget displays:
1. **Pie Chart**: Visual breakdown of spending by category
2. **Total Spending**: Sum of all categories
3. **Category List**: Detailed list with:
   - Category icon and name
   - Amount spent
   - Percentage of total
   - Color-coded for easy identification

## Benefits

1. **Single Source of Truth**: Always prioritizes actual transactions
2. **No Double Counting**: Comprehensive deduplication ensures accuracy
3. **Complete Picture**: Includes scheduled payments that haven't been recorded yet
4. **Category-Based**: Easy to understand spending patterns
5. **Real-Time Updates**: Refreshes when data changes

## Technical Implementation

- **Database Function**: `get_spending_breakdown(household_id, start_date, end_date)`
- **Security**: SECURITY DEFINER ensures proper RLS enforcement
- **Performance**: Uses CTEs for efficient query execution
- **React Component**: `SpendingBreakdownWidget`
- **Charts**: Uses Recharts library for visualization

## Future Enhancements

Potential improvements:
1. Month-over-month comparison
2. Budget vs. actual spending comparison
3. Trend analysis over time
4. Export functionality
5. Custom date range selection
6. Drill-down into category details
