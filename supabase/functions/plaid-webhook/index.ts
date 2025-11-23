import { Configuration, PlaidApi, PlaidEnvironments } from 'npm:plaid@30.0.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';
    const PLAID_WEBHOOK_VERIFICATION_KEY = Deno.env.get('PLAID_WEBHOOK_VERIFICATION_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error('Plaid credentials not configured');
    }

    const body = await req.text();

    if (PLAID_WEBHOOK_VERIFICATION_KEY) {
      const signature = req.headers.get('Plaid-Verification');
      if (!signature) {
        throw new Error('Missing webhook signature');
      }

      const encoder = new TextEncoder();
      const keyData = encoder.encode(PLAID_WEBHOOK_VERIFICATION_KEY);
      const messageData = encoder.encode(body);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature');
      }
    }

    const webhook = JSON.parse(body);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('Received webhook:', webhook.webhook_type, webhook.webhook_code);

    const configuration = new Configuration({
      basePath: PlaidEnvironments[PLAID_ENV as keyof typeof PlaidEnvironments],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
          'PLAID-SECRET': PLAID_SECRET,
        },
      },
    });

    const plaidClient = new PlaidApi(configuration);

    switch (webhook.webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionsWebhook(webhook, plaidClient, supabase);
        break;

      case 'ITEM':
        await handleItemWebhook(webhook, supabase);
        break;

      default:
        console.log('Unhandled webhook type:', webhook.webhook_type);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Webhook processing error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process webhook',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function handleTransactionsWebhook(webhook: any, plaidClient: any, supabase: any) {
  const { item_id } = webhook;

  console.log('Processing transactions webhook for item:', item_id);

  const { data: plaidItem } = await supabase
    .from('plaid_items')
    .select('*')
    .eq('item_id', item_id)
    .single();

  if (!plaidItem) {
    console.error('Plaid item not found:', item_id);
    return;
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const endDate = new Date();

  const transactionsResponse = await plaidClient.transactionsGet({
    access_token: plaidItem.access_token,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
  });

  const transactions = transactionsResponse.data.transactions;

  for (const transaction of transactions) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('plaid_account_id', transaction.account_id)
      .eq('household_id', plaidItem.household_id)
      .single();

    if (!account) continue;

    await supabase
      .from('transactions')
      .upsert({
        account_id: account.id,
        household_id: plaidItem.household_id,
        plaid_transaction_id: transaction.transaction_id,
        amount: -transaction.amount,
        date: transaction.date,
        description: transaction.name,
        pending: transaction.pending,
        cleared: !transaction.pending,
      }, {
        onConflict: 'plaid_transaction_id',
      });
  }

  await supabase
    .from('plaid_items')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', plaidItem.id);

  console.log(`Synced ${transactions.length} transactions for item ${item_id}`);
}

async function handleItemWebhook(webhook: any, supabase: any) {
  const { item_id, webhook_code } = webhook;

  console.log('Processing item webhook:', webhook_code, 'for item:', item_id);

  let newStatus = 'active';

  switch (webhook_code) {
    case 'ERROR':
      newStatus = 'error';
      break;
    case 'PENDING_EXPIRATION':
    case 'USER_PERMISSION_REVOKED':
      newStatus = 'disconnected';
      break;
  }

  await supabase
    .from('plaid_items')
    .update({ status: newStatus })
    .eq('item_id', item_id);

  console.log(`Updated item ${item_id} status to ${newStatus}`);
}
