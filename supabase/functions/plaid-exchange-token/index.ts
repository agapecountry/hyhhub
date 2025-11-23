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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error('Plaid credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { public_token, householdId } = await req.json();

    if (!public_token || !householdId) {
      throw new Error('Missing public_token or householdId');
    }

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken,
    });

    const institutionId = itemResponse.data.item.institution_id;

    let institutionName = 'Unknown Institution';
    if (institutionId) {
      try {
        const instResponse = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: ['US' as any],
        });
        institutionName = instResponse.data.institution.name;
      } catch (e) {
        console.error('Error fetching institution name:', e);
      }
    }

    const { data: plaidItem, error: itemInsertError } = await supabase
      .from('plaid_items')
      .insert({
        household_id: householdId,
        access_token: accessToken,
        item_id: itemId,
        institution_id: institutionId,
        institution_name: institutionName,
        status: 'active',
      })
      .select()
      .single();

    if (itemInsertError) {
      console.error('Error inserting plaid item:', itemInsertError);
      throw itemInsertError;
    }

    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accounts = accountsResponse.data.accounts;

    const accountInserts = accounts.map((account: any) => ({
      plaid_item_id: plaidItem.id,
      household_id: householdId,
      account_id: account.account_id,
      name: account.name,
      official_name: account.official_name || null,
      type: account.type,
      subtype: account.subtype || null,
      mask: account.mask || null,
      current_balance: account.balances.current || 0,
      available_balance: account.balances.available || null,
      currency_code: account.balances.iso_currency_code || 'USD',
      is_active: true,
    }));

    const { error: accountsInsertError } = await supabase
      .from('plaid_accounts')
      .insert(accountInserts);

    if (accountsInsertError) {
      console.error('Error inserting accounts:', accountsInsertError);
      throw accountsInsertError;
    }

    await supabase
      .from('plaid_items')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', plaidItem.id);

    return new Response(
      JSON.stringify({
        success: true,
        item_id: itemId,
        accounts_count: accounts.length,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error exchanging token:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to exchange token',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
