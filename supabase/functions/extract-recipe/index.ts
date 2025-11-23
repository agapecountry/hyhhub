import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ParsedIngredient {
  name: string;
  quantity: string;
}

function parseIngredient(ingredientText: string): ParsedIngredient {
  let text = ingredientText.trim();

  const quantityPatterns = [
    /^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(cups?|tablespoons?|teaspoons?|tbsp\.?|tsp\.?|oz\.?|ounces?|pounds?|lbs?\.?|grams?|g|kilograms?|kg|ml|milliliters?|liters?|l|pinch(?:es)?|dash(?:es)?|cloves?|slices?|pieces?|medium|large|small)/i,
    /^(\d+(?:\/\d+)?(?:\.\d+)?(?:\s*-\s*\d+(?:\/\d+)?(?:\.\d+)?)?)\s*(cups?|tablespoons?|teaspoons?|tbsp\.?|tsp\.?|oz\.?|ounces?|pounds?|lbs?\.?|grams?|g|kilograms?|kg|ml|milliliters?|liters?|l)/i,
    /^(one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(cups?|tablespoons?|teaspoons?|tbsp\.?|tsp\.?|oz\.?|ounces?|pounds?|lbs?\.?|grams?|g|kilograms?|kg)/i,
    /^(¼|½|¾|⅓|⅔|⅛|⅜|⅝|⅞|\d+\/\d+)\s*(cups?|tablespoons?|teaspoons?|tbsp\.?|tsp\.?|oz\.?|ounces?)/i,
  ];

  for (const pattern of quantityPatterns) {
    const match = text.match(pattern);
    if (match) {
      const quantity = `${match[1]} ${match[2]}`.trim();
      const name = text.substring(match[0].length).trim();

      return {
        quantity: quantity,
        name: name || text,
      };
    }
  }

  const simpleNumberPattern = /^(\d+(?:\/\d+)?(?:\.\d+)?(?:\s*-\s*\d+(?:\/\d+)?(?:\.\d+)?)?)\s+/;
  const numberMatch = text.match(simpleNumberPattern);
  if (numberMatch) {
    return {
      quantity: numberMatch[1].trim(),
      name: text.substring(numberMatch[0].length).trim(),
    };
  }

  const fractionPattern = /^(¼|½|¾|⅓|⅔|⅛|⅜|⅝|⅞|\d+\/\d+)\s+/;
  const fractionMatch = text.match(fractionPattern);
  if (fractionMatch) {
    return {
      quantity: fractionMatch[1],
      name: text.substring(fractionMatch[0].length).trim(),
    };
  }

  const wordNumberPattern = /^(one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+/i;
  const wordMatch = text.match(wordNumberPattern);
  if (wordMatch) {
    return {
      quantity: wordMatch[1],
      name: text.substring(wordMatch[0].length).trim(),
    };
  }

  return {
    quantity: '',
    name: text,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Authentication required.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        JSON.stringify({ error: 'Invalid authentication token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching recipe from URL', { userId: user.id, url, timestamp: new Date().toISOString() });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      const errorMessage = response.status === 403
        ? 'This website is blocking automated access. Please try a different recipe URL or manually copy the recipe details.'
        : `Failed to fetch URL (Status: ${response.status}). The website may be unavailable or blocking access.`;

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();

    let recipeName = '';
    let ingredientsRaw: string[] = [];
    let instructions = '';

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      recipeName = titleMatch[1].replace(/ - .+$/, '').replace(/\|.+$/, '').trim();
    }

    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match && !recipeName) {
      recipeName = h1Match[1].trim();
    }

    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const jsonData = JSON.parse(match[1]);
        const recipes = Array.isArray(jsonData) ? jsonData : [jsonData];

        for (const item of recipes) {
          if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
            if (item.name) recipeName = item.name;
            if (item.recipeIngredient && Array.isArray(item.recipeIngredient)) {
              ingredientsRaw = item.recipeIngredient;
            }
            if (item.recipeInstructions) {
              if (typeof item.recipeInstructions === 'string') {
                instructions = item.recipeInstructions;
              } else if (Array.isArray(item.recipeInstructions)) {
                instructions = item.recipeInstructions
                  .map((step: any, i: number) => {
                    const text = typeof step === 'string' ? step : step.text || '';
                    return `${i + 1}. ${text}`;
                  })
                  .join('\n');
              }
            }
            break;
          }
        }
      } catch (e) {
        console.log('Failed to parse JSON-LD', e);
      }
    }

    if (ingredientsRaw.length === 0) {
      const ingredientPatterns = [
        /<[^>]*class=["'][^"']*ingredient[^"']*["'][^>]*>([^<]+)<\/[^>]+>/gi,
        /<li[^>]*>([^<]*(?:cup|tablespoon|teaspoon|tbsp|tsp|oz|pound|lb|gram|kg)[^<]*)<\/li>/gi,
      ];

      for (const pattern of ingredientPatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          const text = match[1].replace(/<[^>]*>/g, '').trim();
          if (text && text.length > 3 && text.length < 200) {
            ingredientsRaw.push(text);
          }
        }
        if (ingredientsRaw.length > 0) break;
      }
    }

    if (!instructions) {
      const instructionPatterns = [
        /<[^>]*class=["'][^"']*instruction[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi,
        /<ol[^>]*class=["'][^"']*method[^"']*["'][^>]*>([\s\S]*?)<\/ol>/gi,
      ];

      for (const pattern of instructionPatterns) {
        const match = html.match(pattern);
        if (match) {
          const liMatches = match[0].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
          const steps: string[] = [];
          for (const liMatch of liMatches) {
            const text = liMatch[1].replace(/<[^>]*>/g, '').trim();
            if (text) steps.push(text);
          }
          if (steps.length > 0) {
            instructions = steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
            break;
          }
        }
      }
    }

    const parsedIngredients = ingredientsRaw.slice(0, 50).map(ing => parseIngredient(ing));

    return new Response(
      JSON.stringify({
        name: recipeName || 'Untitled Recipe',
        ingredients: parsedIngredients,
        instructions: instructions || 'No instructions found. Please add them manually.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error extracting recipe:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to extract recipe data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});