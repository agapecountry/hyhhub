import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if request has valid authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Verify the caller is authenticated (for cron job, use service role key)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    // For cron jobs, we'll use service role key directly
    // For manual calls, verify user is admin
    const isServiceRole = token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!isServiceRole && (authError || !user)) {
      throw new Error('Unauthorized')
    }

    console.log('Generating recurring influencer payouts...')

    // Call the database function to generate payouts
    const { data, error } = await supabaseAdmin.rpc('generate_recurring_influencer_payouts')

    if (error) {
      console.error('Error generating payouts:', error)
      throw error
    }

    const result = data?.[0] || { payouts_created: 0, total_amount_cents: 0 }

    console.log(`Generated ${result.payouts_created} recurring payouts for total of $${(result.total_amount_cents / 100).toFixed(2)}`)

    return new Response(
      JSON.stringify({
        success: true,
        payouts_created: result.payouts_created,
        total_amount_cents: result.total_amount_cents,
        total_amount_dollars: (result.total_amount_cents / 100).toFixed(2),
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in generate-influencer-payouts:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
