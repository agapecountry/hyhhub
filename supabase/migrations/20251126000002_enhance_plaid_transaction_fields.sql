/*
  # Enhanced Plaid Transaction Fields
  
  Adds all missing fields from Plaid's /transactions/sync API to match their full schema.
  
  Reference: https://plaid.com/docs/api/products/transactions/
  
  New fields:
  - iso_currency_code: Currency code (USD, CAD, etc)
  - authorized_date: Date transaction was authorized
  - authorized_datetime: Timestamp of authorization
  - datetime: Full timestamp of transaction
  - payment_channel: How payment was made (online, in store, etc)
  - pending_transaction_id: Links pending to posted transactions
  - personal_finance_category: Plaid's enhanced category system
  - personal_finance_category_icon_url: Icon for category
  - location: Store location data (address, city, lat/lon, etc)
  - logo_url: Merchant logo URL
  - website: Merchant website
  - check_number: Check number for check payments
  - counterparties: Enhanced payee information
  - transaction_type: Type of transaction (place, special, unresolved)
  - unofficial_currency_code: For non-standard currencies
*/

-- Add currency fields
ALTER TABLE plaid_transactions
ADD COLUMN IF NOT EXISTS iso_currency_code text,
ADD COLUMN IF NOT EXISTS unofficial_currency_code text;

-- Add date/time fields
ALTER TABLE plaid_transactions
ADD COLUMN IF NOT EXISTS authorized_date date,
ADD COLUMN IF NOT EXISTS authorized_datetime timestamptz,
ADD COLUMN IF NOT EXISTS datetime timestamptz;

-- Add payment/transaction metadata
ALTER TABLE plaid_transactions
ADD COLUMN IF NOT EXISTS payment_channel text CHECK (payment_channel IN ('online', 'in store', 'other')),
ADD COLUMN IF NOT EXISTS pending_transaction_id text,
ADD COLUMN IF NOT EXISTS transaction_type text CHECK (transaction_type IN ('place', 'special', 'unresolved')),
ADD COLUMN IF NOT EXISTS check_number text;

-- Add enhanced categorization (Personal Finance Categories)
ALTER TABLE plaid_transactions
ADD COLUMN IF NOT EXISTS personal_finance_category jsonb,
ADD COLUMN IF NOT EXISTS personal_finance_category_icon_url text;

-- Add merchant/location details
ALTER TABLE plaid_transactions
ADD COLUMN IF NOT EXISTS location jsonb,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS counterparties jsonb;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_authorized_date ON plaid_transactions(authorized_date) WHERE authorized_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_pending_transaction_id ON plaid_transactions(pending_transaction_id) WHERE pending_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_payment_channel ON plaid_transactions(payment_channel) WHERE payment_channel IS NOT NULL;

-- Add comments
COMMENT ON COLUMN plaid_transactions.iso_currency_code IS 'ISO-4217 currency code (USD, CAD, etc)';
COMMENT ON COLUMN plaid_transactions.authorized_date IS 'Date transaction was authorized';
COMMENT ON COLUMN plaid_transactions.authorized_datetime IS 'Timestamp when transaction was authorized';
COMMENT ON COLUMN plaid_transactions.datetime IS 'Full timestamp of transaction';
COMMENT ON COLUMN plaid_transactions.payment_channel IS 'How payment was made: online, in store, or other';
COMMENT ON COLUMN plaid_transactions.pending_transaction_id IS 'Links pending transaction to its posted version';
COMMENT ON COLUMN plaid_transactions.personal_finance_category IS 'Plaid enhanced category system with primary, detailed, and confidence_level';
COMMENT ON COLUMN plaid_transactions.personal_finance_category_icon_url IS 'URL to category icon';
COMMENT ON COLUMN plaid_transactions.location IS 'Store location: address, city, region, postal_code, country, lat, lon, store_number';
COMMENT ON COLUMN plaid_transactions.logo_url IS 'Merchant logo URL';
COMMENT ON COLUMN plaid_transactions.website IS 'Merchant website';
COMMENT ON COLUMN plaid_transactions.counterparties IS 'Enhanced payee information from Plaid';
COMMENT ON COLUMN plaid_transactions.check_number IS 'Check number for check payments';
COMMENT ON COLUMN plaid_transactions.transaction_type IS 'Transaction type: place (standard), special (interest/fees), or unresolved';
