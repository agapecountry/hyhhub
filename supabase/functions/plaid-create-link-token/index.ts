import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'npm:plaid@30.0.0';

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

    console.log('Environment check:', {
      hasClientId: !!PLAID_CLIENT_ID,
      clientIdLength: PLAID_CLIENT_ID?.length,
      hasSecret: !!PLAID_SECRET,
      secretPrefix: PLAID_SECRET?.substring(0, 8),
      environment: PLAID_ENV,
    });

    if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
      throw new Error('Plaid credentials not configured');
    }

    const basePath = PLAID_ENV === 'sandbox'
      ? PlaidEnvironments.sandbox
      : PLAID_ENV === 'development'
      ? PlaidEnvironments.development
      : PlaidEnvironments.production;

    console.log('Plaid configuration:', {
      basePath,
      environment: PLAID_ENV,
    });

    const configuration = new Configuration({
      basePath,
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

    const { userId, householdId } = await req.json();

    if (!userId || !householdId) {
      throw new Error('Missing userId or householdId');
    }

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/plaid-webhook`;

    console.log('Creating link token with:', {
      userId,
      householdId,
      webhookUrl,
      plaidEnv: PLAID_ENV,
      hasClientId: !!PLAID_CLIENT_ID,
      hasSecret: !!PLAID_SECRET,
    });

    const request = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Handle Your House',
      products: [Products.Transactions, Products.Auth],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: webhookUrl,
    };

    const response = await plaidClient.linkTokenCreate(request);

    return new Response(
      JSON.stringify({
        link_token: response.data.link_token,
        expiration: response.data.expiration,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error creating link token:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });

    const errorMessage = error.response?.data?.error_message || error.message || 'Failed to create link token';

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error.response?.data,
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
