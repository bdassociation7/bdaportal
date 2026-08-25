import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PORTAL_ORIGIN = 'https://portal.bda-global.org'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type InviteRequest = {
  trainer_id?: string
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

async function sendTrainerInviteEmail(
  resendApiKey: string,
  email: string,
  firstName: string,
  actionLink: string,
) {
  const safeName = escapeHtml(firstName || 'there')
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Business Development Association (BDA) <noreply@bda-global.org>',
      to: [email],
      subject: 'Activate your BDA Instructor View account',
      html: `
        <div style="margin:0;background:#f0f6ff;padding:32px 16px;font-family:Arial,sans-serif;color:#0d1f4e">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(13,31,78,.12)">
            <div style="padding:24px 32px;background:linear-gradient(135deg,#0d1f4e,#0f91e0);color:#ffffff">
              <div style="font-size:20px;font-weight:700">Business Development Association (BDA)</div>
            </div>
            <div style="padding:32px">
              <h1 style="margin:0 0 16px;font-size:24px;color:#0d1f4e">Your Instructor View is ready</h1>
              <p style="margin:0 0 16px;line-height:1.6">Hello ${safeName},</p>
              <p style="margin:0 0 16px;line-height:1.6">Your organisation has added you to its BDA trainer register. Use the secure button below to activate your account and open Instructor View in the BDA Learning System.</p>
              <p style="margin:0 0 28px"><a href="${actionLink}" style="display:inline-block;border-radius:8px;background:#0f91e0;color:#ffffff;padding:13px 22px;text-decoration:none;font-weight:700">Activate Instructor View</a></p>
              <p style="margin:0;color:#5f6f8f;font-size:13px;line-height:1.6">This activation link is single-use. If you were not expecting this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </div>`,
    }),
  })

  if (!result.ok) {
    throw new Error(`Invitation email delivery failed: ${await result.text()}`)
  }
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
      .select('id, email, first_name, last_name, partner_id, user_id')
      .eq('id', trainerId)
      .single()

    if (trainerError || !trainer) return response({ error: 'Trainer not found' }, 404)
    if (!['admin', 'super_admin'].includes(callerProfile.role) && trainer.partner_id !== caller.id) {
      return response({ error: 'This trainer does not belong to your organisation' }, 403)
    }
    if (trainer.user_id) {
      return response({ success: true, already_active: true, message: 'Trainer already has an active account' })
    }

    // Only the most recently sent invitation remains usable.
    await admin
      .from('trainer_invite_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('trainer_id', trainer.id)
      .is('used_at', null)

    const { data: inviteRecord, error: inviteError } = await admin
      .from('trainer_invite_tokens')
      .insert({ trainer_id: trainer.id, partner_id: trainer.partner_id, email: trainer.email })
      .select('id, token')
      .single()

    if (inviteError || !inviteRecord) throw inviteError || new Error('Unable to create invitation token')

    const redirectTo = `${PORTAL_ORIGIN}/instructor/accept-invite?token=${encodeURIComponent(inviteRecord.token)}`
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: trainer.email,
      options: {
        redirectTo,
        data: {
          first_name: trainer.first_name,
          last_name: trainer.last_name,
          role: 'trainer',
        },
      },
    })

    const actionLink = linkData?.properties?.action_link
    if (linkError || !actionLink) {
      await admin.from('trainer_invite_tokens').update({ used_at: new Date().toISOString() }).eq('id', inviteRecord.id)
      throw linkError || new Error('Unable to generate a secure activation link')
    }

    try {
      await sendTrainerInviteEmail(resendApiKey, trainer.email, trainer.first_name, actionLink)
    } catch (emailError) {
      await admin.from('trainer_invite_tokens').update({ used_at: new Date().toISOString() }).eq('id', inviteRecord.id)
      throw emailError
    }

    const { error: statusError } = await admin
      .from('ecp_trainers')
      .update({ invite_status: 'invited', invited_at: new Date().toISOString() })
      .eq('id', trainer.id)

    if (statusError) throw statusError

    return response({ success: true, message: `Invitation sent to ${trainer.email}` })
  } catch (error) {
    console.error('[send-trainer-invite]', error)
    return response({ error: error instanceof Error ? error.message : 'Unable to send trainer invitation' }, 500)
  }
})
