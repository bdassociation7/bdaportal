/**
 * WooCommerce Webhook Handler - Supabase Edge Function
 *
 * Handles order completion webhooks from WooCommerce:
 * - Creates Supabase Auth user if not exists
 * - Creates users table record
 * - Activates memberships
 * - Grants learning system access
 * - Activates partnerships (PDP/ECP)
 * - Creates exam vouchers
 * - Sends welcome email with password reset for new users
 *
 * RELIABILITY FEATURES:
 * 1. Idempotency: All operations check for existing records before creating
 * 2. Failed order logging: Any failure is saved to failed_webhook_orders for retry
 * 3. Retry endpoint: POST /woocommerce-webhook/retry?order_id=XXXX re-processes failed orders
 * 4. listUsers() replaced with direct DB lookup to avoid pagination issues
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import {
  welcomeEmailHtml,
  welcomeEmailText,
  queueEmailWithTemplate,
  partnerApprovedHtml,
  partnerApprovedText,
} from '../_shared/email-templates.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wc-webhook-signature',
}

interface WooCommerceOrderWebhook {
  id: number;
  order_key: string;
  status: string;
  date_created: string;
  billing: {
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    country?: string;
  };
  line_items: Array<{
    product_id: number;
    name: string;
    quantity: number;
  }>;
}

// Save a failed order payload for later retry
async function saveFailedOrder(
  supabase: any,
  order: WooCommerceOrderWebhook,
  reason: string
): Promise<void> {
  try {
    // Upsert: if already exists, increment retry_count
    const { data: existing } = await supabase
      .from('failed_webhook_orders')
      .select('id, retry_count')
      .eq('woocommerce_order_id', order.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      await supabase
        .from('failed_webhook_orders')
        .update({
          failure_reason: reason,
          retry_count: (existing.retry_count || 0) + 1,
          last_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('failed_webhook_orders').insert({
        woocommerce_order_id: order.id,
        order_payload: order,
        failure_reason: reason,
        status: 'pending',
      })
    }
    console.log(`Saved failed order #${order.id} for retry: ${reason}`)
  } catch (err: any) {
    console.error('Failed to save failed order:', err.message)
  }
}

// Mark a failed order as resolved
async function markOrderResolved(supabase: any, orderId: number): Promise<void> {
  try {
    await supabase
      .from('failed_webhook_orders')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: 'auto_retry',
        updated_at: new Date().toISOString(),
      })
      .eq('woocommerce_order_id', orderId)
      .eq('status', 'pending')
  } catch (err: any) {
    console.error('Failed to mark order resolved:', err.message)
  }
}

// Provision the individual portal account once per valid store order, before
// entitlement processing. A purchase must never be denied a portal account
// merely because its product mapping is awaiting configuration.
async function ensurePortalUser(
  supabase: any,
  order: WooCommerceOrderWebhook,
  email: string
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase()

  const { data: existingUser, error: existingUserError } = await supabase
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingUserError) {
    throw new Error(`Unable to look up portal account: ${existingUserError.message}`)
  }

  if (existingUser?.id) {
    return existingUser.id
  }

  let userId: string | null = null
  try {
    const { data: authUser } = await supabase
      .rpc('get_auth_user_by_email', { p_email: normalizedEmail })
      .maybeSingle()
    userId = authUser?.id || null
  } catch (_lookupError) {
    // A missing lookup RPC must not be treated as proof that Auth has no user.
    // createUser below handles the duplicate-user race and recovers safely.
  }

  let createdAuthUser = false
  if (!userId) {
    const temporaryPassword = crypto.randomUUID() + crypto.randomUUID()
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        first_name: order.billing.first_name || '',
        last_name: order.billing.last_name || '',
        created_from: 'woocommerce_webhook',
      },
    })

    if (authError) {
      const duplicateAuthUser =
        authError.status === 422 ||
        authError.message?.toLowerCase().includes('already been registered') ||
        authError.message?.toLowerCase().includes('already registered')

      if (!duplicateAuthUser) {
        throw new Error(`Unable to create portal authentication account: ${authError.message}`)
      }

      const { data: recoveredAuthUser, error: recoveryError } = await supabase
        .rpc('get_auth_user_by_email', { p_email: normalizedEmail })
        .maybeSingle()

      if (recoveryError || !recoveredAuthUser?.id) {
        throw new Error(`Unable to recover existing portal account: ${recoveryError?.message || authError.message}`)
      }

      userId = recoveredAuthUser.id
    } else {
      userId = authData.user.id
      createdAuthUser = true
      console.log(`Created portal account for store order #${order.id}: ${userId}`)
    }
  }

  const { error: profileError } = await supabase.from('users').upsert({
    id: userId,
    email: normalizedEmail,
    first_name: order.billing.first_name || '',
    last_name: order.billing.last_name || '',
    phone: order.billing.phone || null,
    country_code: order.billing.country || null,
    role: 'individual',
    is_active: true,
    profile_completed: false,
    created_from: 'store',
  }, { onConflict: 'id', ignoreDuplicates: true })

  if (profileError) {
    throw new Error(`Unable to create portal profile: ${profileError.message}`)
  }

  if (createdAuthUser) {
    const portalUrl = Deno.env.get('PORTAL_URL') || 'https://portal.bda-global.org'
    let setPasswordUrl: string | undefined

    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: { redirectTo: `${portalUrl}/auth/set-password` },
      })
      if (!linkError && linkData?.properties?.action_link) {
        setPasswordUrl = linkData.properties.action_link
      }
    } catch (linkError: any) {
      console.warn(`Could not create set-password link for ${normalizedEmail}: ${linkError.message}`)
    }

    if (!setPasswordUrl) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${portalUrl}/auth/set-password`,
      })
      if (resetError) {
        throw new Error(`Portal account created but password setup email failed: ${resetError.message}`)
      }
    }

    const welcomeData = {
      firstName: order.billing.first_name || 'User',
      email: normalizedEmail,
      loginUrl: `${portalUrl}/login`,
      setPasswordUrl: setPasswordUrl || `${portalUrl}/auth/forgot-password`,
    }

    await queueEmailWithTemplate({
      supabase,
      recipientEmail: normalizedEmail,
      recipientName: order.billing.first_name,
      templateName: 'welcome',
      subject: `Welcome to BDA Portal — Set Your Password, ${welcomeData.firstName}!`,
      htmlBody: welcomeEmailHtml(welcomeData),
      textBody: welcomeEmailText(welcomeData),
      priority: 1,
      relatedEntityType: 'woocommerce_order',
      relatedEntityId: order.id.toString(),
    })
  }

  if (!userId) {
    throw new Error('Portal account provisioning completed without a user ID')
  }

  return userId
}

// Core order processing logic — used by both webhook and retry endpoint
async function processOrder(supabase: any, order: WooCommerceOrderWebhook): Promise<{ success: boolean; error?: string }> {
  const email = order.billing?.email?.toLowerCase()
  if (!email) {
    return { success: false, error: 'No email in order' }
  }

  // Read every entitlement map before evaluating order line items.
  const [membershipMappings, learningProducts, partnershipProducts, certificationProducts, mockExamProducts, bookProductsResult] = await Promise.all([
    supabase.from('membership_product_mapping').select('*').eq('is_active', true),
    supabase.from('learning_system_products').select('*').eq('is_active', true),
    supabase.from('partnership_product_mapping').select('*').eq('is_active', true),
    supabase.from('certification_products').select('*').eq('is_active', true),
    supabase.from('mock_exam_products').select('*').eq('is_active', true),
    supabase.from('book_products').select('*').eq('is_active', true),
  ])

  const mappingError =
    membershipMappings.error ||
    learningProducts.error ||
    partnershipProducts.error ||
    certificationProducts.error ||
    mockExamProducts.error ||
    bookProductsResult.error
  if (mappingError) {
    return { success: false, error: `Unable to load product mappings: ${mappingError.message}` }
  }

  const membershipMap = new Map<string, any>(
    (membershipMappings.data || []).map((p: any) => [p.woocommerce_product_id.toString(), p])
  )
  const learningMap = new Map<string, any>(
    (learningProducts.data || []).map((p: any) => [p.woocommerce_product_id.toString(), p])
  )
  const partnershipMap = new Map<string, any>(
    (partnershipProducts.data || []).map((p: any) => [p.woocommerce_product_id.toString(), p])
  )
  const certificationMap = new Map<string, any>(
    (certificationProducts.data || []).map((p: any) => [p.woocommerce_product_id.toString(), p])
  )
  const mockExamMap = new Map<string, any>(
    (mockExamProducts.data || []).map((p: any) => [p.woocommerce_product_id.toString(), p])
  )
  const bookProductsMap = new Map<string, any>(
    (bookProductsResult.data || []).map((p: any) => [p.woocommerce_product_id.toString(), p])
  )
  const categoryToGroupMap: Record<string, string> = {
    'bock': 'bda-bock',
    'glossary': 'glossary',
    'study-guide': 'study-guide',
  }

  const userId = await ensurePortalUser(supabase, order, email)
  let anyProductMatched = false

  // Process each line item
  for (const item of order.line_items) {
    const membershipProduct = membershipMap.get(item.product_id.toString())
    const learningProduct = learningMap.get(item.product_id.toString())
    const partnershipProduct = partnershipMap.get(item.product_id.toString())
    const certificationProduct = certificationMap.get(item.product_id.toString())
    const mockExamProduct = mockExamMap.get(item.product_id.toString())
    const bookProduct = bookProductsMap.get(item.product_id.toString())

    // Unmapped products still create the Individual account, but are recorded
    // for operational review instead of being silently ignored.
    if (!membershipProduct && !learningProduct && !partnershipProduct && !certificationProduct && !mockExamProduct && !bookProduct) {
      console.warn(`Order #${order.id}: product ${item.product_id} has no entitlement mapping`)
      continue
    }

    anyProductMatched = true

    // Process membership activation
    if (membershipProduct) {
      console.log(`Processing membership: ${membershipProduct.membership_type} for ${email}`)
      try {
        const { data: membershipId, error: activationError } = await supabase.rpc(
          'activate_membership',
          {
            p_user_id: userId,
            p_membership_type: membershipProduct.membership_type,
            p_duration_months: membershipProduct.duration_months || 12,
            p_woocommerce_order_id: order.id.toString(),
            p_woocommerce_product_id: item.product_id.toString(),
          }
        )
        if (activationError) {
          console.error('Error activating membership:', activationError)
          return { success: false, error: `Unable to activate membership: ${activationError.message}` }
        } else {
          console.log(`Activated ${membershipProduct.membership_type} membership, ID: ${membershipId}`)
          await supabase.from('membership_activation_logs').insert({
            user_id: userId,
            membership_id: membershipId,
            action: 'activated',
            triggered_by: 'webhook',
            woocommerce_order_id: order.id,
            notes: `Product: ${item.name} (ID: ${item.product_id})`,
          })
        }
      } catch (error: any) {
        console.error('Membership activation error:', error)
        return { success: false, error: `Membership activation failed: ${error.message || 'Unknown error'}` }
      }
    }

    // Process learning system access
    if (learningProduct) {
      console.log(`Processing learning system: ${learningProduct.language} for ${email}`)
      try {
        const { error: accessError } = await supabase.rpc('grant_learning_system_access', {
          p_user_id: userId,
          p_language: learningProduct.language,
          p_woocommerce_order_id: order.id,
          p_woocommerce_product_id: item.product_id,
          p_purchased_at: order.date_created,
          p_validity_months: learningProduct.validity_months,
          p_includes_question_bank: learningProduct.includes_question_bank,
          p_includes_flashcards: learningProduct.includes_flashcards,
        })
        if (accessError) {
          console.error('Error granting learning access:', accessError)
          return { success: false, error: `Unable to grant Learning System access: ${accessError.message}` }
        } else {
          console.log(`Granted learning system access (${learningProduct.language})`)
        }
      } catch (error: any) {
        console.error('Learning system error:', error)
        return { success: false, error: `Learning System activation failed: ${error.message || 'Unknown error'}` }
      }
    }

    // Process partnership activation
    if (partnershipProduct) {
      console.log(`Processing partnership: ${partnershipProduct.partnership_type} for ${email}`)
      try {
        const { data: licenseId, error: partnershipError } = await supabase.rpc(
          'activate_partnership',
          {
            p_user_id: userId,
            p_partnership_type: partnershipProduct.partnership_type,
            p_woocommerce_order_id: order.id,
            p_woocommerce_product_id: item.product_id,
            p_duration_months: partnershipProduct.license_duration_months || 12,
            p_max_programs: partnershipProduct.max_programs || 5,
            p_tier: partnershipProduct.tier || 'standard',
            p_notes: `Product: ${item.name} (ID: ${item.product_id})`,
          }
        )
        if (partnershipError) {
          console.error('Error activating partnership:', partnershipError)
          return { success: false, error: `Unable to activate partnership: ${partnershipError.message}` }
        } else {
          console.log(`Activated ${partnershipProduct.partnership_type} partnership, license: ${licenseId}`)
          const portalUrl = Deno.env.get('PORTAL_URL') || 'https://portal.bda-global.org'
          const { data: updatedUser } = await supabase.from('users').select('role').eq('id', userId).single()
          const isDualPartner = updatedUser?.role === 'dual_partner'
          const partnerType = partnershipProduct.partnership_type.toUpperCase() as 'ECP' | 'PDP'
          const dashboardPath = isDualPartner ? '/workspace' : (partnerType === 'ECP' ? '/ecp/dashboard' : '/pdp/dashboard')
          const partnerData = {
            firstName: order.billing.first_name || 'Partner',
            organizationName: order.billing.first_name && order.billing.last_name
              ? `${order.billing.first_name} ${order.billing.last_name}`
              : email,
            partnerType: partnerType,
            partnerNumber: licenseId?.toString() || 'N/A',
            dashboardUrl: `${portalUrl}${dashboardPath}`,
          }
          await queueEmailWithTemplate({
            supabase,
            recipientEmail: email,
            recipientName: order.billing.first_name,
            templateName: 'partner_approved',
            subject: `Your BDA ${partnerType} Partnership Has Been Activated`,
            htmlBody: partnerApprovedHtml(partnerData),
            textBody: partnerApprovedText(partnerData),
            priority: 1,
            relatedEntityType: 'woocommerce_order',
            relatedEntityId: order.id.toString(),
          })
        }
      } catch (error: any) {
        console.error('Partnership activation error:', error)
        return { success: false, error: `Partnership activation failed: ${error.message || 'Unknown error'}` }
      }
    }

    // Process exam voucher creation
    if (certificationProduct) {
      console.log(`Processing certification: ${certificationProduct.certification_type} (${certificationProduct.exam_language || 'en'}) for ${email}`)
      try {
        const { data: voucherResults, error: voucherError } = await supabase.rpc(
          'create_exam_voucher_from_purchase',
          {
            p_user_id: userId,
            p_certification_product_id: certificationProduct.id,
            p_woocommerce_order_id: order.id,
            p_woocommerce_product_id: item.product_id,
            p_quantity: item.quantity || 1,
          }
        )
        if (voucherError) {
          console.error('Error creating exam voucher:', voucherError)
          await logVoucherError(supabase, userId, order.id, item.product_id, certificationProduct.id, voucherError.message)
          return { success: false, error: `Unable to create exam voucher: ${voucherError.message}` }
        } else {
          const results = voucherResults || []
          const successCount = results.filter((r: any) => r.success).length
          if (successCount > 0) {
            console.log(`Created ${successCount} exam voucher(s) for ${email} (${certificationProduct.certification_type})`)
            for (const result of results.filter((r: any) => r.success && r.voucher_id)) {
              await supabase.from('voucher_activation_logs').insert({
                user_id: userId,
                voucher_id: result.voucher_id,
                action: 'created',
                triggered_by: 'webhook',
                woocommerce_order_id: order.id,
                woocommerce_product_id: item.product_id,
                certification_product_id: certificationProduct.id,
                notes: `Voucher ${result.voucher_code} created from order #${order.id}`,
              })
            }
          }
          for (const failedResult of results.filter((r: any) => !r.success)) {
            if (failedResult.error_message && !failedResult.error_message.includes('already exist')) {
              await logVoucherError(supabase, userId, order.id, item.product_id, certificationProduct.id, failedResult.error_message)
              return { success: false, error: `Exam voucher creation failed: ${failedResult.error_message}` }
            }
          }
        }
      } catch (error: any) {
        console.error('Certification voucher creation error:', error)
        await logVoucherError(supabase, userId, order.id, item.product_id, certificationProduct.id, error.message || 'Unknown error')
        return { success: false, error: `Exam voucher creation failed: ${error.message || 'Unknown error'}` }
      }
    }

    // Process Mock Exams entitlement. grant_mock_exam_access is idempotent by
    // user, order, and product, so a WooCommerce retry cannot duplicate access.
    if (mockExamProduct) {
      console.log(`Processing Mock Exams product ${item.product_id} for ${email}`)
      try {
        const { data: grantResult, error: grantError } = await supabase.rpc(
          'grant_mock_exam_access',
          {
            p_user_id: userId,
            p_woocommerce_order_id: order.id,
            p_woocommerce_product_id: item.product_id,
            p_quantity: item.quantity || 1,
          }
        )

        if (grantError) {
          return { success: false, error: `Unable to grant Mock Exams: ${grantError.message}` }
        }
        if (!grantResult?.success) {
          return { success: false, error: `Unable to grant Mock Exams: ${grantResult?.error || 'Unknown grant failure'}` }
        }

        console.log(
          `Mock Exams granted for order #${order.id}: ${grantResult.exams_granted ?? grantResult.exams_remaining ?? 0}`
        )
        await supabase.from('membership_activation_logs').insert({
          user_id: userId,
          action: 'mock_exam_granted',
          triggered_by: 'webhook',
          woocommerce_order_id: order.id,
          notes: `Mock Exams product ${mockExamProduct.product_name}; granted: ${grantResult.exams_granted ?? 0}; remaining: ${grantResult.exams_remaining ?? 0}`,
        })
      } catch (error: any) {
        return { success: false, error: `Mock Exams processing failed: ${error.message || 'Unknown error'}` }
      }
    }

    // Process Direct Book Purchase
    // IMPORTANT: Direct book purchases do NOT create book credits.
    // Access is granted automatically via WooCommerce download permissions.
    // The book appears in My Books via the WordPress API (user-books endpoint).
    //
    // Book credits (user_book_credits) are ONLY created for:
    //   - Professional Membership purchases (source_type='membership') via activate_membership RPC
    //   - Admin grants
    // This separation ensures no confusion between direct purchases and membership benefits.
    if (bookProduct) {
      console.log(`Direct book purchase: ${bookProduct.product_name} (${bookProduct.language}) for ${email} — access via WooCommerce download, no credit needed`)
    }
  }

  if (!anyProductMatched) {
    return { success: false, error: 'No entitlement mapping exists for any product in this order' }
  }

  return { success: true }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const url = new URL(req.url)

  // -------------------------------------------------------
  // FIX #2: Retry endpoint — POST /woocommerce-webhook/retry?order_id=XXXX
  // Also supports retrying all pending failed orders
  // -------------------------------------------------------
  if (url.pathname.endsWith('/retry')) {
    const orderId = url.searchParams.get('order_id')

    if (orderId) {
      // Retry a specific order
      const { data: failedOrder } = await supabase
        .from('failed_webhook_orders')
        .select('*')
        .eq('woocommerce_order_id', parseInt(orderId))
        .in('status', ['pending', 'processing'])
        .maybeSingle()

      if (!failedOrder) {
        return new Response(
          JSON.stringify({ error: `No pending failed order found for order_id ${orderId}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Mark as processing
      await supabase.from('failed_webhook_orders').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', failedOrder.id)

      const result = await processOrder(supabase, failedOrder.order_payload as WooCommerceOrderWebhook)

      if (result.success) {
        await markOrderResolved(supabase, parseInt(orderId))
        return new Response(
          JSON.stringify({ success: true, message: `Order #${orderId} processed successfully` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        await supabase.from('failed_webhook_orders').update({
          status: 'pending',
          failure_reason: result.error,
          retry_count: (failedOrder.retry_count || 0) + 1,
          last_retry_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', failedOrder.id)
        return new Response(
          JSON.stringify({ success: false, error: result.error }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Retry all pending failed orders (up to 20 at a time)
      const { data: failedOrders } = await supabase
        .from('failed_webhook_orders')
        .select('*')
        .eq('status', 'pending')
        .lt('retry_count', 10)
        .order('created_at', { ascending: true })
        .limit(20)

      const results = []
      for (const fo of (failedOrders || [])) {
        await supabase.from('failed_webhook_orders').update({ status: 'processing', updated_at: new Date().toISOString() }).eq('id', fo.id)
        const result = await processOrder(supabase, fo.order_payload as WooCommerceOrderWebhook)
        if (result.success) {
          await markOrderResolved(supabase, fo.woocommerce_order_id)
          results.push({ order_id: fo.woocommerce_order_id, success: true })
        } else {
          await supabase.from('failed_webhook_orders').update({
            status: 'pending',
            failure_reason: result.error,
            retry_count: (fo.retry_count || 0) + 1,
            last_retry_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', fo.id)
          results.push({ order_id: fo.woocommerce_order_id, success: false, error: result.error })
        }
      }

      return new Response(
        JSON.stringify({ success: true, processed: results.length, results }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  // -------------------------------------------------------
  // Main webhook handler
  // -------------------------------------------------------
  try {
    const order: WooCommerceOrderWebhook = await req.json()
    console.log(`Processing order ${order.id}, status: ${order.status}`)

    // Only process completed or processing orders
    if (order.status !== 'completed' && order.status !== 'processing') {
      return new Response(
        JSON.stringify({ message: 'Order status not applicable' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!order.billing?.email) {
      return new Response(
        JSON.stringify({ error: 'No email provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // -------------------------------------------------------
    // FIX #3: Wrap processOrder in try/catch and save to
    // failed_webhook_orders on ANY failure so nothing is lost
    // -------------------------------------------------------
    const result = await processOrder(supabase, order)

    if (!result.success) {
      console.error(`Order #${order.id} processing failed: ${result.error}`)
      await saveFailedOrder(supabase, order, result.error || 'Unknown error')
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Webhook processing error:', error)
    // Try to save the failed order for retry
    try {
      const rawBody = await req.text().catch(() => '{}')
      const order = JSON.parse(rawBody)
      if (order?.id) {
        await saveFailedOrder(supabase, order, error.message || 'Unhandled exception')
      }
    } catch (_) { /* ignore */ }

    // Always return 200 to prevent WooCommerce from retrying indefinitely
    return new Response(
      JSON.stringify({ success: false, error: 'Processing error', message: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function logError(
  supabase: any,
  userId: string | null,
  orderId: string,
  productId: string,
  errorMessage: string,
  details: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('membership_activation_logs').insert({
      user_id: userId,
      action: 'activated',
      triggered_by: 'webhook',
      woocommerce_order_id: parseInt(orderId),
      error_message: errorMessage,
      notes: `Product ID: ${productId} - ${JSON.stringify(details)}`,
    })
  } catch (logError) {
    console.error('Failed to log error:', logError)
  }
}

async function logVoucherError(
  supabase: any,
  userId: string | null,
  orderId: number,
  productId: number,
  certificationProductId: string,
  errorMessage: string
): Promise<void> {
  try {
    await supabase.from('voucher_activation_logs').insert({
      user_id: userId,
      action: 'failed',
      triggered_by: 'webhook',
      woocommerce_order_id: orderId,
      woocommerce_product_id: productId,
      certification_product_id: certificationProductId,
      error_message: errorMessage,
    })
  } catch (logError) {
    console.error('Failed to log voucher error:', logError)
  }
}
