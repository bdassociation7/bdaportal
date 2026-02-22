// Supabase Edge Function: bulk-create-users
// Creates multiple users and sends welcome emails via our custom email system
// Uses createUser() + generateLink() + send-email Edge Function

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

interface BulkUploadItem {
  row_number: number
  email: string
  full_name: string
  phone?: string
  country_code: string
  language: string
  certification_track?: string
}

interface RequestBody {
  items: BulkUploadItem[]
  send_welcome_email?: boolean
  activate_content?: boolean
  user_role?: 'individual' | 'ecp' | 'pdp'
  resend_to_existing?: boolean  // If true, send email to users that already exist
}

Deno.serve(async (req) => {
  console.log('bulk-create-users: Request received', req.method)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
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

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify calling user is admin
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

    const { data: userData, error: userError } = await userClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || !['admin', 'super_admin'].includes(userData.role)) {
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Parse request body
    const body: RequestBody = await req.json()
    const { items, send_welcome_email = true, activate_content = false, user_role = 'individual', resend_to_existing = false } = body

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No items to process' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[bulk-create] Creating job with', items.length, 'items')

    // Create job for tracking
    const { data: job, error: jobError } = await adminClient
      .from('bulk_upload_jobs')
      .insert({
        created_by: user.id,
        status: 'processing',
        total_users: items.length,
        send_welcome_email,
        activate_content,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (jobError) {
      throw new Error(`Failed to create job: ${jobError.message}`)
    }

    const jobId = job.id

    // Create item records
    const itemRecords = items.map(item => ({
      job_id: jobId,
      row_number: item.row_number,
      email: item.email,
      full_name: item.full_name,
      phone: item.phone,
      country_code: item.country_code,
      language: item.language,
      certification_track: item.certification_track,
      status: 'pending',
    }))

    await adminClient.from('bulk_upload_items').insert(itemRecords)

    // Process each user with delay to avoid SMTP rate limiting
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0
    let emailSentCount = 0

    // Helper function to delay between operations
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    // Helper function to send welcome email via our email system
    const sendWelcomeEmail = async (
      email: string,
      userName: string,
      passwordResetLink: string,
      userId?: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'bulk_import_welcome',
            to: email,
            user_id: userId,
            data: {
              user_name: userName,
              password_reset_link: passwordResetLink,
            },
          }),
        })

        const result = await response.json()
        if (!response.ok || !result.success) {
          return { success: false, error: result.error || 'Email send failed' }
        }
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx]

      // Add delay between emails to avoid rate limiting (except first one)
      // Mailtrap sandbox is very strict - need 2.5+ seconds between emails
      if (idx > 0 && send_welcome_email) {
        await delay(2500) // 2.5 second delay between emails
      }

      try {
        // Update item to processing - creating user
        await adminClient
          .from('bulk_upload_items')
          .update({
            status: 'processing',
            email_status: send_welcome_email ? 'pending' : 'skipped'
          })
          .eq('job_id', jobId)
          .eq('email', item.email)

        // Split full name
        const nameParts = item.full_name.trim().split(/\s+/)
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ') || ''

        let userId: string

        // Always create user with createUser() - more control than inviteUserByEmail()
        console.log('[bulk-create] Creating user:', item.email, `(${idx + 1}/${items.length})`)

        const tempPassword = generateTempPassword()
        const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
          email: item.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            full_name: item.full_name,
            bda_role: user_role,
            source: 'bulk_upload',
          },
        })

        if (createError) {
          if (createError.message.includes('already been registered') ||
              createError.message.includes('already registered')) {
            console.log('[bulk-create] User already exists:', item.email)

            // If resend_to_existing is enabled, send email to existing user
            if (resend_to_existing && send_welcome_email) {
              console.log('[bulk-create] Resending email to existing user:', item.email)

              await adminClient
                .from('bulk_upload_items')
                .update({ status: 'processing', email_status: 'sending' })
                .eq('job_id', jobId)
                .eq('email', item.email)

              // Generate password reset link for existing user
              const isLocal = supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost') || supabaseUrl.includes('kong:')
              const siteUrl = isLocal
                ? 'http://localhost:8082'
                : (Deno.env.get('SITE_URL') || 'https://portal.bda-global.org')
              const redirectUrl = `${siteUrl}/auth/set-password`

              const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
                type: 'recovery',
                email: item.email,
                options: {
                  redirectTo: redirectUrl,
                },
              })

              if (linkError) {
                console.error('[bulk-create] Failed to generate reset link for existing user:', item.email, linkError.message)
                skippedCount++
                await adminClient
                  .from('bulk_upload_items')
                  .update({
                    status: 'skipped',
                    error_message: 'User exists - failed to generate reset link',
                    email_status: 'failed'
                  })
                  .eq('job_id', jobId)
                  .eq('email', item.email)
              } else {
                // Send email to existing user
                const emailResult = await sendWelcomeEmail(
                  item.email,
                  item.full_name,
                  linkData.properties.action_link
                )

                if (emailResult.success) {
                  emailSentCount++
                  successCount++ // Count as success since email was sent
                  await adminClient
                    .from('bulk_upload_items')
                    .update({
                      status: 'success',
                      error_message: 'User exists - email resent',
                      email_status: 'sent'
                    })
                    .eq('job_id', jobId)
                    .eq('email', item.email)
                  console.log('[bulk-create] Email resent to existing user:', item.email)
                } else {
                  skippedCount++
                  await adminClient
                    .from('bulk_upload_items')
                    .update({
                      status: 'skipped',
                      error_message: 'User exists - email failed: ' + emailResult.error,
                      email_status: 'failed'
                    })
                    .eq('job_id', jobId)
                    .eq('email', item.email)
                }
              }

              await adminClient
                .from('bulk_upload_jobs')
                .update({
                  processed_count: successCount + errorCount + skippedCount,
                  success_count: successCount,
                  error_count: errorCount,
                  skipped_count: skippedCount,
                  email_sent_count: emailSentCount,
                })
                .eq('id', jobId)

              // Small delay before next
              if (idx < items.length - 1) await delay(500)
              continue
            }

            // Default: just skip existing users
            skippedCount++
            await adminClient
              .from('bulk_upload_items')
              .update({
                status: 'skipped',
                error_message: 'User already exists',
                email_queued: false,
                email_status: 'skipped',
              })
              .eq('job_id', jobId)
              .eq('email', item.email)

            await adminClient
              .from('bulk_upload_jobs')
              .update({
                processed_count: successCount + errorCount + skippedCount,
                success_count: successCount,
                error_count: errorCount,
                skipped_count: skippedCount,
                email_sent_count: emailSentCount,
              })
              .eq('id', jobId)
            continue
          }
          throw createError
        }

        userId = createData.user.id

        // Send welcome email if requested
        if (send_welcome_email) {
          await adminClient
            .from('bulk_upload_items')
            .update({ email_status: 'sending' })
            .eq('job_id', jobId)
            .eq('email', item.email)

          // Generate password reset link
          const isLocal = supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost') || supabaseUrl.includes('kong:')
          const siteUrl = isLocal
            ? 'http://localhost:8082'
            : (Deno.env.get('SITE_URL') || 'https://portal.bda-global.org')
          const redirectUrl = `${siteUrl}/auth/set-password`

          const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
            type: 'recovery',
            email: item.email,
            options: {
              redirectTo: redirectUrl,
            },
          })

          if (linkError) {
            console.error('[bulk-create] Failed to generate reset link for:', item.email, linkError.message)
            await adminClient
              .from('bulk_upload_items')
              .update({ email_status: 'failed', error_message: 'Failed to generate password link' })
              .eq('job_id', jobId)
              .eq('email', item.email)
          } else {
            // Send welcome email via our email system
            const emailResult = await sendWelcomeEmail(
              item.email,
              item.full_name,
              linkData.properties.action_link,
              userId
            )

            if (emailResult.success) {
              emailSentCount++
              await adminClient
                .from('bulk_upload_items')
                .update({ email_status: 'sent' })
                .eq('job_id', jobId)
                .eq('email', item.email)
              console.log('[bulk-create] Welcome email sent for:', item.email, `(${emailSentCount} emails sent)`)
            } else {
              console.error('[bulk-create] Email failed for:', item.email, emailResult.error)
              await adminClient
                .from('bulk_upload_items')
                .update({ email_status: 'failed', error_message: emailResult.error })
                .eq('job_id', jobId)
                .eq('email', item.email)
            }
          }

          // Small delay between emails to avoid rate limiting
          if (idx < items.length - 1) {
            await delay(500)
          }
        }

        // Update user profile in public.users table
        await adminClient
          .from('users')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone: item.phone || null,
            country_code: item.country_code,
            preferred_language: item.language?.toLowerCase() || 'en',
            role: user_role,
            profile_completed: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        // Grant curriculum access if requested
        if (activate_content && item.certification_track) {
          const certType = item.certification_track === 'BDA-CP' ? 'cp' : 'scp'
          await adminClient
            .from('user_curriculum_access')
            .upsert({
              user_id: userId,
              certification_type: certType,
              granted_at: new Date().toISOString(),
              source: 'bulk_upload',
            })
        }

        // Update item as success
        await adminClient
          .from('bulk_upload_items')
          .update({
            status: 'success',
            created_user_id: userId,
            email_queued: send_welcome_email,
          })
          .eq('job_id', jobId)
          .eq('email', item.email)

        successCount++

        // Update job progress with email count
        await adminClient
          .from('bulk_upload_jobs')
          .update({
            processed_count: successCount + errorCount + skippedCount,
            success_count: successCount,
            error_count: errorCount,
            skipped_count: skippedCount,
            email_sent_count: emailSentCount,
          })
          .eq('id', jobId)

      } catch (error: any) {
        console.error('[bulk-create] Error for', item.email, ':', error.message)
        errorCount++

        await adminClient
          .from('bulk_upload_items')
          .update({
            status: 'error',
            error_message: error.message,
            email_status: 'failed',
          })
          .eq('job_id', jobId)
          .eq('email', item.email)

        await adminClient
          .from('bulk_upload_jobs')
          .update({
            processed_count: successCount + errorCount + skippedCount,
            success_count: successCount,
            error_count: errorCount,
            skipped_count: skippedCount,
            email_sent_count: emailSentCount,
          })
          .eq('id', jobId)
      }
    }

    // Mark job as completed
    await adminClient
      .from('bulk_upload_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_count: successCount + errorCount + skippedCount,
        success_count: successCount,
        error_count: errorCount,
        skipped_count: skippedCount,
        email_sent_count: emailSentCount,
      })
      .eq('id', jobId)

    console.log('[bulk-create] Job completed:', { successCount, errorCount, skippedCount, emailSentCount })

    return new Response(
      JSON.stringify({
        job_id: jobId,
        success_count: successCount,
        error_count: errorCount,
        skipped_count: skippedCount,
        message: send_welcome_email
          ? 'Users created. Welcome emails sent via BDA email system.'
          : 'Users created without welcome emails.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[bulk-create] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
