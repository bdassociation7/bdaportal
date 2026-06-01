/**
 * BDA Portal - Send Voucher Transfer Email Edge Function
 *
 * Called after a successful voucher transfer to notify the recipient.
 * Handles two cases:
 *   1. Recipient has an existing BDA account → voucher_transferred_to_you
 *   2. Recipient has no account → voucher_transferred_invite
 *
 * Security:
 *   - Requires valid JWT (verify_jwt = true in config.toml)
 *   - sender_user_id is extracted from the verified JWT, NOT from request body
 *   - Verifies that the sender actually owns the voucher before sending
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM_EMAIL = 'The Business Development Association (BDA®) <noreply@bda-global.org>'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // ─── 1. Authenticate the caller via JWT ───────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use the caller's JWT to identify them — never trust sender_user_id from body
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: callerUser }, error: authErr } = await callerClient.auth.getUser()
    if (authErr || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // sender_user_id comes from the verified JWT, not from request body
    const senderUserId = callerUser.id

    // ─── 2. Parse request body (sender_user_id is ignored even if provided) ──
    const { voucher_id, recipient_email, recipient_has_account } = await req.json()

    if (!voucher_id || !recipient_email) {
      return new Response(JSON.stringify({ error: 'Missing required fields: voucher_id, recipient_email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ─── 3. Admin client for DB operations ────────────────────────────────────
    const supabase = createClient(supabaseUrl, serviceKey)

    // ─── 4. Verify sender owns the voucher ────────────────────────────────────
    const { data: voucher, error: vErr } = await supabase
      .from('exam_vouchers')
      .select('id, code, certification_type, expires_at, user_id')
      .eq('id', voucher_id)
      .single()

    if (vErr || !voucher) {
      return new Response(JSON.stringify({ error: 'Voucher not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Ownership check: the caller must be the voucher owner
    if (voucher.user_id !== senderUserId) {
      console.warn(`Unauthorized voucher transfer attempt: user ${senderUserId} tried to transfer voucher ${voucher_id} owned by ${voucher.user_id}`)
      return new Response(JSON.stringify({ error: 'Forbidden: you do not own this voucher' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ─── 5. Fetch sender details from verified user id ────────────────────────
    const { data: sender } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', senderUserId)
      .single()

    const senderName = sender?.full_name || sender?.email || 'A BDA Member'

    // ─── 6. Format voucher data ───────────────────────────────────────────────
    const expiresAt = voucher.expires_at
      ? new Date(voucher.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'No expiry'

    const certType = voucher.certification_type // 'CP' or 'SCP'

    // ─── 7. Determine template and recipient name ─────────────────────────────
    let templateKey: string
    let recipientName: string
    let templateData: Record<string, string>

    if (recipient_has_account) {
      // Fetch recipient name by email
      const { data: recipientUser } = await supabase
        .from('users')
        .select('full_name')
        .eq('email', recipient_email.toLowerCase().trim())
        .single()

      recipientName = recipientUser?.full_name || recipient_email.split('@')[0]
      templateKey = 'voucher_transferred_to_you'
      templateData = {
        recipient_name: recipientName,
        sender_name: senderName,
        certification_type: certType,
        voucher_code: voucher.code,
        expires_at: expiresAt,
      }
    } else {
      templateKey = 'voucher_transferred_invite'
      templateData = {
        sender_name: senderName,
        certification_type: certType,
        voucher_code: voucher.code,
        expires_at: expiresAt,
      }
    }

    // ─── 8. Fetch email template ──────────────────────────────────────────────
    const { data: template, error: tErr } = await supabase
      .from('email_templates')
      .select('subject, html_body, text_body')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single()

    if (tErr || !template) throw new Error(`Template ${templateKey} not found`)

    // ─── 9. Render template ───────────────────────────────────────────────────
    function render(str: string, data: Record<string, string>): string {
      return str.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
    }

    const subject = render(template.subject, templateData)
    const htmlBody = render(template.html_body, templateData)
    const textBody = template.text_body ? render(template.text_body, templateData) : undefined

    // ─── 10. Send email via Resend ────────────────────────────────────────────
    const emailPayload: Record<string, unknown> = {
      from: FROM_EMAIL,
      to: [recipient_email],
      subject,
      html: htmlBody,
    }
    if (textBody) emailPayload.text = textBody

    const sendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    const sendResult = await sendResp.json()

    if (!sendResp.ok) {
      console.error('Resend error:', sendResult)
      throw new Error(`Email send failed: ${JSON.stringify(sendResult)}`)
    }

    // ─── 11. Log email ────────────────────────────────────────────────────────
    try {
      await supabase.from('email_logs').insert({
        template_key: templateKey,
        recipient_email,
        subject,
        status: 'sent',
        resend_id: sendResult.id,
      })
    } catch (_) { /* email_logs is optional */ }

    return new Response(JSON.stringify({ success: true, email_id: sendResult.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('send-voucher-transfer error:', err)
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
