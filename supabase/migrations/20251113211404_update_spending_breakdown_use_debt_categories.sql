/*
  # Update Spending Breakdown to Use Debt Categories

  1. Purpose
    - Use the debt's assigned category instead of generic "Debt Payment"
    - Maintain consistency with transaction categorization
    - Provide more accurate spending breakdowns

  2. Changes
    - Modified debt_spending CTE to use debt's category_id
    - Falls back to "Debt Payment" category only if debt has no category assigned
    - Maintains all existing deduplication logic

  3. Behavior
    - Debts with categories: grouped under their specific category
    - Debts without categories: grouped under "Debt Payment"
    - Transactions always use their assigned category
*/

DROP FUNCTION IF EXISTS get_spending_breakdown(uuid, date, date);

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
  -- Use the debt's category_id if available, otherwise use "Debt Payment"
  debt_spending AS (
    SELECT
      COALESCE(
        d.category_id,
        (SELECT id FROM transaction_categories 
         WHERE household_id = p_household_id 
         AND name = 'Debt Payment' 
         LIMIT 1),
        '00000000-0000-0000-0000-000000000001'::uuid
      ) as cat_id,
      COALESCE(tc.name, 'Debt Payment') as cat_name,
      COALESCE(tc.icon, '💳') as cat_icon,
      COALESCE(tc.color, '#ef4444') as cat_color,
      d.minimum_payment as amount
    FROM debts d
    LEFT JOIN transaction_categories tc ON d.category_id = tc.id
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

GRANT EXECUTE ON FUNCTION get_spending_breakdown(uuid, date, date) TO authenticated;
