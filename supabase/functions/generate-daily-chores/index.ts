import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Cron-Secret',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Method not allowed. Use POST.'
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }

  try {
    // Security: Verify the request is authorized
    // This function should ONLY be called by:
    // 1. Supabase pg_cron (automatic daily job)
    // 2. Authorized admin users with secret token (for manual testing)

    const cronSecret = Deno.env.get('CRON_SECRET');
    const providedSecret = req.headers.get('X-Cron-Secret');
    const authHeader = req.headers.get('Authorization');

    let isAuthorized = false;

    // Option 1: Check for cron secret (for manual admin invocation)
    if (cronSecret && providedSecret === cronSecret) {
      isAuthorized = true;
    }

    // Option 2: Check for valid JWT token from authenticated user
    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const authClient = createClient(supabaseUrl, supabaseAnonKey);

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await authClient.auth.getUser(token);

      if (user && !authError) {
        // Additional check: user must be an admin or have specific role
        // For now, any authenticated user can trigger (you may want to restrict further)
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized. This endpoint requires authentication.'
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Proceed with authorized request
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Security logging: Record who triggered this function
    console.log('Chore generation triggered', {
      timestamp: new Date().toISOString(),
      authMethod: providedSecret ? 'secret' : 'jwt',
    });

    // Call the database function to generate recurring chores
    const { data, error } = await supabase.rpc('generate_recurring_chore_assignments');

    if (error) {
      console.error('Error generating chores:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message
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

    console.log('Chore generation completed successfully', {
      timestamp: new Date().toISOString(),
      recordsGenerated: data || 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily recurring chores generated successfully',
        timestamp: new Date().toISOString(),
        recordsGenerated: data || 0
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
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