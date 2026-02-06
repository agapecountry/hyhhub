import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Configuration, PlaidApi, PlaidEnvironments, Transaction as PlaidTransaction } from 'plaid';

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export async function POST(request: NextRequest) {
  try {
    // Use service role client for server-side operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { itemId, userId } = await request.json();

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    // Get the Plaid item from database
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .select('id, household_id, access_token, transactions_cursor')
      .eq('id', itemId)
      .single();

    if (itemError || !plaidItem) {
      return NextResponse.json({ error: 'Plaid item not found' }, { status: 404 });
    }

    // Note: This endpoint is called by webhooks (server-to-server)
    // Authentication is handled by webhook secret verification

    // Get plaid_accounts for this item
    const { data: plaidAccounts } = await supabase
      .from('plaid_accounts')
      .select('id, account_id')
      .eq('plaid_item_id', plaidItem.id);

    if (!plaidAccounts || plaidAccounts.length === 0) {
      return NextResponse.json({ error: 'No accounts found for this item' }, { status: 404 });
    }

    // Sync transactions from Plaid
    let cursor = plaidItem.transactions_cursor || undefined;
    let hasMore = true;
    let addedCount = 0;
    let modifiedCount = 0;
    let removedCount = 0;

    while (hasMore) {
      try {
        const response = await plaidClient.transactionsSync({
          access_token: plaidItem.access_token,
          cursor: cursor,
          count: 500, // Max transactions per request
        });

        const { added, modified, removed, next_cursor, has_more } = response.data;

        // Process added transactions
        for (const transaction of added) {
          const plaidAccount = plaidAccounts.find(a => a.account_id === transaction.account_id);
          if (!plaidAccount) continue;

          await upsertTransaction(supabase, transaction, plaidAccount.id, plaidItem.household_id);
          addedCount++;
        }

        // Process modified transactions
        for (const transaction of modified) {
          const plaidAccount = plaidAccounts.find((a: any) => a.account_id === transaction.account_id);
          if (!plaidAccount) continue;

          await upsertTransaction(supabase, transaction, plaidAccount.id, plaidItem.household_id, true);
          modifiedCount++;
        }

        // Process removed transactions
        for (const removedTxn of removed) {
          await supabase
            .from('plaid_transactions')
            .delete()
            .eq('transaction_id', removedTxn.transaction_id);
          removedCount++;
        }

        // Update cursor
        cursor = next_cursor;
        hasMore = has_more;

        // Save cursor after each batch
        await supabase
          .from('plaid_items')
          .update({ 
            transactions_cursor: cursor,
            last_synced_at: new Date().toISOString()
          })
          .eq('id', plaidItem.id);

      } catch (syncError: any) {
        // Handle pagination mutation error
        if (syncError.response?.data?.error_code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION') {
          // Restart sync with old cursor
          cursor = plaidItem.transactions_cursor || undefined;
          continue;
        }
        throw syncError;
      }
    }

    return NextResponse.json({
      success: true,
      added: addedCount,
      modified: modifiedCount,
      removed: removedCount,
    });

  } catch (error: any) {
    console.error('Plaid sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync transactions' },
      { status: 500 }
    );
  }
}

async function upsertTransaction(
  supabase: any,
  transaction: PlaidTransaction,
  plaidAccountId: string,
  householdId: string,
  isModified: boolean = false
) {
  // Check if transaction was user-modified - don't overwrite if it was
  if (isModified) {
    const { data: existing } = await supabase
      .from('plaid_transactions')
      .select('user_modified')
      .eq('transaction_id', transaction.transaction_id)
      .single();

    // Don't update user-modified transactions
    if (existing?.user_modified) {
      return;
    }
  }

  // Handle pending->cleared transitions:
  // When a pending transaction clears, Plaid gives it a new transaction_id
  // and references the old pending ID in pending_transaction_id.
  // Update the existing pending record instead of inserting a duplicate.
  if (transaction.pending_transaction_id && !transaction.pending) {
    const { data: pendingRecord } = await supabase
      .from('plaid_transactions')
      .select('id')
      .eq('transaction_id', transaction.pending_transaction_id)
      .maybeSingle();

    if (pendingRecord) {
      await supabase
        .from('plaid_transactions')
        .update({
          transaction_id: transaction.transaction_id,
          pending: false,
          is_cleared: true,
          amount: transaction.amount,
          date: transaction.date,
          name: transaction.name,
          merchant_name: transaction.merchant_name || null,
          pending_transaction_id: transaction.pending_transaction_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pendingRecord.id);
      return;
    }
  }

  const transactionData = {
    plaid_account_id: plaidAccountId,
    transaction_id: transaction.transaction_id,
    household_id: householdId,
    amount: transaction.amount,
    date: transaction.date,
    name: transaction.name,
    merchant_name: transaction.merchant_name || null,
    category: transaction.category ? JSON.stringify(transaction.category) : '[]',
    pending: transaction.pending,
    is_cleared: !transaction.pending,
    iso_currency_code: transaction.iso_currency_code || null,
    unofficial_currency_code: transaction.unofficial_currency_code || null,
    authorized_date: transaction.authorized_date || null,
    authorized_datetime: transaction.authorized_datetime || null,
    datetime: transaction.datetime || null,
    payment_channel: transaction.payment_channel || null,
    pending_transaction_id: transaction.pending_transaction_id || null,
    transaction_type: transaction.transaction_type || null,
    check_number: transaction.check_number || null,
    personal_finance_category: transaction.personal_finance_category 
      ? JSON.stringify(transaction.personal_finance_category) 
      : null,
    personal_finance_category_icon_url: transaction.personal_finance_category_icon_url || null,
    location: transaction.location ? JSON.stringify(transaction.location) : null,
    logo_url: transaction.logo_url || null,
    website: transaction.website || null,
    counterparties: transaction.counterparties ? JSON.stringify(transaction.counterparties) : null,
    updated_at: new Date().toISOString(),
  };

  // Upsert transaction
  await supabase
    .from('plaid_transactions')
    .upsert(transactionData, {
      onConflict: 'transaction_id',
      ignoreDuplicates: false,
    });
}
