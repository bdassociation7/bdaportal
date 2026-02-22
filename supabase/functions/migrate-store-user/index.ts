// Supabase Edge Function: migrate-store-user
// Creates a Portal account for an existing Store (WordPress) user
// Auto-confirms email since user is already verified in WordPress
// Used by: UnifiedAuthService.createPortalFromStore

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

interface MigrateStoreUserRequest {
  email: string
  password: string
  wp_user_id: number
  first_name?: string
  last_name?: string
  wordpress_role?: string
  bda_role?: string
  organization?: string
}

interface WordPressVerifyResponse {
  success: boolean
  user_data?: {
    wp_user_id: number
    email: string
    first_name?: string
    last_name?: string
    wordpress_role?: string
    bda_role?: string
    bda_organization?: string
  }
  needs_portal_account?: boolean
  error?: string
  message?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const body: MigrateStoreUserRequest = await req.json()

    if (!body.email || !body.password || !body.wp_user_id) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and wp_user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get WordPress API URL from environment
    const wpApiUrl = Deno.env.get('WORDPRESS_API_URL')
    const wpApiKey = Deno.env.get('WORDPRESS_API_KEY')

    if (!wpApiUrl || !wpApiKey) {
      console.error('WordPress API configuration missing')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify WordPress credentials before creating Portal account
    console.log(`Verifying WordPress credentials for: ${body.email}`)

    const wpVerifyResponse = await fetch(`${wpApiUrl}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BDA-API-Key': wpApiKey,
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
      }),
    })

    if (!wpVerifyResponse.ok) {
      console.error('WordPress credential verification failed:', wpVerifyResponse.status)
      return new Response(
        JSON.stringify({ error: 'WordPress credential verification failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const wpVerifyData: WordPressVerifyResponse = await wpVerifyResponse.json()

    if (!wpVerifyData.success || !wpVerifyData.user_data) {
      console.error('Invalid WordPress credentials:', wpVerifyData.error || wpVerifyData.message)
      return new Response(
        JSON.stringify({ error: wpVerifyData.error || 'Invalid WordPress credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the wp_user_id matches
    if (wpVerifyData.user_data.wp_user_id !== body.wp_user_id) {
      console.error('WordPress user ID mismatch')
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`WordPress credentials verified for wp_user_id: ${body.wp_user_id}`)

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if user already exists in auth.users
    const { data: existingAuthUser } = await adminClient.auth.admin.listUsers()
    const existingUser = existingAuthUser?.users?.find(
      u => u.email?.toLowerCase() === body.email.toLowerCase()
    )

    if (existingUser) {
      console.log(`User already exists in auth.users: ${existingUser.id}`)

      // Update metadata to link with WordPress
      await adminClient.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          wp_user_id: body.wp_user_id,
          first_name: body.first_name || existingUser.user_metadata?.first_name,
          last_name: body.last_name || existingUser.user_metadata?.last_name,
          bda_role: body.bda_role || existingUser.user_metadata?.bda_role || 'individual',
          organization: body.organization || existingUser.user_metadata?.organization,
          created_from: 'store',
        },
      })

      // Update public.users to link with WordPress
      await adminClient
        .from('users')
        .upsert({
          id: existingUser.id,
          email: body.email.toLowerCase(),
          first_name: body.first_name,
          last_name: body.last_name,
          role: body.bda_role || 'individual',
          wp_user_id: body.wp_user_id,
          wp_sync_status: 'synced',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })

      return new Response(
        JSON.stringify({
          success: true,
          user_id: existingUser.id,
          email: body.email,
          action: 'linked_existing',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new user with email_confirm: true (auto-confirmed)
    console.log(`Creating new Portal user for: ${body.email}`)

    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: body.email.toLowerCase(),
      password: body.password,
      email_confirm: true, // Auto-confirm since verified in WordPress
      user_metadata: {
        wp_user_id: body.wp_user_id,
        first_name: body.first_name,
        last_name: body.last_name,
        bda_role: body.bda_role || 'individual',
        organization: body.organization,
        created_from: 'store',
      },
    })

    if (createError) {
      console.error('Failed to create auth user:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user?.id
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID not returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Created new Portal user: ${userId}`)

    // Update public.users with additional info
    await adminClient
      .from('users')
      .update({
        first_name: body.first_name,
        last_name: body.last_name,
        role: body.bda_role || 'individual',
        wp_user_id: body.wp_user_id,
        wp_sync_status: 'synced',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    // Notify WordPress that portal account was created
    try {
      await fetch(`${wpApiUrl}/auth/create-portal-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BDA-API-Key': wpApiKey,
        },
        body: JSON.stringify({
          wp_user_id: body.wp_user_id,
          portal_user_id: userId,
        }),
      })
    } catch (wpError) {
      console.warn('Failed to notify WordPress (non-critical):', wpError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: body.email,
        action: 'created_new',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Migrate store user error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
