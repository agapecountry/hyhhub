/*
  # Mark matched transactions as cleared
  
  When transactions are matched (manual <-> Plaid), both should be marked as cleared.
  When unmatched, the cleared status is left as-is (user can manually unmark if needed).
*/

-- Update match_transactions to also mark both as cleared
CREATE OR REPLACE FUNCTION match_transactions(
  p_transaction1_id uuid,
  p_transaction2_id uuid,
  p_confidence text DEFAULT 'high',
  p_manual boolean DEFAULT false
)
RETURNS boolean AS $$
BEGIN
  -- Update both transactions to reference each other and mark as cleared
  UPDATE transactions 
  SET 
    matched_transaction_id = p_transaction2_id,
    match_confidence = p_confidence,
    manually_matched = p_manual,
    is_cleared = true,
    updated_at = now()
  WHERE id = p_transaction1_id;
  
  UPDATE transactions 
  SET 
    matched_transaction_id = p_transaction1_id,
    match_confidence = p_confidence,
    manually_matched = p_manual,
    is_cleared = true,
    updated_at = now()
  WHERE id = p_transaction2_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;
