import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'npm:plaid@30.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { plaid_item_id } = await req.json();

    if (!plaid_item_id) {
      throw new Error('Missing plaid_item_id');
    }

    console.log('Syncing transactions for plaid_item_id:', plaid_item_id);

    // Get the Plaid item
    const { data: plaidItem, error: itemError } = await supabaseClient
      .from('plaid_items')
      .select('*')
      .eq('id', plaid_item_id)
      .single();

    if (itemError || !plaidItem) {
      throw new Error('Plaid item not found');
    }

    // Initialize Plaid client
    const plaidConfig = new Configuration({
      basePath: PlaidEnvironments[Deno.env.get('PLAID_ENV') || 'sandbox'],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID'),
          'PLAID-SECRET': Deno.env.get('PLAID_SECRET'),
        },
      },
    });

    const plaidClient = new PlaidApi(plaidConfig);

    // Get transactions from the last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    console.log('Fetching transactions from Plaid...');
    
    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: plaidItem.access_token,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    });

    const transactions = transactionsResponse.data.transactions;
    console.log(`Fetched ${transactions.length} transactions from Plaid`);

    // Get all plaid_accounts for this item
    const { data: plaidAccounts, error: accountsError } = await supabaseClient
      .from('plaid_accounts')
      .select('id, account_id')
      .eq('plaid_item_id', plaid_item_id);

    if (accountsError) {
      throw accountsError;
    }

    // Create a map of Plaid account_id to our plaid_account id
    const accountMap = new Map(
      plaidAccounts?.map(acc => [acc.account_id, acc.id]) || []
    );

    // Insert transactions into plaid_transactions table
    const transactionsToInsert = transactions
      .filter(t => accountMap.has(t.account_id))
      .map(transaction => ({
        plaid_account_id: accountMap.get(transaction.account_id),
        transaction_id: transaction.transaction_id,
        household_id: plaidItem.household_id,
        amount: transaction.amount,
        date: transaction.date,
        name: transaction.name,
        merchant_name: transaction.merchant_name || null,
        category: transaction.category || [],
        pending: transaction.pending,
      }));

    if (transactionsToInsert.length > 0) {
      console.log(`Inserting ${transactionsToInsert.length} transactions...`);
      
      const { error: insertError } = await supabaseClient
        .from('plaid_transactions')
        .upsert(transactionsToInsert, {
          onConflict: 'transaction_id',
        });

      if (insertError) {
        console.error('Error inserting transactions:', insertError);
        throw insertError;
      }
    }

    // Update last_synced_at
    await supabaseClient
      .from('plaid_items')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', plaid_item_id);

    console.log(`Successfully synced ${transactionsToInsert.length} transactions`);

    return new Response(
      JSON.stringify({
        success: true,
        synced: transactionsToInsert.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Sync error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to sync transactions',
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
