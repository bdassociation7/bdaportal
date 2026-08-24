// Supabase Edge Function: create-user
// Creates a single user securely using service role key
// Used by: admin user creation, trainee account creation, partner creation (ECP/PDP)
//
// v3: Creates ECP/PDP partner accounts through a one-time set-password invitation.
//     No temporary password is disclosed to the admin, the browser, or email logs.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreateUserRequest {
  email: string
  password?: string
  first_name: string
  last_name: string
  phone?: string
  country_code?: string
  company_name?: string
  job_title?: string
  role?: string
  preferred_language?: string
  source?: string
  metadata?: Record<string, any>
  // For trainee linking
  trainee_id?: string
  // For admin creation
  admin_role_type?: string
  department?: string
  // For one-time partner account invitations
  organization_name?: string
  send_welcome_email?: boolean
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// Partner type full names
function getPartnerTypeFull(role: string): string {
  if (role === 'ecp') return 'Endorsed Certification Partner (ECP)'
  if (role === 'pdp') return 'Professional Development Provider (PDP)'
  return role.toUpperCase()
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the request has a valid JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify the calling user is an admin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin or has ECP/PDP role
    const { data: userData, error: userError } = await userClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const allowedRoles = ['admin', 'super_admin', 'ecp', 'pdp']
    if (userError || !userData || !allowedRoles.includes(userData.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient privileges. Admin or Partner role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: CreateUserRequest = await req.json()

    if (!body.email || !body.first_name || !body.last_name) {
      return new Response(
        JSON.stringify({ error: 'Email, first_name, and last_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if user already exists
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id')
      .eq('email', body.email.toLowerCase())
      .single()

    if (existingUser) {
      return new Response(
        JSON.stringify({
          error: 'User already exists',
          existing_user_id: existingUser.id,
          already_exists: true
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isPartnerInvitation =
      (body.role === 'ecp' || body.role === 'pdp') &&
      body.source === 'admin_partner_invite'

    // Supabase Auth requires a password for admin-created accounts. For a partner
    // invitation it is an internal random secret only; the partner sets their own
    // password through the one-time recovery link and it is never returned or emailed.
    const password = body.password || generateTempPassword()
    const isGeneratedPassword = !body.password

    // Create user in Supabase Auth
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: body.email.toLowerCase(),
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: body.first_name,
        last_name: body.last_name,
        source: body.source || 'admin_created',
        ...body.metadata,
      },
    })

    if (createError) {
      // Handle already registered error
      if (createError.message.includes('already registered')) {
        return new Response(
          JSON.stringify({
            error: 'User already registered',
            already_exists: true
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw createError
    }

    const userId = authData.user?.id
    if (!userId) {
      throw new Error('User ID not returned from auth creation')
    }

    // Update user profile
    const profileUpdate: Record<string, any> = {
      first_name: body.first_name,
      last_name: body.last_name,
      updated_at: new Date().toISOString(),
    }

    if (body.phone) profileUpdate.phone = body.phone
    if (body.country_code) profileUpdate.country_code = body.country_code
    if (body.company_name) profileUpdate.company_name = body.company_name
    if (body.job_title) profileUpdate.job_title = body.job_title
    if (body.role) profileUpdate.role = body.role
    if (body.preferred_language) profileUpdate.preferred_language = body.preferred_language
    if (isPartnerInvitation) profileUpdate.profile_completed = false

    await adminClient
      .from('users')
      .update(profileUpdate)
      .eq('id', userId)

    // Handle trainee linking if trainee_id provided
    if (body.trainee_id) {
      await adminClient
        .from('ecp_trainees')
        .update({ user_id: userId })
        .eq('id', body.trainee_id)
    }

    // Handle admin user creation if admin_role_type provided
    if (body.admin_role_type) {
      await adminClient
        .from('admin_users')
        .upsert({
          user_id: userId,
          admin_role_type: body.admin_role_type,
          department: body.department || null,
          is_active: true,
          password_reset_required: true,
        }, { onConflict: 'user_id' })
    }

    let invitationEmailSent = false

    if (isPartnerInvitation) {
      try {
        const portalUrl = Deno.env.get('PORTAL_URL') || 'https://portal.bda-global.org'
        const setPasswordUrl = `${portalUrl}/auth/set-password`
        const { data: recoveryData, error: recoveryError } = await adminClient.auth.admin.generateLink({
          type: 'recovery',
          email: body.email.toLowerCase(),
          options: { redirectTo: setPasswordUrl },
        })

        if (recoveryError || !recoveryData?.properties?.action_link) {
          throw new Error(recoveryError?.message || 'Unable to generate the set-password link')
        }

        const partnerTypeFull = getPartnerTypeFull(body.role || 'ecp')
        const organisationName = body.organization_name || body.company_name || `${body.first_name} ${body.last_name}`
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify({
            type: 'partner_account_invitation',
            to: body.email.toLowerCase(),
            user_id: userId,
            data: {
              first_name: body.first_name,
              organisation_name: organisationName,
              partner_type_full: partnerTypeFull,
              email: body.email.toLowerCase(),
              portal_url: portalUrl,
              set_password_url: recoveryData.properties.action_link,
            },
          }),
        })

        const emailResult = await emailResponse.json()
        if (!emailResponse.ok || !emailResult.success) {
          throw new Error(emailResult.error || 'Unable to send the partner invitation email')
        }

        invitationEmailSent = true
        console.log(`[create-user] One-time partner invitation sent to ${body.email}`)
      } catch (inviteError: any) {
        // Do not leave an unusable partner account or partner record behind if the invitation fails.
        await adminClient.from('partners').delete().eq('id', userId)
        const { error: cleanupError } = await adminClient.auth.admin.deleteUser(userId)
        if (cleanupError) {
          console.error(`[create-user] Failed to clean up partner account after invitation failure: ${cleanupError.message}`)
        }
        throw new Error(`Partner invitation could not be sent. The account setup was rolled back: ${inviteError.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: body.email,
        temp_password: isPartnerInvitation ? undefined : (isGeneratedPassword ? password : undefined),
        invitation_email_sent: invitationEmailSent,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Create user error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
