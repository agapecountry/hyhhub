/*
  # Fix Transaction Matching Between Plaid and Manual Transactions
  
  The previous matching logic only looked at the `transactions` table,
  but Plaid transactions are stored in `plaid_transactions` table.
  
  This migration fixes the matching to work across both tables:
  - Manual transactions are in `transactions` table
  - Plaid transactions are in `plaid_transactions` table
  
  Matching criteria:
  - Same plaid_account_id (for Plaid) matches account_id (for manual)
  - Date within 3 days
  - Amount matches (within $0.50 tolerance)
  - Description similarity (optional boost)
*/

-- Add matched_plaid_transaction_id to transactions table to link manual -> plaid
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS matched_plaid_transaction_id uuid REFERENCES plaid_transactions(id) ON DELETE SET NULL;

-- Add matched_manual_transaction_id to plaid_transactions table to link plaid -> manual
ALTER TABLE plaid_transactions 
ADD COLUMN IF NOT EXISTS matched_manual_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_transactions_matched_plaid_id 
ON transactions(matched_plaid_transaction_id) 
WHERE matched_plaid_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_plaid_transactions_matched_manual_id 
ON plaid_transactions(matched_manual_transaction_id) 
WHERE matched_manual_transaction_id IS NOT NULL;

-- Function to find potential Plaid matches for a manual transaction
CREATE OR REPLACE FUNCTION find_plaid_matches_for_manual(
  p_manual_transaction_id uuid,
  p_date_range_days int DEFAULT 3,
  p_amount_tolerance numeric DEFAULT 0.50
)
RETURNS TABLE (
  plaid_transaction_id uuid,
  match_confidence text,
  date_diff int,
  amount_diff numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH manual_tx AS (
    SELECT 
      t.id,
      t.date,
      t.amount,
      t.description,
      t.account_id,
      -- Get the plaid_account_id that corresponds to this manual account
      pa.id as plaid_account_id
    FROM transactions t
    LEFT JOIN plaid_accounts pa ON pa.id = t.account_id
    WHERE t.id = p_manual_transaction_id
  )
  SELECT 
    pt.id as plaid_transaction_id,
    CASE 
      WHEN abs(pt.amount + mt.amount) <= 0.01  -- Plaid amounts are opposite sign
           AND abs(pt.date - mt.date) <= 1 
      THEN 'high'
      WHEN abs(pt.amount + mt.amount) <= p_amount_tolerance 
           AND abs(pt.date - mt.date) <= p_date_range_days
      THEN 'medium'
      ELSE 'low'
    END as match_confidence,
    abs(pt.date - mt.date)::int as date_diff,
    abs(pt.amount + mt.amount) as amount_diff  -- + because Plaid uses opposite sign
  FROM plaid_transactions pt
  CROSS JOIN manual_tx mt
  WHERE 
    pt.plaid_account_id = mt.plaid_account_id
    AND pt.matched_manual_transaction_id IS NULL
    AND abs(pt.date - mt.date) <= p_date_range_days
    AND abs(pt.amount + mt.amount) <= p_amount_tolerance  -- + because Plaid uses opposite sign
  ORDER BY 
    abs(pt.date - mt.date),
    abs(pt.amount + mt.amount)
  LIMIT 10;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Function to find potential manual matches for a Plaid transaction
CREATE OR REPLACE FUNCTION find_manual_matches_for_plaid(
  p_plaid_transaction_id uuid,
  p_date_range_days int DEFAULT 3,
  p_amount_tolerance numeric DEFAULT 0.50
)
RETURNS TABLE (
  manual_transaction_id uuid,
  match_confidence text,
  date_diff int,
  amount_diff numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH plaid_tx AS (
    SELECT 
      pt.id,
      pt.date,
      pt.amount,
      pt.name,
      pt.plaid_account_id
    FROM plaid_transactions pt
    WHERE pt.id = p_plaid_transaction_id
  )
  SELECT 
    t.id as manual_transaction_id,
    CASE 
      WHEN abs(t.amount + ptx.amount) <= 0.01  -- Plaid amounts are opposite sign
           AND abs(t.date - ptx.date) <= 1 
      THEN 'high'
      WHEN abs(t.amount + ptx.amount) <= p_amount_tolerance 
           AND abs(t.date - ptx.date) <= p_date_range_days
      THEN 'medium'
      ELSE 'low'
    END as match_confidence,
    abs(t.date - ptx.date)::int as date_diff,
    abs(t.amount + ptx.amount) as amount_diff  -- + because Plaid uses opposite sign
  FROM transactions t
  CROSS JOIN plaid_tx ptx
  WHERE 
    t.account_id = ptx.plaid_account_id
    AND t.matched_plaid_transaction_id IS NULL
    AND abs(t.date - ptx.date) <= p_date_range_days
    AND abs(t.amount + ptx.amount) <= p_amount_tolerance  -- + because Plaid uses opposite sign
  ORDER BY 
    abs(t.date - ptx.date),
    abs(t.amount + ptx.amount)
  LIMIT 10;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Function to match a manual transaction with a Plaid transaction
CREATE OR REPLACE FUNCTION match_manual_to_plaid(
  p_manual_transaction_id uuid,
  p_plaid_transaction_id uuid,
  p_confidence text DEFAULT 'high'
)
RETURNS boolean AS $$
BEGIN
  -- Update manual transaction to reference Plaid transaction
  UPDATE transactions 
  SET 
    matched_plaid_transaction_id = p_plaid_transaction_id,
    match_confidence = p_confidence,
    updated_at = now()
  WHERE id = p_manual_transaction_id;
  
  -- Update Plaid transaction to reference manual transaction
  UPDATE plaid_transactions 
  SET 
    matched_manual_transaction_id = p_manual_transaction_id,
    match_confidence = p_confidence,
    updated_at = now()
  WHERE id = p_plaid_transaction_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Function to unmatch a manual transaction from its Plaid match
CREATE OR REPLACE FUNCTION unmatch_manual_from_plaid(p_manual_transaction_id uuid)
RETURNS boolean AS $$
DECLARE
  v_plaid_id uuid;
BEGIN
  -- Get the matched Plaid transaction id
  SELECT matched_plaid_transaction_id INTO v_plaid_id
  FROM transactions
  WHERE id = p_manual_transaction_id;
  
  -- Clear the match on manual transaction
  UPDATE transactions 
  SET 
    matched_plaid_transaction_id = NULL,
    match_confidence = NULL,
    updated_at = now()
  WHERE id = p_manual_transaction_id;
  
  -- Clear the match on Plaid transaction
  IF v_plaid_id IS NOT NULL THEN
    UPDATE plaid_transactions 
    SET 
      matched_manual_transaction_id = NULL,
      match_confidence = NULL,
      updated_at = now()
    WHERE id = v_plaid_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Rewrite auto_match_new_transactions to work across tables
CREATE OR REPLACE FUNCTION auto_match_new_transactions(p_account_id uuid)
RETURNS int AS $$
DECLARE
  v_match_count int := 0;
  v_plaid_tx record;
  v_potential_match record;
BEGIN
  -- Find all unmatched Plaid transactions from the last 30 days for this account
  FOR v_plaid_tx IN
    SELECT id, date, amount, name
    FROM plaid_transactions
    WHERE plaid_account_id = p_account_id
      AND matched_manual_transaction_id IS NULL
      AND date >= CURRENT_DATE - INTERVAL '30 days'
  LOOP
    -- Find the best manual match
    SELECT * INTO v_potential_match
    FROM find_manual_matches_for_plaid(v_plaid_tx.id, 3, 0.50)
    WHERE match_confidence IN ('high', 'medium')
    ORDER BY 
      CASE match_confidence WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      date_diff,
      amount_diff
    LIMIT 1;
    
    -- If we found a match, link them
    IF v_potential_match.manual_transaction_id IS NOT NULL THEN
      PERFORM match_manual_to_plaid(
        v_potential_match.manual_transaction_id,
        v_plaid_tx.id,
        v_potential_match.match_confidence
      );
      v_match_count := v_match_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_match_count;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Add comments
COMMENT ON COLUMN transactions.matched_plaid_transaction_id IS 
'References the Plaid transaction that this manual transaction matches';

COMMENT ON COLUMN plaid_transactions.matched_manual_transaction_id IS 
'References the manual transaction that this Plaid transaction matches';

COMMENT ON FUNCTION find_plaid_matches_for_manual IS 
'Finds potential Plaid transaction matches for a given manual transaction';

COMMENT ON FUNCTION find_manual_matches_for_plaid IS 
'Finds potential manual transaction matches for a given Plaid transaction';

COMMENT ON FUNCTION match_manual_to_plaid IS 
'Links a manual transaction with a Plaid transaction as matches';

COMMENT ON FUNCTION unmatch_manual_from_plaid IS 
'Removes the match between a manual and Plaid transaction';

COMMENT ON FUNCTION auto_match_new_transactions IS 
'Automatically matches newly synced Plaid transactions with existing manual transactions. Pass the plaid_account_id.';
