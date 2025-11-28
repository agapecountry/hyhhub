# Manual Transaction Entry with Automatic Matching

## Overview

This feature allows users to manually enter transactions for Plaid-linked accounts and automatically matches them with synced transactions to prevent duplicates.

## Use Cases

1. **Pre-entry of pending transactions** - Enter a transaction before it clears and shows up in Plaid
2. **Missing transactions** - Manually add transactions that Plaid didn't capture
3. **Categorization ahead of sync** - Categorize a transaction manually before it syncs
4. **Offline entry** - Add transactions when offline or when Plaid is down

## How It Works

### 1. Manual Transaction Entry

Users can add manual transactions to any account (including Plaid-linked accounts) through the account detail page:

- Navigate to the account
- Click "Add Transaction"
- Fill in transaction details:
  - Date
  - Payee/Description
  - Amount
  - Category
  - Notes

Manual transactions are identified by having `plaid_transaction_id` set to `NULL`.

### 2. Automatic Matching

When Plaid syncs new transactions, the system automatically attempts to match them with existing manual transactions using these criteria:

**High Confidence Match:**
- Date within 1 day
- Amount matches within $0.01
- Description similarity > 70%

**Medium Confidence Match:**
- Date within 3 days
- Amount matches within $0.50
- Description similarity > 50%

**Low Confidence Match:**
- Date within 3 days  
- Amount matches within $0.50
- Description similarity < 50%

Only high-confidence matches are automatically linked. Medium and low confidence matches can be manually reviewed.

### 3. Manual Matching

Users can manually match or unmatch transactions:

1. Click on a transaction
2. Select "Find Matches" (if unmatched) or "Manage Match" (if matched)
3. Review potential matches with confidence scores
4. Select the correct match and click "Match Selected"
5. Or click "Unmatch" to break an existing match

### 4. Matched Transaction Display

When transactions are matched:
- Both transactions reference each other via `matched_transaction_id`
- UI shows a badge indicating the match status
- Option to display only one transaction (hide duplicate) or show both with a link icon
- Matched transactions can be unmatched if the auto-match was incorrect

## Database Schema

### New Columns in `transactions` table:

```sql
- matched_transaction_id (uuid) - References the matching transaction
- match_confidence ('high' | 'medium' | 'low') - Auto-match confidence level
- manually_matched (boolean) - Whether match was done manually
```

### Functions:

**`find_transaction_matches(transaction_id, date_range_days, amount_tolerance)`**
- Finds potential matching transactions
- Returns match candidates with confidence scores

**`match_transactions(transaction1_id, transaction2_id, confidence, manual)`**
- Links two transactions as matches
- Updates both records

**`unmatch_transactions(transaction_id)`**
- Breaks the match between transactions
- Clears match fields on both records

**`auto_match_new_transactions(account_id)`**
- Automatically matches newly synced Plaid transactions
- Called after each Plaid sync
- Returns count of matched transactions

## UI Components

### TransactionMatchDialog Component

```tsx
import { TransactionMatchDialog } from '@/components/transaction-match-dialog';

<TransactionMatchDialog
  open={matchDialogOpen}
  onOpenChange={setMatchDialogOpen}
  transaction={selectedTransaction}
  onMatchComplete={loadTransactions}
/>
```

**Props:**
- `open` - Dialog open state
- `onOpenChange` - Callback to toggle dialog
- `transaction` - The transaction to find matches for
- `onMatchComplete` - Callback after successful match/unmatch

**Features:**
- Shows current transaction details
- Lists potential matches with confidence scores
- Displays date difference, amount difference, description similarity
- Radio button selection for choosing match
- Unmatch button for already-matched transactions

## Workflow

### Adding a Manual Transaction

1. User navigates to account detail page
2. Clicks "Add Transaction" button
3. Fills out the transaction form
4. Transaction is saved with `plaid_transaction_id = NULL`

### Automatic Matching During Sync

1. User clicks "Sync Transactions" on a Plaid-linked account
2. Plaid API returns new transactions
3. Transactions are saved to database
4. `auto_match_new_transactions()` function runs for the account
5. High-confidence matches are automatically linked
6. User sees success message: "Synced 5 transactions, matched 2 duplicates"

### Manual Match Review

1. User clicks on a manual transaction
2. Selects "Find Matches" from transaction menu
3. Dialog shows potential matches ranked by confidence
4. User reviews and selects the correct match
5. Click "Match Selected" to link them
6. Both transactions now show matched status

### Viewing Matched Transactions

In the transactions list:
- Matched transactions show a link icon badge
- Hover/click shows which transaction it's matched with
- Option to show/hide matched duplicates (configurable filter)
- Matched pairs can be identified by their mutual `matched_transaction_id`

## Best Practices

1. **Enter manual transactions ASAP** - Add them when they happen, before Plaid syncs
2. **Use consistent descriptions** - Match your manual description with what your bank uses
3. **Review medium confidence matches** - Weekly review of unmatched transactions
4. **Unmatch if incorrect** - If auto-match got it wrong, unmatch and manually select correct one
5. **Category persistence** - When matched, the manual transaction's category is preserved

## Migration

Run the migration to add matching support:

```bash
supabase db reset  # In development
# OR
supabase db push  # In production
```

The migration adds:
- New columns to transactions table
- Matching functions
- Auto-match trigger integration

## Testing

1. **Test auto-matching:**
   - Add a manual transaction
   - Run Plaid sync
   - Verify high-confidence matches are automatically linked

2. **Test manual matching:**
   - Add a manual transaction with slightly different amount
   - Run Plaid sync (transaction won't auto-match)
   - Use "Find Matches" dialog to manually match

3. **Test unmatching:**
   - Find a matched transaction pair
   - Click "Manage Match"
   - Click "Unmatch"
   - Verify both transactions are now unmatched

## Future Enhancements

- **Bulk matching** - Match multiple transactions at once
- **Smart categorization** - Apply manual transaction category to matched Plaid transaction
- **Matching rules** - User-defined rules for auto-matching
- **Match history** - Audit log of match/unmatch actions
- **Duplicate detection** - Warn when creating manual transaction that may duplicate
