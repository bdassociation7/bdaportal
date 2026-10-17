import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PORTAL_ORIGIN = 'https://portal.bda-global.org'
const ALLOWED_ORIGIN = PORTAL_ORIGIN

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type InviteRequest = {
  trainer_id?: string
}

type PortalAccount = {
  id: string
  email: string
  role: string
  first_name: string | null
  last_name: string | null
}

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character] || character))
}

function isPartnerRole(role: string | null | undefined) {
  return ['ecp', 'pdp', 'dual_partner', 'ecp_partner', 'pdp_partner'].includes(role || '')
}

async function sendTrainerInviteEmail(
  resendApiKey: string,
  email: string,
  firstName: string,
  actionLink: string,
  needsPassword: boolean,
): Promise<string> {
  const safeName = escapeHtml(firstName || 'there')
  const actionLabel = needsPassword ? 'Set Your Password' : 'Activate Instructor View'
  const actionText = needsPassword
    ? 'Use the secure button below to set a password and activate Instructor View in the BDA Learning System.'
    : 'Use the secure button below to activate Instructor View in the BDA Learning System.'

  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Business Development Association (BDA) <noreply@bda-global.org>',
      to: [email],
      subject: needsPassword ? 'Set your password for BDA Instructor View' : 'Activate your BDA Instructor View account',
      html: `
        <div style="margin:0;background:#f0f6ff;padding:32px 16px;font-family:Arial,sans-serif;color:#0d1f4e">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(13,31,78,.12)">
            <div style="padding:24px 32px;background:linear-gradient(135deg,#0d1f4e,#0f91e0);color:#ffffff">
              <div style="font-size:20px;font-weight:700">Business Development Association (BDA)</div>
            </div>
            <div style="padding:32px">
              <h1 style="margin:0 0 16px;font-size:24px;color:#0d1f4e">Your Instructor View is ready</h1>
              <p style="margin:0 0 16px;line-height:1.6">Hello ${safeName},</p>
              <p style="margin:0 0 16px;line-height:1.6">Your organisation has added you to its BDA trainer register. ${actionText}</p>
              <p style="margin:0 0 28px"><a href="${actionLink}" style="display:inline-block;border-radius:8px;background:#0f91e0;color:#ffffff;padding:13px 22px;text-decoration:none;font-weight:700">${actionLabel}</a></p>
              <p style="margin:0;color:#5f6f8f;font-size:13px;line-height:1.6">This link is single-use. If you were not expecting this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </div>`,
    }),
  })

  const payload = await result.json().catch(() => ({})) as { id?: string; message?: string }
  if (!result.ok || !payload.id) {
    throw new Error(`Invitation email delivery failed: ${payload.message || result.statusText}`)
  }

  return payload.id
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = request.headers.get('Authorization')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!authHeader) return response({ error: 'Authentication is required' }, 401)
    if (!supabaseUrl || !serviceRoleKey || !publishableKey || !resendApiKey) {
      throw new Error('Trainer invitation service is not configured')
    }

    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: callerError } = await userClient.auth.getUser()
    if (callerError || !caller) return response({ error: 'Invalid authentication' }, 401)

    const { data: callerProfile, error: profileError } = await userClient
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (profileError || !callerProfile || !['ecp', 'admin', 'super_admin'].includes(callerProfile.role)) {
      return response({ error: 'Only authorised ECP partners can invite trainers' }, 403)
    }

    const body = await request.json() as InviteRequest
    const trainerId = body.trainer_id?.trim()
    if (!trainerId) return response({ error: 'trainer_id is required' }, 400)

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: trainer, error: trainerError } = await admin
      .from('ecp_trainers')
      .select('id, email, first_name, last_name, partner_id, user_id, is_active, status')
      .eq('id', trainerId)
      .single()

    if (trainerError || !trainer) return response({ error: 'Trainer not found' }, 404)
    if (!['admin', 'super_admin'].includes(callerProfile.role) && trainer.partner_id !== caller.id) {
      return response({ error: 'This trainer does not belong to your organisation' }, 403)
    }
    if (!trainer.is_active || trainer.status !== 'approved') {
      return response({ error: 'Only active approved trainers can receive a portal invitation' }, 409)
    }
    if (trainer.user_id) {
      return response({ success: true, already_active: true, message: 'Trainer already has an active account' })
    }

    const normalizedEmail = trainer.email.trim().toLowerCase()

    // The partner principal is never eligible to be a trainer. This check is
    // deliberately duplicated in the database acceptance function as a hard
    // backstop for every entry route.
    const { data: sameEmailPartner } = await admin
      .from('partners')
      .select('id, partner_type')
      .ilike('contact_email', normalizedEmail)
      .in('partner_type', ['ecp', 'pdp', 'dual_partner'])
      .maybeSingle()

    if (sameEmailPartner || normalizedEmail === caller.email?.trim().toLowerCase()) {
      return response({
        error: 'A partner account email cannot be used for a trainer. Use a separate individual trainer email address.',
        code: 'partner_email_cannot_be_trainer',
      }, 409)
    }

    const { data: existingProfile, error: existingProfileError } = await admin
      .from('users')
      .select('id, email, role, first_name, last_name')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (existingProfileError) throw existingProfileError
    if (existingProfile && isPartnerRole(existingProfile.role)) {
      return response({
        error: 'A partner account cannot be converted into a trainer. Use a separate individual trainer account.',
        code: 'partner_email_cannot_be_trainer',
      }, 409)
    }
    if (existingProfile && !['individual', 'trainer'].includes(existingProfile.role)) {
      return response({
        error: 'This email is associated with a portal account that is not eligible for trainer activation.',
        code: 'ineligible_account_role',
      }, 409)
    }

    const { data: authLookupResult, error: authLookupError } = await admin
      .rpc('get_auth_user_by_email', { p_email: normalizedEmail })
      .maybeSingle()
    if (authLookupError) throw authLookupError
    const authLookup = authLookupResult as { id?: string } | null

    if (authLookup?.id && !existingProfile) {
      const { data: authRecord, error: authRecordError } = await admin.auth.admin.getUserById(authLookup.id)
      if (authRecordError || !authRecord.user) {
        throw authRecordError || new Error('Unable to inspect the existing authentication account')
      }

      const metadata = authRecord.user.user_metadata || {}
      const { data: restoredProfile, error: restoreError } = await admin
        .from('users')
        .upsert({
          id: authRecord.user.id,
          email: authRecord.user.email || normalizedEmail,
          first_name: metadata.first_name || metadata.firstName || trainer.first_name,
          last_name: metadata.last_name || metadata.lastName || trainer.last_name,
          role: 'individual',
          created_from: 'portal',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
        .select('id, email, role, first_name, last_name')
        .single()
      if (restoreError || !restoredProfile) throw restoreError || new Error('Unable to restore the portal profile')
      if (isPartnerRole(restoredProfile.role)) {
        return response({ error: 'A partner account cannot be converted into a trainer.', code: 'partner_email_cannot_be_trainer' }, 409)
      }
    }

    const { data: resolvedProfile, error: resolvedProfileError } = await admin
      .from('users')
      .select('id, email, role, first_name, last_name')
      .ilike('email', normalizedEmail)
      .maybeSingle()
    if (resolvedProfileError) throw resolvedProfileError

    if (resolvedProfile?.role === 'trainer') {
      const { data: linkedTrainer, error: linkedTrainerError } = await admin
        .from('ecp_trainers')
        .select('id')
        .eq('user_id', resolvedProfile.id)
        .maybeSingle()
      if (linkedTrainerError) throw linkedTrainerError
      if (linkedTrainer && linkedTrainer.id !== trainer.id) {
        return response({ error: 'This trainer account is already linked to a different trainer record.', code: 'trainer_account_already_linked' }, 409)
      }
    }

    // Replace any pending invitation only after all account eligibility checks
    // have passed. Failed validation cannot invalidate a previous valid invite.
    const now = new Date().toISOString()
    const { error: expireError } = await admin
      .from('trainer_invite_tokens')
      .update({ used_at: now })
      .eq('trainer_id', trainer.id)
      .is('used_at', null)
    if (expireError) throw expireError

    const { data: inviteRecord, error: inviteError } = await admin
      .from('trainer_invite_tokens')
      .insert({ trainer_id: trainer.id, partner_id: trainer.partner_id, email: normalizedEmail })
      .select('id, token')
      .single()
    if (inviteError || !inviteRecord) throw inviteError || new Error('Unable to create invitation token')

    const isNewAccount = !resolvedProfile && !authLookup?.id
    const redirectTo = isNewAccount
      ? `${PORTAL_ORIGIN}/auth/set-password?trainer_invitation=${encodeURIComponent(inviteRecord.token)}`
      : `${PORTAL_ORIGIN}/instructor/accept-invite?token=${encodeURIComponent(inviteRecord.token)}`

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: isNewAccount ? 'invite' : 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo,
        data: {
          first_name: resolvedProfile?.first_name || trainer.first_name,
          last_name: resolvedProfile?.last_name || trainer.last_name,
          // Do not make a new account a trainer before it has completed its
          // invitation. The acceptance RPC performs that atomic transition.
          role: isNewAccount ? 'individual' : resolvedProfile?.role || 'individual',
          bda_role: isNewAccount ? 'individual' : resolvedProfile?.role || 'individual',
          created_from: 'portal',
        },
      },
    })

    const actionLink = linkData?.properties?.action_link
    if (linkError || !actionLink) {
      await admin.from('trainer_invite_tokens').update({ used_at: new Date().toISOString() }).eq('id', inviteRecord.id)
      throw linkError || new Error('Unable to generate a secure activation link')
    }

    // Check the required post-condition before email delivery. A new invite must
    // create both an Auth account and a portal profile; an existing account must
    // still resolve to the same email.
    const { data: postAuthResult, error: postAuthError } = await admin
      .rpc('get_auth_user_by_email', { p_email: normalizedEmail })
      .maybeSingle()
    const postAuth = postAuthResult as { id?: string } | null
    const { data: postProfile, error: postProfileError } = await admin
      .from('users')
      .select('id, email, role')
      .ilike('email', normalizedEmail)
      .maybeSingle()
    if (postAuthError || postProfileError || !postAuth?.id || !postProfile?.id || postAuth.id !== postProfile.id) {
      await admin.from('trainer_invite_tokens').update({ used_at: new Date().toISOString() }).eq('id', inviteRecord.id)
      throw new Error('Trainer account provisioning could not be verified before delivery')
    }
    if (isPartnerRole(postProfile.role)) {
      await admin.from('trainer_invite_tokens').update({ used_at: new Date().toISOString() }).eq('id', inviteRecord.id)
      return response({ error: 'A partner account cannot be converted into a trainer.', code: 'partner_email_cannot_be_trainer' }, 409)
    }

    try {
      const resendId = await sendTrainerInviteEmail(
        resendApiKey,
        normalizedEmail,
        trainer.first_name,
        actionLink,
        isNewAccount,
      )
      await admin.from('email_logs').insert({
        email_type: 'trainer_invitation',
        recipient_email: normalizedEmail,
        recipient_user_id: postProfile.id,
        subject: isNewAccount ? 'Set your password for BDA Instructor View' : 'Activate your BDA Instructor View account',
        status: 'sent',
        resend_id: resendId,
        template_data: {
          trainer_id: trainer.id,
          invitation_id: inviteRecord.id,
          account_state: isNewAccount ? 'new' : 'existing_individual',
        },
        sent_at: new Date().toISOString(),
      })
    } catch (emailError) {
      await admin.from('trainer_invite_tokens').update({ used_at: new Date().toISOString() }).eq('id', inviteRecord.id)
      throw emailError
    }

    const { error: statusError } = await admin
      .from('ecp_trainers')
      .update({ invite_status: 'invited', invited_at: new Date().toISOString() })
      .eq('id', trainer.id)
    if (statusError) throw statusError

    return response({
      success: true,
      account_state: isNewAccount ? 'new' : 'existing_individual',
      message: `Invitation sent to ${normalizedEmail}`,
    })
  } catch (error) {
    console.error('[send-trainer-invite]', error)
    return response({ error: error instanceof Error ? error.message : 'Unable to send trainer invitation' }, 500)
  }
})
