/*
  # Create Spending Breakdown Function

  1. Purpose
    - Aggregate spending data from all sources (transactions, debts, bills, budget items)
    - Avoid duplicates by checking for linked entities
    - Group by transaction category for a unified view

  2. Function Details
    - Returns spending by category for a given household and date range
    - Prioritizes actual transactions over scheduled items
    - Deduplicates debt payments and bill payments that have corresponding transactions
    - Groups uncategorized items into an "Uncategorized" category

  3. Data Sources
    - transactions: Actual spending from bank accounts
    - debts: Minimum payments (if not paid via transaction)
    - bills: Recurring bills (if not paid via transaction)
    - budget_categories: Planned spending (informational only, not included in totals)

  4. Deduplication Logic
    - If a transaction has debt_id, don't count the debt minimum_payment separately
    - If a transaction has payee_id linked to a bill, don't count the bill separately
    - If a transaction has payee_id linked to a debt, don't count the debt separately
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_spending_breakdown(uuid, date, date);

-- Create spending breakdown function
CREATE OR REPLACE FUNCTION get_spending_breakdown(
  p_household_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  category_id uuid,
  category_name text,
  icon text,
  color text,
  total_amount numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Get all actual transactions (primary source of truth)
  transaction_spending AS (
    SELECT
      COALESCE(t.category_id, '00000000-0000-0000-0000-000000000000'::uuid) as cat_id,
      COALESCE(tc.name, 'Uncategorized') as cat_name,
      COALESCE(tc.icon, '💰') as cat_icon,
      COALESCE(tc.color, '#94a3b8') as cat_color,
      ABS(t.amount) as amount
    FROM transactions t
    LEFT JOIN transaction_categories tc ON t.category_id = tc.id
    WHERE t.household_id = p_household_id
      AND t.date >= p_start_date
      AND t.date <= p_end_date
      AND t.amount < 0
  ),
  
  -- Get debt payments that DON'T have corresponding transactions
  -- (only count debts where no transaction references this debt in the time period)
  debt_spending AS (
    SELECT
      COALESCE(
        (SELECT id FROM transaction_categories 
         WHERE household_id = p_household_id 
         AND name = 'Debt Payment' 
         LIMIT 1),
        '00000000-0000-0000-0000-000000000001'::uuid
      ) as cat_id,
      'Debt Payment' as cat_name,
      '💳' as cat_icon,
      '#ef4444' as cat_color,
      d.minimum_payment as amount
    FROM debts d
    WHERE d.household_id = p_household_id
      AND d.is_active = true
      AND d.payment_day IS NOT NULL
      AND d.payment_day >= EXTRACT(DAY FROM p_start_date)
      AND d.payment_day <= EXTRACT(DAY FROM p_end_date)
      -- Only include if NO transaction references this debt in the period
      AND NOT EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.debt_id = d.id
          AND t.date >= p_start_date
          AND t.date <= p_end_date
      )
      -- Also check via payee linkage
      AND NOT EXISTS (
        SELECT 1 FROM transactions t
        INNER JOIN payees p ON t.payee_id = p.id
        WHERE p.debt_id = d.id
          AND t.date >= p_start_date
          AND t.date <= p_end_date
      )
  ),
  
  -- Get bill payments that DON'T have corresponding transactions
  bill_spending AS (
    SELECT
      COALESCE(b.category_id, '00000000-0000-0000-0000-000000000002'::uuid) as cat_id,
      COALESCE(tc.name, 'Bills') as cat_name,
      COALESCE(tc.icon, '📄') as cat_icon,
      COALESCE(tc.color, '#f59e0b') as cat_color,
      b.amount as amount
    FROM bills b
    LEFT JOIN transaction_categories tc ON b.category_id = tc.id
    WHERE b.household_id = p_household_id
      AND b.is_active = true
      AND b.due_date >= EXTRACT(DAY FROM p_start_date)
      AND b.due_date <= EXTRACT(DAY FROM p_end_date)
      -- Only include if NO transaction references this bill in the period
      AND NOT EXISTS (
        SELECT 1 FROM transactions t
        INNER JOIN payees p ON t.payee_id = p.id
        WHERE p.bill_id = b.id
          AND t.date >= p_start_date
          AND t.date <= p_end_date
      )
  ),
  
  -- Combine all spending sources
  combined_spending AS (
    SELECT cat_id, cat_name, cat_icon, cat_color, amount FROM transaction_spending
    UNION ALL
    SELECT cat_id, cat_name, cat_icon, cat_color, amount FROM debt_spending
    UNION ALL
    SELECT cat_id, cat_name, cat_icon, cat_color, amount FROM bill_spending
  )
  
  -- Aggregate by category
  SELECT
    cs.cat_id as category_id,
    cs.cat_name as category_name,
    cs.cat_icon as icon,
    cs.cat_color as color,
    SUM(cs.amount) as total_amount
  FROM combined_spending cs
  GROUP BY cs.cat_id, cs.cat_name, cs.cat_icon, cs.cat_color
  HAVING SUM(cs.amount) > 0
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_spending_breakdown(uuid, date, date) TO authenticated;
