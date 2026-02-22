// Supabase Edge Function: send-emails
// Processes email queue and sends via Resend/SMTP API/Mailtrap
// Can be called manually or via scheduled trigger

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  welcomeEmailHtml,
  welcomeEmailText,
  examReminderHtml,
  examReminderText,
  examBookingHtml,
  examBookingText,
  partnerApprovedHtml,
  partnerApprovedText,
  certificationIssuedHtml,
  certificationIssuedText,
  voucherCreatedHtml,
  voucherCreatedText,
} from '../_shared/email-templates.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

// Configuration
const BATCH_SIZE = 10
const FROM_EMAIL = 'noreply@bda-global.org'
const FROM_NAME = 'The Business Development Association (BDA®)'

interface EmailQueueItem {
  id: string
  recipient_email: string
  recipient_name?: string
  subject: string
  template_name: string
  template_data: Record<string, any>
  status: string
  attempts: number
  max_attempts: number
}

// Send email via Resend API
async function sendViaResend(
  apiKey: string,
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject: subject,
        html: htmlBody,
        text: textBody,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || 'Resend API error' }
    }

    return { success: true, messageId: data.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Send email via generic SMTP API (Mailgun, SendGrid, etc.)
async function sendViaSMTPAPI(
  config: { apiKey: string; domain: string; provider: string },
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  // SendGrid
  if (config.provider === 'sendgrid') {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: FROM_EMAIL, name: FROM_NAME },
          subject: subject,
          content: [
            { type: 'text/plain', value: textBody },
            { type: 'text/html', value: htmlBody },
          ],
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        return { success: false, error: text }
      }

      return { success: true, messageId: response.headers.get('x-message-id') || 'sent' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Mailgun
  if (config.provider === 'mailgun') {
    try {
      const formData = new FormData()
      formData.append('from', `${FROM_NAME} <${FROM_EMAIL}>`)
      formData.append('to', to)
      formData.append('subject', subject)
      formData.append('text', textBody)
      formData.append('html', htmlBody)

      const response = await fetch(
        `https://api.mailgun.net/v3/${config.domain}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${config.apiKey}`)}`,
          },
          body: formData,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.message || 'Mailgun API error' }
      }

      return { success: true, messageId: data.id }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  return { success: false, error: `Unknown provider: ${config.provider}` }
}

// Send email via Mailtrap HTTP API (for sandbox and sending)
// Uses Mailtrap's Sending API: https://api.mailtrap.io
// Get API token from: https://mailtrap.io/sending/domains
async function sendViaMailtrap(
  config: { apiToken: string; inboxId?: string },
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // Use Mailtrap Sending API
    const response = await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: to }],
        subject: subject,
        html: htmlBody,
        text: textBody,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[send-emails] Mailtrap API error:', data)
      return { success: false, error: data.errors?.[0] || data.message || 'Mailtrap API error' }
    }

    return { success: true, messageId: data.message_ids?.[0] || 'sent' }
  } catch (error: any) {
    console.error('[send-emails] Mailtrap error:', error)
    return { success: false, error: error.message }
  }
}

serve(async (req) => {
  console.log('[send-emails] Request received:', req.method)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    // Email provider configuration
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY')
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN')

    // Mailtrap API configuration (HTTP API, not SMTP - works in Edge Functions)
    // Get API token from: https://mailtrap.io/sending/domains
    const mailtrapApiToken = Deno.env.get('MAILTRAP_API_TOKEN')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine email provider (priority: Mailtrap for testing, then production providers)
    let emailProvider: string | null = null
    if (mailtrapApiToken) emailProvider = 'mailtrap'
    else if (resendApiKey) emailProvider = 'resend'
    else if (sendgridApiKey) emailProvider = 'sendgrid'
    else if (mailgunApiKey && mailgunDomain) emailProvider = 'mailgun'

    if (!emailProvider) {
      console.log('[send-emails] No email provider configured, emails will be marked as sent (dry run)')
    } else {
      console.log(`[send-emails] Using email provider: ${emailProvider}`)
    }

    // Create admin client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Parse request body for options
    let limit = BATCH_SIZE
    let dryRun = !emailProvider

    try {
      const body = await req.json()
      if (body.limit) limit = Math.min(body.limit, 50)
      if (body.dry_run !== undefined) dryRun = body.dry_run
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Fetch pending emails
    const { data: emails, error: fetchError } = await adminClient
      .from('email_queue')
      .select('*')
      .in('status', ['pending', 'retrying'])
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('scheduled_for', { ascending: true })
      .limit(limit)

    if (fetchError) {
      console.error('[send-emails] Fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emails', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending emails', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[send-emails] Processing ${emails.length} emails via ${emailProvider || 'dry-run'}`)

    let succeeded = 0
    let failed = 0
    const results: { email: string; status: string; error?: string }[] = []

    for (const emailItem of emails as EmailQueueItem[]) {
      try {
        // Get email content
        let subject = emailItem.subject
        let htmlBody = ''
        let textBody = ''

        // Check for embedded template first
        if (emailItem.template_data?.html_body && emailItem.template_data?.text_body) {
          htmlBody = emailItem.template_data.html_body
          textBody = emailItem.template_data.text_body
        } else {
          // Generate from template based on template_name
          const data = emailItem.template_data || {}
          const portalUrl = Deno.env.get('PORTAL_URL') || 'https://portal.bda-global.org'

          switch (emailItem.template_name) {
            case 'welcome':
              htmlBody = welcomeEmailHtml({
                firstName: data.firstName || data.candidate_name || 'User',
                email: emailItem.recipient_email,
                loginUrl: data.loginUrl || `${portalUrl}/login`,
                setPasswordUrl: data.setPasswordUrl,
              })
              textBody = welcomeEmailText({
                firstName: data.firstName || data.candidate_name || 'User',
                email: emailItem.recipient_email,
                loginUrl: data.loginUrl || `${portalUrl}/login`,
                setPasswordUrl: data.setPasswordUrl,
              })
              if (!subject) subject = `Welcome to BDA Association, ${data.firstName || 'User'}!`
              break

            case 'exam_reminder_48h':
            case 'exam_reminder_24h':
            case 'exam_reminder':
              const hoursUntil = emailItem.template_name === 'exam_reminder_24h' ? 24 : 48
              htmlBody = examReminderHtml({
                firstName: data.candidate_name?.split(' ')[0] || data.firstName || 'Candidate',
                examTitle: data.exam_title || 'BDA Certification Exam',
                examDate: data.exam_date || 'TBD',
                examTime: data.exam_time || 'TBD',
                timezone: data.timezone || 'UTC',
                confirmationCode: data.confirmation_code || 'N/A',
                duration: data.duration || '3 hours',
                dashboardUrl: data.dashboard_url || `${portalUrl}/individual/dashboard`,
                hoursUntilExam: hoursUntil as 24 | 48,
              })
              textBody = examReminderText({
                firstName: data.candidate_name?.split(' ')[0] || data.firstName || 'Candidate',
                examTitle: data.exam_title || 'BDA Certification Exam',
                examDate: data.exam_date || 'TBD',
                examTime: data.exam_time || 'TBD',
                timezone: data.timezone || 'UTC',
                confirmationCode: data.confirmation_code || 'N/A',
                duration: data.duration || '3 hours',
                dashboardUrl: data.dashboard_url || `${portalUrl}/individual/dashboard`,
                hoursUntilExam: hoursUntil as 24 | 48,
              })
              if (!subject) {
                const urgency = hoursUntil === 24 ? '⚠️ Tomorrow' : 'Reminder'
                subject = `${urgency}: Your ${data.exam_title || 'BDA'} Exam`
              }
              break

            case 'exam_booking':
            case 'booking_confirmation':
              htmlBody = examBookingHtml({
                firstName: data.candidate_name?.split(' ')[0] || data.firstName || 'Candidate',
                examTitle: data.exam_title || 'BDA Certification Exam',
                examDate: data.exam_date || 'TBD',
                examTime: data.exam_time || 'TBD',
                timezone: data.timezone || 'UTC',
                duration: data.duration || '3 hours',
                confirmationCode: data.confirmation_code || 'N/A',
                dashboardUrl: data.dashboard_url || `${portalUrl}/individual/dashboard`,
              })
              textBody = examBookingText({
                firstName: data.candidate_name?.split(' ')[0] || data.firstName || 'Candidate',
                examTitle: data.exam_title || 'BDA Certification Exam',
                examDate: data.exam_date || 'TBD',
                examTime: data.exam_time || 'TBD',
                timezone: data.timezone || 'UTC',
                duration: data.duration || '3 hours',
                confirmationCode: data.confirmation_code || 'N/A',
                dashboardUrl: data.dashboard_url || `${portalUrl}/individual/dashboard`,
              })
              if (!subject) subject = `Exam Booking Confirmed: ${data.confirmation_code || 'N/A'}`
              break

            case 'partner_approved':
              htmlBody = partnerApprovedHtml({
                firstName: data.firstName || 'Partner',
                organizationName: data.organizationName || emailItem.recipient_name || 'Organization',
                partnerType: data.partnerType || 'ECP',
                partnerNumber: data.partnerNumber || 'N/A',
                dashboardUrl: data.dashboardUrl || `${portalUrl}/${(data.partnerType || 'ecp').toLowerCase()}/dashboard`,
              })
              textBody = partnerApprovedText({
                firstName: data.firstName || 'Partner',
                organizationName: data.organizationName || emailItem.recipient_name || 'Organization',
                partnerType: data.partnerType || 'ECP',
                partnerNumber: data.partnerNumber || 'N/A',
                dashboardUrl: data.dashboardUrl || `${portalUrl}/${(data.partnerType || 'ecp').toLowerCase()}/dashboard`,
              })
              if (!subject) subject = `✓ Partner Application Approved`
              break

            case 'certification_issued':
              htmlBody = certificationIssuedHtml({
                firstName: data.firstName || 'Candidate',
                lastName: data.lastName || '',
                certificationName: data.certificationName || 'BDA Certification',
                certificationLevel: data.certificationLevel || 'Professional',
                issueDate: data.issueDate || new Date().toLocaleDateString(),
                expirationDate: data.expirationDate,
                certificateNumber: data.certificateNumber || 'N/A',
                verificationUrl: data.verificationUrl || `${portalUrl}/verify`,
                downloadUrl: data.downloadUrl || `${portalUrl}/individual/certifications`,
              })
              textBody = certificationIssuedText({
                firstName: data.firstName || 'Candidate',
                lastName: data.lastName || '',
                certificationName: data.certificationName || 'BDA Certification',
                certificationLevel: data.certificationLevel || 'Professional',
                issueDate: data.issueDate || new Date().toLocaleDateString(),
                expirationDate: data.expirationDate,
                certificateNumber: data.certificateNumber || 'N/A',
                verificationUrl: data.verificationUrl || `${portalUrl}/verify`,
                downloadUrl: data.downloadUrl || `${portalUrl}/individual/certifications`,
              })
              if (!subject) subject = `🎉 Your ${data.certificationName || 'BDA'} Certificate is Ready`
              break

            case 'voucher_created':
              htmlBody = voucherCreatedHtml({
                partnerName: data.partnerName || emailItem.recipient_name || 'Partner',
                voucherCode: data.voucherCode || 'N/A',
                examType: data.examType || 'BDA Certification Exam',
                candidateEmail: data.candidateEmail,
                candidateName: data.candidateName,
                validUntil: data.validUntil || 'N/A',
                bookingUrl: data.bookingUrl || `${portalUrl}/exam-booking`,
                partnerDashboardUrl: data.partnerDashboardUrl || `${portalUrl}/ecp/dashboard`,
              })
              textBody = voucherCreatedText({
                partnerName: data.partnerName || emailItem.recipient_name || 'Partner',
                voucherCode: data.voucherCode || 'N/A',
                examType: data.examType || 'BDA Certification Exam',
                candidateEmail: data.candidateEmail,
                candidateName: data.candidateName,
                validUntil: data.validUntil || 'N/A',
                bookingUrl: data.bookingUrl || `${portalUrl}/exam-booking`,
                partnerDashboardUrl: data.partnerDashboardUrl || `${portalUrl}/ecp/dashboard`,
              })
              if (!subject) subject = `New Exam Voucher Created: ${data.voucherCode || 'N/A'}`
              break

            default:
              console.warn(`[send-emails] Unknown template: ${emailItem.template_name}`)
              throw new Error(`Template not found: ${emailItem.template_name}`)
          }
        }

        let sendResult = { success: false, error: 'No provider', messageId: '' }

        if (dryRun) {
          // Dry run - just mark as sent
          console.log(`[send-emails] DRY RUN: Would send to ${emailItem.recipient_email}`)
          sendResult = { success: true, messageId: 'dry-run' }
        } else if (emailProvider === 'resend') {
          sendResult = await sendViaResend(
            resendApiKey!,
            emailItem.recipient_email,
            subject,
            htmlBody,
            textBody
          )
        } else if (emailProvider === 'sendgrid') {
          sendResult = await sendViaSMTPAPI(
            { apiKey: sendgridApiKey!, domain: '', provider: 'sendgrid' },
            emailItem.recipient_email,
            subject,
            htmlBody,
            textBody
          )
        } else if (emailProvider === 'mailgun') {
          sendResult = await sendViaSMTPAPI(
            { apiKey: mailgunApiKey!, domain: mailgunDomain!, provider: 'mailgun' },
            emailItem.recipient_email,
            subject,
            htmlBody,
            textBody
          )
        } else if (emailProvider === 'mailtrap') {
          sendResult = await sendViaMailtrap(
            { apiToken: mailtrapApiToken! },
            emailItem.recipient_email,
            subject,
            htmlBody,
            textBody
          )
        }

        if (sendResult.success) {
          // Update as sent
          await adminClient
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              last_attempt_at: new Date().toISOString(),
              attempts: emailItem.attempts + 1,
            })
            .eq('id', emailItem.id)

          succeeded++
          results.push({ email: emailItem.recipient_email, status: 'sent' })
          console.log(`[send-emails] ✅ Sent to ${emailItem.recipient_email}`)
        } else {
          throw new Error(sendResult.error)
        }

      } catch (error: any) {
        // Update as failed/retrying
        const newAttempts = emailItem.attempts + 1
        const newStatus = newAttempts >= emailItem.max_attempts ? 'failed' : 'retrying'

        await adminClient
          .from('email_queue')
          .update({
            status: newStatus,
            error_message: error.message,
            last_attempt_at: new Date().toISOString(),
            attempts: newAttempts,
          })
          .eq('id', emailItem.id)

        failed++
        results.push({ email: emailItem.recipient_email, status: newStatus, error: error.message })
        console.error(`[send-emails] ❌ Failed for ${emailItem.recipient_email}:`, error.message)
      }
    }

    return new Response(
      JSON.stringify({
        processed: emails.length,
        succeeded,
        failed,
        provider: emailProvider || 'dry-run',
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[send-emails] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
