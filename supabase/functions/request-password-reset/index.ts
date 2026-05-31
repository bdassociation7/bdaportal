// Supabase Edge Function: request-password-reset
// Generates a password reset link and sends email via Resend API
// This bypasses Supabase Auth's built-in SMTP (which may not be configured)
// and uses the same proven email path as bulk imports

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { email, redirect_to } = body

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Determine redirect URL
    const isLocal = supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost') || supabaseUrl.includes('kong:')
    const siteUrl = isLocal
      ? 'http://localhost:8082'
      : (Deno.env.get('SITE_URL') || 'https://portal.bda-global.org')
    const redirectUrl = redirect_to || `${siteUrl}/auth/set-password`

    // Generate recovery link (does NOT send email)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: email.toLowerCase().trim(),
      options: {
        redirectTo: redirectUrl,
      },
    })

    if (linkError) {
      console.error('[request-password-reset] generateLink error:', linkError.message)

      // Don't reveal whether user exists or not (security)
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send recovery email via our send-email Edge Function (Resend API)
    const resetLink = linkData.properties.action_link

    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'password_reset',
        to: email.toLowerCase().trim(),
        data: {
          reset_link: resetLink,
          confirmation_url: resetLink,
        },
      }),
    })

    const emailResult = await emailResponse.json()

    if (!emailResponse.ok || !emailResult.success) {
      console.error('[request-password-reset] Email send failed:', emailResult.error)
      return new Response(
        JSON.stringify({ error: 'Failed to send recovery email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[request-password-reset] Recovery email sent to:', email)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[request-password-reset] Error:', error.message)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
