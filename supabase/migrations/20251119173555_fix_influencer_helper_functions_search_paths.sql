/*
  # Fix Influencer Helper Functions Search Paths

  1. Functions Fixed
    - validate_influencer_code
    - calculate_influencer_payout
*/

-- Fix validate_influencer_code
DROP FUNCTION IF EXISTS validate_influencer_code(text) CASCADE;
CREATE OR REPLACE FUNCTION validate_influencer_code(code_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  code_record RECORD;
BEGIN
  SELECT * INTO code_record
  FROM public.influencer_codes
  WHERE code = code_text AND is_active = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF code_record.max_uses IS NOT NULL AND code_record.usage_count >= code_record.max_uses THEN
    RETURN false;
  END IF;

  IF code_record.expires_at IS NOT NULL AND code_record.expires_at < now() THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_influencer_code(text) TO authenticated;
COMMENT ON FUNCTION validate_influencer_code(text) IS 'Validates if an influencer code is valid and active. Search path is fixed for security.';

-- Fix calculate_influencer_payout
DROP FUNCTION IF EXISTS calculate_influencer_payout(uuid, numeric, text) CASCADE;
CREATE OR REPLACE FUNCTION calculate_influencer_payout(
  p_influencer_id uuid,
  p_amount numeric,
  p_tier text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  commission_rate numeric;
BEGIN
  SELECT commission_percentage INTO commission_rate
  FROM public.influencer_codes
  WHERE user_id = p_influencer_id
  LIMIT 1;

  IF commission_rate IS NULL THEN
    commission_rate := 0.20;
  END IF;

  RETURN p_amount * commission_rate;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_influencer_payout(uuid, numeric, text) TO authenticated;
COMMENT ON FUNCTION calculate_influencer_payout(uuid, numeric, text) IS 'Calculates influencer commission payout. Search path is fixed for security.';