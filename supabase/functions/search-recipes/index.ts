import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
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

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({
        error: 'Unauthorized. Authentication required.'
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: 'Invalid authentication token.'
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

    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (query.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Query too long. Maximum 200 characters.' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log('Recipe search request', {
      userId: user.id,
      queryLength: query.length,
      timestamp: new Date().toISOString(),
    });

    const searchQuery = `${query} recipe`;
    const encodedQuery = encodeURIComponent(searchQuery);

    const popularRecipeSites = [
      'allrecipes.com',
      'bonappetit.com',
      'epicurious.com',
      'seriouseats.com',
      'tasty.co',
      'delish.com',
      'simplyrecipes.com',
      'tasteofhome.com',
      'budgetbytes.com',
      'thekitchn.com'
    ];

    const results = popularRecipeSites.slice(0, 8).map((site) => ({
      title: `${query.charAt(0).toUpperCase() + query.slice(1)} Recipe - ${site.split('.')[0].charAt(0).toUpperCase() + site.split('.')[0].slice(1)}`,
      url: `https://www.google.com/search?q=${encodedQuery}+site:${site}`,
      description: `Search for ${query} recipes on ${site}. Click to find detailed recipes, ingredients, and cooking instructions.`,
    }));

    return new Response(
      JSON.stringify({ results }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to search recipes' }),
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