import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PORTAL_ORIGIN = 'https://portal.bda-global.org'
const WINDOW_MS = 60 * 60 * 1000
const EMAIL_MAX_ATTEMPTS = 5
const IP_MAX_ATTEMPTS = 20

const corsHeaders = {
  'Access-Control-Allow-Origin': PORTAL_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type RegistrationRequest = {
  action?: 'register' | 'resend'
  email?: string
  password?: string
  firstName?: string
  lastName?: string
}

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function normaliseEmail(value: string) {
  return value.trim().toLowerCase()
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
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

async function hashIdentifier(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function allowAttempt(
  admin: ReturnType<typeof createClient>,
  identifier: string,
  maximumAttempts: number,
) {
  const { data: existing, error } = await admin
    .from('signup_rate_limits')
    .select('first_attempt_at, attempt_count')
    .eq('identifier', identifier)
    .maybeSingle()

  if (error) throw error

  const now = new Date()
  if (!existing || now.getTime() - new Date(existing.first_attempt_at).getTime() >= WINDOW_MS) {
    const { error: upsertError } = await admin.from('signup_rate_limits').upsert({
      identifier,
      first_attempt_at: now.toISOString(),
      last_attempt_at: now.toISOString(),
      attempt_count: 1,
    })
    if (upsertError) throw upsertError
    return true
  }

  if (existing.attempt_count >= maximumAttempts) return false

  const { error: updateError } = await admin
    .from('signup_rate_limits')
    .update({
      attempt_count: existing.attempt_count + 1,
      last_attempt_at: now.toISOString(),
    })
    .eq('identifier', identifier)

  if (updateError) throw updateError
  return true
}

async function sendConfirmationEmail(
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
      subject: 'Confirm your BDA account',
      html: `
        <div style="margin:0;background:#f0f6ff;padding:32px 16px;font-family:Arial,sans-serif;color:#0d1f4e">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(13,31,78,.12)">
            <div style="padding:24px 32px;background:linear-gradient(135deg,#0d1f4e,#0f91e0);color:#ffffff">
              <div style="font-size:20px;font-weight:700">Business Development Association (BDA)</div>
            </div>
            <div style="padding:32px">
              <h1 style="margin:0 0 16px;font-size:24px;color:#0d1f4e">Confirm your email address</h1>
              <p style="margin:0 0 16px;line-height:1.6">Hello ${safeName},</p>
              <p style="margin:0 0 24px;line-height:1.6">Select the button below to confirm your email address and activate your BDA Portal account securely.</p>
              <p style="margin:0 0 28px"><a href="${actionLink}" style="display:inline-block;border-radius:8px;background:#0f91e0;color:#ffffff;padding:13px 22px;text-decoration:none;font-weight:700">Confirm and activate account</a></p>
              <p style="margin:0;color:#5f6f8f;font-size:13px;line-height:1.6">If you did not request this BDA account, you can safely ignore this email. This confirmation link is single-use.</p>
            </div>
          </div>
        </div>`,
    }),
  })

  if (!result.ok) {
    const body = await result.text()
    throw new Error(`Confirmation email delivery failed: ${body}`)
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405)

  const origin = request.headers.get('origin')
  if (origin && origin !== PORTAL_ORIGIN && origin !== 'http://localhost:5173') {
    return response({ error: 'Invalid origin' }, 403)
  }

  try {
    const body = await request.json() as RegistrationRequest
    const action = body.action || 'register'
    const email = normaliseEmail(body.email || '')
    const firstName = (body.firstName || '').trim()
    const lastName = (body.lastName || '').trim()
    const password = body.password || ''

    if (!validEmail(email)) return response({ error: 'Enter a valid email address.' }, 400)
    if (action === 'register') {
      if (!firstName || !lastName) return response({ error: 'Enter your first and last names.' }, 400)
      if (password.length < 8) return response({ error: 'Password must contain at least 8 characters.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) throw new Error('Registration service is not configured')

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const forwardedFor = request.headers.get('x-forwarded-for') || 'unknown'
    const ip = forwardedFor.split(',')[0].trim()
    const [emailHash, ipHash] = await Promise.all([hashIdentifier(email), hashIdentifier(ip)])
    const [emailAllowed, ipAllowed] = await Promise.all([
      allowAttempt(admin, `email:${emailHash}`, EMAIL_MAX_ATTEMPTS),
      allowAttempt(admin, `ip:${ipHash}`, IP_MAX_ATTEMPTS),
    ])

    if (!emailAllowed || !ipAllowed) {
      return response({ error: 'Too many confirmation requests. Please wait one hour before trying again.' }, 429)
    }

    if (action === 'resend') {
      const { data: profile, error: profileError } = await admin
        .from('users')
        .select('first_name')
        .eq('email', email)
        .maybeSingle()

      if (profileError) throw profileError
      if (!profile) {
        // Keep the response non-enumerating while providing the same safe next step.
        return response({ success: true, message: 'If an account is awaiting confirmation, a new link has been sent.' })
      }

      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${PORTAL_ORIGIN}/complete-profile` },
      })
      if (linkError || !linkData?.properties?.action_link) throw linkError || new Error('Unable to generate confirmation link')

      await sendConfirmationEmail(resendApiKey, email, profile.first_name || 'there', linkData.properties.action_link)
      return response({ success: true, message: 'A new confirmation link has been sent.' })
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo: `${PORTAL_ORIGIN}/complete-profile`,
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'individual',
          signup_type: 'portal-only',
          created_from: 'portal',
        },
      },
    })

    if (linkError) {
      if (linkError.message.toLowerCase().includes('already registered')) {
        return response({ code: 'ACCOUNT_EXISTS', error: 'An account already exists with this email address. Please sign in or request a new confirmation link.' }, 409)
      }
      throw linkError
    }

    if (!linkData?.properties?.action_link) throw new Error('Unable to generate confirmation link')
    await sendConfirmationEmail(resendApiKey, email, firstName, linkData.properties.action_link)

    return response({
      success: true,
      message: 'Your account has been created. Check your email to confirm and activate it.',
    })
  } catch (error) {
    console.error('Individual registration failed:', error)
    return response({ error: 'Unable to create your account at the moment. Please try again shortly.' }, 500)
  }
})
