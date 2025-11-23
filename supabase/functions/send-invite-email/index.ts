import { createClient } from 'npm:@supabase/supabase-js@2.58.0';
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface InviteEmailRequest {
  inviteCode: string;
  inviteEmail: string;
  householdName: string;
  inviterName: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

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
    console.log('=== Invite Email Request Started ===');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authorization header required'
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    console.log('Environment check:');
    console.log('- Supabase URL:', supabaseUrl);
    console.log('- Service key exists:', !!supabaseServiceKey);
    console.log('- Resend API key exists:', !!resendApiKey);

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized'
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

    console.log('User authenticated:', user.email);

    const requestBody = await req.json();
    const { inviteCode, inviteEmail, householdName, inviterName }: InviteEmailRequest = requestBody;

    if (!inviteCode || !inviteEmail || !householdName || !inviterName) {
      console.error('Missing required fields:', { inviteCode: !!inviteCode, inviteEmail: !!inviteEmail, householdName: !!householdName, inviterName: !!inviterName });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: inviteCode, inviteEmail, householdName, inviterName'
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const inviteUrl = `${req.headers.get('origin') || 'https://hyhhub.com'}/invite?code=${inviteCode}`;
    
    console.log('Processing invite:');
    console.log('- Invite URL:', inviteUrl);
    console.log('- Target email:', inviteEmail);

    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email?.toLowerCase() === inviteEmail.toLowerCase());

    console.log('- User already exists:', userExists);

    let emailSent = false;
    let emailError: any = null;

    if (userExists) {
      if (resendApiKey) {
        console.log('Sending email to existing user via Resend');
        const resend = new Resend(resendApiKey);

        try {
          const { data: emailData, error: resendError } = await resend.emails.send({
            from: 'HYH Hub <noreply@hyhhub.com>',
            to: [inviteEmail],
            subject: `${inviterName} invited you to join ${householdName} on HYH Hub`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
                  </div>
                  
                  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 18px; margin-top: 0;">Hi there!</p>
                    
                    <p style="font-size: 16px; color: #4b5563;">
                      <strong>${inviterName}</strong> has invited you to join their household <strong>${householdName}</strong> on HYH Hub.
                    </p>
                    
                    <p style="font-size: 16px; color: #4b5563;">
                      HYH Hub helps families manage finances, chores, meal planning, and more - all in one place.
                    </p>
                    
                    <div style="text-align: center; margin: 35px 0;">
                      <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        Accept Invitation
                      </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="font-size: 14px; color: #667eea; word-break: break-all;">
                      ${inviteUrl}
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                      This invitation was sent to ${inviteEmail}. If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                  </div>
                </body>
              </html>
            `,
          });

          if (resendError) {
            console.error('Resend error:', JSON.stringify(resendError, null, 2));
            emailError = resendError;
          } else {
            console.log('Email sent successfully via Resend:', emailData?.id);
            emailSent = true;
          }
        } catch (resendException) {
          console.error('Resend exception:', resendException);
          emailError = resendException;
        }
      } else {
        console.log('No Resend API key configured');
        emailError = { message: 'Resend API key not configured', name: 'configuration_error' };
      }
    } else {
      console.log('Inviting new user via Supabase');
      const { data: inviteData, error: supabaseEmailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(inviteEmail, {
        data: {
          invite_type: 'household',
          household_name: householdName,
          inviter_name: inviterName,
          invite_code: inviteCode,
        },
        redirectTo: inviteUrl,
      });

      if (supabaseEmailError) {
        console.error('Supabase invite error:', JSON.stringify(supabaseEmailError, null, 2));
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to send invitation email',
            details: supabaseEmailError.message,
            errorCode: supabaseEmailError.code || 'unknown',
            suggestion: 'Please verify your SMTP settings in Supabase Dashboard > Project Settings > Auth > SMTP Settings'
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

      console.log('Invite email sent successfully:', inviteData?.user?.id);
      emailSent = true;
    }

    console.log('=== Invite Email Request Completed ===');
    console.log('Result: emailSent=' + emailSent + ', userExists=' + userExists);

    return new Response(
      JSON.stringify({
        success: true,
        message: emailSent ? 'Invitation email sent successfully' : 'Invite created (email not sent)',
        userExists,
        emailSent,
        emailError: emailError ? { message: emailError.message, name: emailError.name } : null,
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
    console.error('=== Unexpected Error in Invite Email Function ===');
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred',
        details: error.message,
        type: error.constructor.name
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
