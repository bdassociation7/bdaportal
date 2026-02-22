// Supabase Edge Function: impersonate-user
// Allows super_admin to generate a magiclink token for a target user
// Used by the admin panel to "view as" a specific user for support purposes

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the caller's identity using their JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user: callerAuth }, error: authError } = await userClient.auth.getUser()
    if (authError || !callerAuth) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client for privileged operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Verify caller is super_admin
    const { data: callerProfile, error: callerError } = await adminClient
      .from('users')
      .select('id, role, email, first_name, last_name')
      .eq('id', callerAuth.id)
      .single()

    if (callerError || !callerProfile || !['admin', 'super_admin'].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: only admins can impersonate users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { target_user_id } = await req.json()
    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: 'target_user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch and validate target user
    const { data: targetUser, error: targetError } = await adminClient
      .from('users')
      .select('id, email, role, is_active, first_name, last_name')
      .eq('id', target_user_id)
      .single()

    if (targetError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!targetUser.is_active) {
      return new Response(
        JSON.stringify({ error: 'Cannot impersonate an inactive user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (['admin', 'super_admin'].includes(targetUser.role)) {
      return new Response(
        JSON.stringify({ error: 'Cannot impersonate admin or super_admin users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate a magiclink token for the target user
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
    })

    if (linkError || !linkData) {
      console.error('[impersonate-user] generateLink error:', linkError?.message)
      return new Response(
        JSON.stringify({ error: 'Failed to generate impersonation token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log impersonation in admin_activity_logs
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    await adminClient.from('admin_activity_logs').insert({
      admin_user_id: callerAuth.id,
      action_type: 'user_impersonate',
      action_target_type: 'user',
      action_target_id: target_user_id,
      new_value: {
        target_email: targetUser.email,
        target_name: `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim(),
        target_role: targetUser.role,
        admin_email: callerProfile.email,
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    })

    console.log(`[impersonate-user] ${callerProfile.email} impersonating ${targetUser.email}`)

    return new Response(
      JSON.stringify({
        hashed_token: linkData.properties.hashed_token,
        target_user_id: targetUser.id,
        target_email: targetUser.email,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[impersonate-user] Error:', error.message)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
