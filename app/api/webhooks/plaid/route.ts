import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role client to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhook_type, webhook_code, item_id } = body;

    console.log('Plaid webhook received:', { webhook_type, webhook_code, item_id });

    // Handle TRANSACTIONS webhooks
    if (webhook_type === 'TRANSACTIONS') {
      switch (webhook_code) {
        case 'SYNC_UPDATES_AVAILABLE':
          await handleSyncUpdatesAvailable(body);
          break;
        
        case 'DEFAULT_UPDATE':
          // Legacy webhook - redirect to sync
          await handleDefaultUpdate(body);
          break;
        
        case 'INITIAL_UPDATE':
          await handleInitialUpdate(body);
          break;
        
        case 'HISTORICAL_UPDATE':
          await handleHistoricalUpdate(body);
          break;
        
        case 'TRANSACTIONS_REMOVED':
          await handleTransactionsRemoved(body);
          break;
        
        default:
          console.log('Unhandled webhook code:', webhook_code);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function handleSyncUpdatesAvailable(body: any) {
  const { item_id, initial_update_complete, historical_update_complete } = body;

  console.log('SYNC_UPDATES_AVAILABLE:', {
    item_id,
    initial_update_complete,
    historical_update_complete,
  });

  // Get the plaid_item
  const { data: plaidItem } = await supabase
    .from('plaid_items')
    .select('id, access_token, household_id')
    .eq('item_id', item_id)
    .single();

  if (!plaidItem) {
    console.error('Plaid item not found:', item_id);
    return;
  }

  // Trigger sync by calling our sync API
  try {
    const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use a service key or internal token for server-to-server calls
        'x-webhook-secret': process.env.WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({ itemId: plaidItem.id }),
    });

    if (!syncResponse.ok) {
      console.error('Sync API call failed:', await syncResponse.text());
    } else {
      const result = await syncResponse.json();
      console.log('Sync completed:', result);
    }

    // Update item status flags
    if (initial_update_complete || historical_update_complete) {
      const updateData: any = {};
      
      if (initial_update_complete) {
        updateData.initial_update_complete = true;
      }
      
      if (historical_update_complete) {
        updateData.historical_update_complete = true;
      }

      await supabase
        .from('plaid_items')
        .update(updateData)
        .eq('id', plaidItem.id);
    }
  } catch (error) {
    console.error('Error triggering sync:', error);
  }
}

async function handleDefaultUpdate(body: any) {
  // Legacy webhook - treat as sync update
  console.log('DEFAULT_UPDATE (legacy):', body);
  await handleSyncUpdatesAvailable({
    ...body,
    initial_update_complete: false,
    historical_update_complete: false,
  });
}

async function handleInitialUpdate(body: any) {
  const { item_id } = body;
  
  console.log('INITIAL_UPDATE:', item_id);

  // Mark initial update as complete
  await supabase
    .from('plaid_items')
    .update({ initial_update_complete: true })
    .eq('item_id', item_id);

  // Trigger sync
  await handleSyncUpdatesAvailable({
    ...body,
    initial_update_complete: true,
    historical_update_complete: false,
  });
}

async function handleHistoricalUpdate(body: any) {
  const { item_id } = body;
  
  console.log('HISTORICAL_UPDATE:', item_id);

  // Mark historical update as complete
  await supabase
    .from('plaid_items')
    .update({ historical_update_complete: true })
    .eq('item_id', item_id);

  // Trigger sync
  await handleSyncUpdatesAvailable({
    ...body,
    initial_update_complete: false,
    historical_update_complete: true,
  });
}

async function handleTransactionsRemoved(body: any) {
  const { removed_transactions } = body;
  
  console.log('TRANSACTIONS_REMOVED:', removed_transactions);

  if (!removed_transactions || removed_transactions.length === 0) {
    return;
  }

  // Remove transactions from database
  for (const transactionId of removed_transactions) {
    await supabase
      .from('plaid_transactions')
      .delete()
      .eq('transaction_id', transactionId);
  }
}
