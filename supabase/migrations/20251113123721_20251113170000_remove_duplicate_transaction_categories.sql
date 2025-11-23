/*
  # Remove Duplicate Transaction Categories

  1. Problem
    - Multiple households have duplicate transaction categories
    - "Pets" and "Pet Care" are the same (keep Pet Care)
    - "Insurance" and "Insurances" are the same (keep Insurances)
    - "Subscriptions" and "Service Subscriptions" are the same (keep Service Subscriptions)
    - "Personal Care" and "Personal Maintenance" are the same (keep Personal Maintenance)
    - "Dining Out" and "Food & Dining" are the same (keep Food & Dining)
    - "Entertainment" and "Leisure" are the same (keep Leisure)
    - Extra categories not in default list: Charity, Education, Home Improvement, Rent/Mortgage

  2. Solution
    - Update all foreign key references to point to the preferred category
    - Delete the duplicate/unused categories
    - This applies across all households

  3. Tables Updated
    - bills: category_id references
    - budget_categories: transaction_category_id references
    - transactions: category_id references
    - recurring_transactions: category_id references
    - payees: default_category_id references
*/

-- Update bills table references
UPDATE bills
SET category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = bills.category_id
  AND tc.name = 'Pets'
  AND tc2.name = 'Pet Care'
  LIMIT 1
)
WHERE category_id IN (SELECT id FROM transaction_categories WHERE name = 'Pets');

UPDATE bills
SET category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = bills.category_id
  AND tc.name = 'Insurance'
  AND tc2.name = 'Insurances'
  LIMIT 1
)
WHERE category_id IN (SELECT id FROM transaction_categories WHERE name = 'Insurance');

UPDATE bills
SET category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = bills.category_id
  AND tc.name = 'Subscriptions'
  AND tc2.name = 'Service Subscriptions'
  LIMIT 1
)
WHERE category_id IN (SELECT id FROM transaction_categories WHERE name = 'Subscriptions');

UPDATE bills
SET category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = bills.category_id
  AND tc.name = 'Personal Care'
  AND tc2.name = 'Personal Maintenance'
  LIMIT 1
)
WHERE category_id IN (SELECT id FROM transaction_categories WHERE name = 'Personal Care');

UPDATE bills
SET category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = bills.category_id
  AND tc.name = 'Dining Out'
  AND tc2.name = 'Food & Dining'
  LIMIT 1
)
WHERE category_id IN (SELECT id FROM transaction_categories WHERE name = 'Dining Out');

UPDATE bills
SET category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = bills.category_id
  AND tc.name = 'Entertainment'
  AND tc2.name = 'Leisure'
  LIMIT 1
)
WHERE category_id IN (SELECT id FROM transaction_categories WHERE name = 'Entertainment');

-- Update budget_categories table references
UPDATE budget_categories
SET transaction_category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = budget_categories.transaction_category_id
  AND tc.name = 'Pets'
  AND tc2.name = 'Pet Care'
  LIMIT 1
)
WHERE transaction_category_id IN (SELECT id FROM transaction_categories WHERE name = 'Pets');

UPDATE budget_categories
SET transaction_category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = budget_categories.transaction_category_id
  AND tc.name = 'Insurance'
  AND tc2.name = 'Insurances'
  LIMIT 1
)
WHERE transaction_category_id IN (SELECT id FROM transaction_categories WHERE name = 'Insurance');

UPDATE budget_categories
SET transaction_category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = budget_categories.transaction_category_id
  AND tc.name = 'Subscriptions'
  AND tc2.name = 'Service Subscriptions'
  LIMIT 1
)
WHERE transaction_category_id IN (SELECT id FROM transaction_categories WHERE name = 'Subscriptions');

UPDATE budget_categories
SET transaction_category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = budget_categories.transaction_category_id
  AND tc.name = 'Personal Care'
  AND tc2.name = 'Personal Maintenance'
  LIMIT 1
)
WHERE transaction_category_id IN (SELECT id FROM transaction_categories WHERE name = 'Personal Care');

UPDATE budget_categories
SET transaction_category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = budget_categories.transaction_category_id
  AND tc.name = 'Dining Out'
  AND tc2.name = 'Food & Dining'
  LIMIT 1
)
WHERE transaction_category_id IN (SELECT id FROM transaction_categories WHERE name = 'Dining Out');

UPDATE budget_categories
SET transaction_category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = budget_categories.transaction_category_id
  AND tc.name = 'Entertainment'
  AND tc2.name = 'Leisure'
  LIMIT 1
)
WHERE transaction_category_id IN (SELECT id FROM transaction_categories WHERE name = 'Entertainment');

-- Update transactions table references
UPDATE transactions
SET category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = transactions.category_id
  AND tc.name IN ('Pets', 'Insurance', 'Subscriptions', 'Personal Care', 'Dining Out', 'Entertainment')
  AND tc2.name IN ('Pet Care', 'Insurances', 'Service Subscriptions', 'Personal Maintenance', 'Food & Dining', 'Leisure')
  AND (
    (tc.name = 'Pets' AND tc2.name = 'Pet Care') OR
    (tc.name = 'Insurance' AND tc2.name = 'Insurances') OR
    (tc.name = 'Subscriptions' AND tc2.name = 'Service Subscriptions') OR
    (tc.name = 'Personal Care' AND tc2.name = 'Personal Maintenance') OR
    (tc.name = 'Dining Out' AND tc2.name = 'Food & Dining') OR
    (tc.name = 'Entertainment' AND tc2.name = 'Leisure')
  )
  LIMIT 1
)
WHERE category_id IN (SELECT id FROM transaction_categories WHERE name IN ('Pets', 'Insurance', 'Subscriptions', 'Personal Care', 'Dining Out', 'Entertainment'));

-- Update recurring_transactions table references
UPDATE recurring_transactions
SET category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = recurring_transactions.category_id
  AND tc.name IN ('Pets', 'Insurance', 'Subscriptions', 'Personal Care', 'Dining Out', 'Entertainment')
  AND tc2.name IN ('Pet Care', 'Insurances', 'Service Subscriptions', 'Personal Maintenance', 'Food & Dining', 'Leisure')
  AND (
    (tc.name = 'Pets' AND tc2.name = 'Pet Care') OR
    (tc.name = 'Insurance' AND tc2.name = 'Insurances') OR
    (tc.name = 'Subscriptions' AND tc2.name = 'Service Subscriptions') OR
    (tc.name = 'Personal Care' AND tc2.name = 'Personal Maintenance') OR
    (tc.name = 'Dining Out' AND tc2.name = 'Food & Dining') OR
    (tc.name = 'Entertainment' AND tc2.name = 'Leisure')
  )
  LIMIT 1
)
WHERE category_id IN (SELECT id FROM transaction_categories WHERE name IN ('Pets', 'Insurance', 'Subscriptions', 'Personal Care', 'Dining Out', 'Entertainment'));

-- Update payees table references
UPDATE payees
SET default_category_id = (
  SELECT tc2.id
  FROM transaction_categories tc
  JOIN transaction_categories tc2 ON tc2.household_id = tc.household_id
  WHERE tc.id = payees.default_category_id
  AND tc.name IN ('Pets', 'Insurance', 'Subscriptions', 'Personal Care', 'Dining Out', 'Entertainment')
  AND tc2.name IN ('Pet Care', 'Insurances', 'Service Subscriptions', 'Personal Maintenance', 'Food & Dining', 'Leisure')
  AND (
    (tc.name = 'Pets' AND tc2.name = 'Pet Care') OR
    (tc.name = 'Insurance' AND tc2.name = 'Insurances') OR
    (tc.name = 'Subscriptions' AND tc2.name = 'Service Subscriptions') OR
    (tc.name = 'Personal Care' AND tc2.name = 'Personal Maintenance') OR
    (tc.name = 'Dining Out' AND tc2.name = 'Food & Dining') OR
    (tc.name = 'Entertainment' AND tc2.name = 'Leisure')
  )
  LIMIT 1
)
WHERE default_category_id IN (SELECT id FROM transaction_categories WHERE name IN ('Pets', 'Insurance', 'Subscriptions', 'Personal Care', 'Dining Out', 'Entertainment'));

-- Now safe to delete the duplicate categories
DELETE FROM transaction_categories
WHERE name IN ('Pets', 'Insurance', 'Subscriptions', 'Personal Care', 'Dining Out', 'Entertainment', 'Charity', 'Education', 'Home Improvement', 'Rent/Mortgage')
AND type = 'expense';