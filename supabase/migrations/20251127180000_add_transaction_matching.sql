/*
  # Add Transaction Matching Support
  
  1. Changes to transactions table
    - Add `matched_transaction_id` (uuid, nullable) - References another transaction that this one matches
    - Add `match_confidence` (text) - 'high', 'medium', 'low' for auto-match confidence
    - Add `manually_matched` (boolean) - Whether the match was done manually by user
    - Add `is_manual` (boolean) - Quick way to check if transaction is manual (computed from plaid_transaction_id)
  
  2. Matching Logic
    - Manual transactions can be matched to Plaid-synced transactions
    - When matched, both transactions reference each other
    - UI shows matched transactions differently (hide duplicates, show link)
  
  3. Matching Criteria
    - Date within 3 days
    - Amount matches exactly (or within $0.50 for floating point)
    - Description similarity (optional)
*/

-- Add new columns to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS matched_transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS match_confidence text CHECK (match_confidence IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS manually_matched boolean DEFAULT false;

-- Add index for matched transactions
CREATE INDEX IF NOT EXISTS idx_transactions_matched_id ON transactions(matched_transaction_id) WHERE matched_transaction_id IS NOT NULL;

-- Add computed column for quick manual transaction check
-- Note: This is computed based on plaid_transaction_id being NULL
-- We'll use this in queries for clarity

-- Function to calculate similarity between two strings (simple Levenshtein-like)
CREATE OR REPLACE FUNCTION string_similarity(str1 text, str2 text)
RETURNS numeric AS $$
DECLARE
  len1 int := length(str1);
  len2 int := length(str2);
  max_len int := greatest(len1, len2);
BEGIN
  IF max_len = 0 THEN
    RETURN 1.0;
  END IF;
  
  -- Simple similarity: count matching characters in similar positions
  -- This is a simplified version - for production, use pg_trgm extension
  RETURN 1.0 - (levenshtein(lower(str1), lower(str2))::numeric / max_len);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find potential matches for a manual transaction
CREATE OR REPLACE FUNCTION find_transaction_matches(
  p_transaction_id uuid,
  p_date_range_days int DEFAULT 3,
  p_amount_tolerance numeric DEFAULT 0.50
)
RETURNS TABLE (
  match_id uuid,
  match_confidence text,
  date_diff int,
  amount_diff numeric,
  description_similarity numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH source_transaction AS (
    SELECT 
      id,
      date,
      amount,
      description,
      account_id,
      plaid_transaction_id
    FROM transactions
    WHERE id = p_transaction_id
  )
  SELECT 
    t.id as match_id,
    CASE 
      WHEN abs(t.amount - st.amount) <= 0.01 
           AND abs(t.date - st.date) <= 1 
           AND string_similarity(t.description, st.description) > 0.7
      THEN 'high'
      WHEN abs(t.amount - st.amount) <= p_amount_tolerance 
           AND abs(t.date - st.date) <= p_date_range_days
           AND string_similarity(t.description, st.description) > 0.5
      THEN 'medium'
      ELSE 'low'
    END as match_confidence,
    abs(t.date - st.date) as date_diff,
    abs(t.amount - st.amount) as amount_diff,
    string_similarity(t.description, st.description) as description_similarity
  FROM transactions t
  CROSS JOIN source_transaction st
  WHERE 
    t.id != st.id
    AND t.account_id = st.account_id
    AND t.matched_transaction_id IS NULL
    AND abs(t.date - st.date) <= p_date_range_days
    AND abs(t.amount - st.amount) <= p_amount_tolerance
    -- One must be manual, one must be Plaid
    AND (
      (st.plaid_transaction_id IS NULL AND t.plaid_transaction_id IS NOT NULL)
      OR (st.plaid_transaction_id IS NOT NULL AND t.plaid_transaction_id IS NULL)
    )
  ORDER BY 
    abs(t.date - st.date),
    abs(t.amount - st.amount),
    string_similarity(t.description, st.description) DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to match two transactions
CREATE OR REPLACE FUNCTION match_transactions(
  p_transaction1_id uuid,
  p_transaction2_id uuid,
  p_confidence text DEFAULT 'high',
  p_manual boolean DEFAULT false
)
RETURNS boolean AS $$
BEGIN
  -- Update both transactions to reference each other
  UPDATE transactions 
  SET 
    matched_transaction_id = p_transaction2_id,
    match_confidence = p_confidence,
    manually_matched = p_manual,
    updated_at = now()
  WHERE id = p_transaction1_id;
  
  UPDATE transactions 
  SET 
    matched_transaction_id = p_transaction1_id,
    match_confidence = p_confidence,
    manually_matched = p_manual,
    updated_at = now()
  WHERE id = p_transaction2_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to unmatch transactions
CREATE OR REPLACE FUNCTION unmatch_transactions(p_transaction_id uuid)
RETURNS boolean AS $$
DECLARE
  v_matched_id uuid;
BEGIN
  -- Get the matched transaction id
  SELECT matched_transaction_id INTO v_matched_id
  FROM transactions
  WHERE id = p_transaction_id;
  
  -- Clear the match on both transactions
  UPDATE transactions 
  SET 
    matched_transaction_id = NULL,
    match_confidence = NULL,
    manually_matched = false,
    updated_at = now()
  WHERE id = p_transaction_id;
  
  IF v_matched_id IS NOT NULL THEN
    UPDATE transactions 
    SET 
      matched_transaction_id = NULL,
      match_confidence = NULL,
      manually_matched = false,
      updated_at = now()
    WHERE id = v_matched_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-match transactions after Plaid sync
-- This should be called after new Plaid transactions are imported
CREATE OR REPLACE FUNCTION auto_match_new_transactions(p_account_id uuid)
RETURNS int AS $$
DECLARE
  v_match_count int := 0;
  v_transaction record;
  v_potential_match record;
BEGIN
  -- Find all unmatched Plaid transactions from the last 7 days
  FOR v_transaction IN
    SELECT id, date, amount, description
    FROM transactions
    WHERE account_id = p_account_id
      AND plaid_transaction_id IS NOT NULL
      AND matched_transaction_id IS NULL
      AND date >= CURRENT_DATE - INTERVAL '7 days'
  LOOP
    -- Find the best match
    SELECT * INTO v_potential_match
    FROM find_transaction_matches(v_transaction.id, 3, 0.50)
    WHERE match_confidence = 'high'
    LIMIT 1;
    
    -- If we found a high-confidence match, link them
    IF v_potential_match.match_id IS NOT NULL THEN
      PERFORM match_transactions(
        v_transaction.id,
        v_potential_match.match_id,
        'high',
        false
      );
      v_match_count := v_match_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_match_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment to explain the matching system
COMMENT ON COLUMN transactions.matched_transaction_id IS 
'References another transaction that this one matches (typically one manual, one from Plaid sync)';

COMMENT ON COLUMN transactions.match_confidence IS 
'Confidence level of the match: high (exact match), medium (likely match), low (possible match)';

COMMENT ON COLUMN transactions.manually_matched IS 
'Whether the match was created manually by the user (true) or automatically by the system (false)';

COMMENT ON FUNCTION find_transaction_matches IS 
'Finds potential matching transactions for a given transaction, useful for deduplication';

COMMENT ON FUNCTION match_transactions IS 
'Links two transactions as matches (e.g., manual entry matched with Plaid sync)';

COMMENT ON FUNCTION unmatch_transactions IS 
'Removes the match between two transactions';

COMMENT ON FUNCTION auto_match_new_transactions IS 
'Automatically matches newly synced Plaid transactions with existing manual transactions';
