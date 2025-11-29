# Plaid Transaction Matching Improvements

## Summary
Improved the auto-matching logic for Plaid transactions to bills and debts with better name/institution matching and keyword support.

## Changes Made

### 1. Database Schema Updates (`20251129100000_improve_bill_debt_matching.sql`)

**Added to `bills` table:**
- `institution` - Bank/institution name for matching
- `merchant_name` - Merchant name as it appears on statements
- `matching_keywords` - Array of keywords for fuzzy matching

**Added to `debts` table:**
- `institution` - Creditor institution name for matching  
- `merchant_name` - Creditor name as it appears on statements
- `matching_keywords` - Array of keywords for fuzzy matching

### 2. Improved Plaid Sync Matching Logic

**Bill Matching Now Checks:**
- Bill name
- Company name
- Merchant name
- Institution name
- Custom keywords array
- Amount match (within $1)
- Date match (within 3 days of due date)

**Debt Matching Now Checks:**
- Debt name
- Creditor name
- Merchant name
- Institution name
- Custom keywords array
- Amount match (within $1 of minimum payment)

**Match Confidence Levels:**
- **High**: Good name/keyword match + amount + date (bills) or amount (debts)
- **Medium**: Decent name match + amount or date
- **Low**: Keyword match + amount

### 3. Transaction Edit Sync (Already Working!)

The existing database trigger `sync_transaction_to_payments` already handles transaction edits:
- Fires on both INSERT and UPDATE
- Automatically creates/updates debt_payments when transaction is linked to debt
- Automatically creates/updates bill_payments when transaction is linked to bill
- Recalculates debt balances with principal/interest breakdown

**No additional changes needed** - the system already syncs edited transactions!

## How to Use

### For Bills:
1. Edit a bill in the Bills page
2. Add optional fields:
   - **Institution**: Bank name (e.g., "Capital One", "Chase")
   - **Merchant Name**: Name on statements (e.g., "CAP ONE AUTO PMT")
   - **Keywords**: Additional matching terms (e.g., ["capital", "auto", "carpayment"])

### For Debts:
1. Edit a debt in the Debt Payoff page
2. Add optional fields:
   - **Institution**: Creditor name (e.g., "Discover", "Wells Fargo")
   - **Merchant Name**: Name on statements (e.g., "DISCOVER PAYMENT")
   - **Keywords**: Additional matching terms (e.g., ["discover", "credit card"])

### For Manual Transaction Edits:
Simply edit any transaction and link it to a debt:
1. Edit transaction
2. Select payee linked to a debt
3. Save
4. **Debt payment is automatically created/updated** via database trigger

## Next Steps

1. **Run the migration** in Supabase SQL Editor
2. **Update bills/debts** with institution and merchant names for better matching
3. **Test Plaid sync** - next sync will use improved matching
4. **Deploy updated Edge Function** to Supabase (if not auto-deployed)

## Technical Details

**Files Modified:**
- `supabase/migrations/20251129100000_improve_bill_debt_matching.sql` (NEW)
- `supabase/functions/plaid-sync-transactions/index.ts`

**Database Triggers (Already Working):**
- `sync_transaction_to_payments` - Fires on INSERT/UPDATE of transactions
- `handle_transaction_deletion` - Cleans up when transactions are deleted

**Edge Function:**
- `plaid-sync-transactions` - Auto-matches Plaid transactions to bills/debts
