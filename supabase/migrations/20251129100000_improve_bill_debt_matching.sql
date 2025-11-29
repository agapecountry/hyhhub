/*
  # Improve Bill and Debt Matching
  
  Adds institution field to bills and debts for better Plaid transaction matching.
  Improves matching logic to use merchant names and institution data.
*/

-- Add institution field to bills for better matching
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS institution TEXT;

-- Add merchant_name field to bills for better matching
ALTER TABLE bills 
ADD COLUMN IF NOT EXISTS merchant_name TEXT;

-- Add institution field to debts for better matching  
ALTER TABLE debts
ADD COLUMN IF NOT EXISTS institution TEXT;

-- Add merchant_name field to debts for better matching
ALTER TABLE debts
ADD COLUMN IF NOT EXISTS merchant_name TEXT;

-- Create indexes for faster matching
CREATE INDEX IF NOT EXISTS idx_bills_institution ON bills(institution) WHERE institution IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bills_merchant_name ON bills(merchant_name) WHERE merchant_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debts_institution ON debts(institution) WHERE institution IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debts_merchant_name ON debts(merchant_name) WHERE merchant_name IS NOT NULL;

-- Add matching_keywords to help with fuzzy matching
ALTER TABLE bills
ADD COLUMN IF NOT EXISTS matching_keywords TEXT[];

ALTER TABLE debts
ADD COLUMN IF NOT EXISTS matching_keywords TEXT[];

-- Create GIN indexes for keyword matching
CREATE INDEX IF NOT EXISTS idx_bills_matching_keywords ON bills USING GIN(matching_keywords) WHERE matching_keywords IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debts_matching_keywords ON debts USING GIN(matching_keywords) WHERE matching_keywords IS NOT NULL;

COMMENT ON COLUMN bills.institution IS 'Bank/institution name for matching Plaid transactions';
COMMENT ON COLUMN bills.merchant_name IS 'Merchant name as it appears on bank statements';
COMMENT ON COLUMN bills.matching_keywords IS 'Additional keywords to help match transactions';
COMMENT ON COLUMN debts.institution IS 'Creditor institution name for matching Plaid transactions';
COMMENT ON COLUMN debts.merchant_name IS 'Creditor name as it appears on bank statements';
COMMENT ON COLUMN debts.matching_keywords IS 'Additional keywords to help match transactions';
