import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://portal.bda-global.org',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type DeletePortalUserRequest = {
  user_id?: string
  confirmation?: string
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Authentication is required.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error('User deletion service is not configured')

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: sessionData, error: sessionError } = await userClient.auth.getUser()
    if (sessionError || !sessionData.user) return json({ error: 'Your session is no longer valid. Please sign in again.' }, 401)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: actor, error: actorError } = await admin
      .from('users')
      .select('id, email, role')
      .eq('id', sessionData.user.id)
      .maybeSingle()

    if (actorError || !actor || !['admin', 'super_admin'].includes(actor.role)) {
      return json({ error: 'Only BDA administrators can permanently delete portal accounts.' }, 403)
    }

    const body = await request.json() as DeletePortalUserRequest
    const targetId = body.user_id?.trim()
    if (!targetId || body.confirmation !== 'DELETE') {
      return json({ error: 'Type DELETE to confirm permanent account removal.' }, 400)
    }
    if (targetId === actor.id) {
      return json({ error: 'You cannot permanently delete your own account.' }, 400)
    }

    const { data: target, error: targetError } = await admin
      .from('users')
      .select('id, email, first_name, last_name, role, wp_user_id')
      .eq('id', targetId)
      .maybeSingle()

    if (targetError) throw targetError
    if (!target) return json({ error: 'The user account was not found.' }, 404)
    if (actor.role !== 'super_admin' && ['admin', 'super_admin'].includes(target.role)) {
      return json({ error: 'Only a Super Administrator can permanently delete an administrative account.' }, 403)
    }

    // Store a minimal, non-restorable audit record before removing the portal account.
    const { error: auditError } = await admin.from('user_deletion_audit').insert({
      deleted_user_id: target.id,
      deleted_email: target.email,
      deleted_role: target.role,
      deleted_by: actor.id,
      deleted_by_email: actor.email,
    })
    if (auditError) throw auditError

    // Email logs deliberately retain a foreign key to their recipient, so they
    // must be deleted first. Other portal records cascade from auth.users.
    const { error: emailLogsError } = await admin
      .from('email_logs')
      .delete()
      .eq('recipient_user_id', target.id)
    if (emailLogsError) throw emailLogsError

    const { error: deleteError } = await admin.auth.admin.deleteUser(target.id, false)
    if (deleteError) throw deleteError

    return json({
      success: true,
      message: `The portal account for ${target.email} was permanently deleted.`,
      wordpress_account_retained: Boolean(target.wp_user_id),
    })
  } catch (error) {
    console.error('Permanent portal user deletion failed:', error)
    return json({ error: error instanceof Error ? error.message : 'Unable to permanently delete this account.' }, 500)
  }
})
