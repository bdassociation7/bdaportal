/**
 * BDA Portal - Send Voucher Transfer Email Edge Function
 *
 * Called after a successful voucher transfer to notify the recipient.
 * Handles two cases:
 *   1. Recipient has an existing BDA account → voucher_transferred_to_you
 *   2. Recipient has no account → voucher_transferred_invite
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

    const supabase = createClient(supabaseUrl, serviceKey)

    const { voucher_id, recipient_email, recipient_has_account, sender_user_id } = await req.json()

    if (!voucher_id || !recipient_email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch voucher details
    const { data: voucher, error: vErr } = await supabase
      .from('exam_vouchers')
      .select('code, certification_type, expires_at')
      .eq('id', voucher_id)
      .single()

    if (vErr || !voucher) throw new Error('Voucher not found')

    // Fetch sender name
    const { data: sender } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', sender_user_id)
      .single()

    const senderName = sender?.full_name || sender?.email || 'A BDA Member'

    // Format expiry date
    const expiresAt = voucher.expires_at
      ? new Date(voucher.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'No expiry'

    // Format certification type for brand consistency: CP → CP (template uses BDA-{{certification_type}}™)
    // The template already has BDA- prefix hardcoded, so we just pass CP or SCP
    const certType = voucher.certification_type // 'CP' or 'SCP'

    // Determine template and recipient name
    let templateKey: string
    let recipientName: string
    let templateData: Record<string, string>

    if (recipient_has_account) {
      // Fetch recipient name
      const { data: recipient } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', (await supabase.from('users').select('id').eq('email', recipient_email).single()).data?.id)
        .single()

      recipientName = recipient?.full_name || recipient_email.split('@')[0]
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

    // Fetch email template
    const { data: template, error: tErr } = await supabase
      .from('email_templates')
      .select('subject, html_body, text_body')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single()

    if (tErr || !template) throw new Error(`Template ${templateKey} not found`)

    // Render template
    function render(str: string, data: Record<string, string>): string {
      return str.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`)
    }

    const subject = render(template.subject, templateData)
    const htmlBody = render(template.html_body, templateData)
    const textBody = template.text_body ? render(template.text_body, templateData) : undefined

    // Send email via Resend
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

    // Log email in email_logs if table exists
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
