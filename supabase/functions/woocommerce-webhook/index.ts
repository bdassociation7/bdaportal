/**
 * WooCommerce Webhook Handler - Supabase Edge Function
 *
 * Handles order completion webhooks from WooCommerce:
 * - Creates Supabase Auth user if not exists
 * - Creates users table record
 * - Activates memberships
 * - Grants learning system access
 * - Activates partnerships (PDP/ECP)
 * - Sends welcome email with password reset for new users
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

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the webhook payload
    const order: WooCommerceOrderWebhook = await req.json()

    console.log(`Processing order ${order.id}, status: ${order.status}`)

    // Only process completed or processing orders
    if (order.status !== 'completed' && order.status !== 'processing') {
      return new Response(
        JSON.stringify({ message: 'Order status not applicable' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const email = order.billing?.email?.toLowerCase()
    if (!email) {
      console.error('No email in order:', order.id)
      return new Response(
        JSON.stringify({ error: 'No email provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get product mappings
    const [membershipMappings, learningProducts, partnershipProducts, certificationProducts, bookProductsResult] = await Promise.all([
      supabase.from('membership_product_mapping').select('*').eq('is_active', true),
      supabase.from('learning_system_products').select('*').eq('is_active', true),
      supabase.from('partnership_product_mapping').select('*').eq('is_active', true),
      supabase.from('certification_products').select('*').eq('is_active', true),
      supabase.from('book_products').select('*').eq('is_active', true),
    ])

    const membershipMap = new Map(
      (membershipMappings.data || []).map((p) => [p.woocommerce_product_id.toString(), p])
    )
    const learningMap = new Map(
      (learningProducts.data || []).map((p) => [p.woocommerce_product_id.toString(), p])
    )
    const partnershipMap = new Map(
      (partnershipProducts.data || []).map((p) => [p.woocommerce_product_id.toString(), p])
    )
    const certificationMap = new Map(
      (certificationProducts.data || []).map((p) => [p.woocommerce_product_id.toString(), p])
    )
    const bookProductsMap = new Map(
      (bookProductsResult.data || []).map((p) => [p.woocommerce_product_id.toString(), p])
    )
    // Map book_products.category to book_product_group used in membership_benefit_books
    const categoryToGroupMap: Record<string, string> = {
      'bock': 'bda-bock',
      'glossary': 'glossary',
      'study-guide': 'study-guide',
    }

    // Process each line item
    for (const item of order.line_items) {
      const membershipProduct = membershipMap.get(item.product_id.toString())
      const learningProduct = learningMap.get(item.product_id.toString())
      const partnershipProduct = partnershipMap.get(item.product_id.toString())
      const certificationProduct = certificationMap.get(item.product_id.toString())
      const bookProduct = bookProductsMap.get(item.product_id.toString())

      // Skip if no product type matches
      if (!membershipProduct && !learningProduct && !partnershipProduct && !certificationProduct && !bookProduct) {
        continue
      }

      // Find or create user
      let userId: string

      // First, check if user exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (existingUser) {
        userId = existingUser.id
        console.log(`Found existing user: ${userId}`)
      } else {
        // Check if auth user exists (might have signed up via Google, etc.)
        const { data: authUsers } = await supabase.auth.admin.listUsers()
        const existingAuthUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email)

        if (existingAuthUser) {
          userId = existingAuthUser.id
          console.log(`Found existing auth user: ${userId}`)

          // Create users table record for existing auth user
          await supabase.from('users').insert({
            id: userId,
            email: email,
            first_name: order.billing.first_name || '',
            last_name: order.billing.last_name || '',
            phone: order.billing.phone || null,
            country_code: order.billing.country || null,
            role: 'individual',
            is_active: true,
            profile_completed: false,
            created_from: 'woocommerce',
          })
        } else {
          // Create new auth user
          console.log(`Creating new user for email: ${email}`)

          // Generate temporary password
          const tempPassword = crypto.randomUUID() + crypto.randomUUID()

          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              first_name: order.billing.first_name || '',
              last_name: order.billing.last_name || '',
              created_from: 'woocommerce_webhook',
            },
          })

          if (authError) {
            console.error('Error creating auth user:', authError)
            await logError(supabase, null, order.id.toString(), item.product_id.toString(),
              `Failed to create auth user: ${authError.message}`, { email })
            continue
          }

          userId = authData.user.id
          console.log(`Created auth user with ID: ${userId}`)

          // Create users table record
          const { error: createError } = await supabase.from('users').insert({
            id: userId,
            email: email,
            first_name: order.billing.first_name || '',
            last_name: order.billing.last_name || '',
            phone: order.billing.phone || null,
            country_code: order.billing.country || null,
            role: 'individual',
            is_active: true,
            profile_completed: false,
            created_from: 'woocommerce',
          })

          if (createError) {
            console.error('Error creating user record:', createError)
          }

          // Send welcome email with set password link
          const portalUrl = Deno.env.get('PORTAL_URL') || 'https://portal.bda-global.org'

          // Step 1: Try to generate a direct set-password link via admin API
          let setPasswordUrl: string | undefined
          try {
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
              type: 'recovery',
              email: email,
              options: {
                redirectTo: `${portalUrl}/auth/set-password`,
              }
            })
            if (!linkError && linkData?.properties?.action_link) {
              setPasswordUrl = linkData.properties.action_link
              console.log(`Generated set-password link for ${email}`)
            } else if (linkError) {
              console.warn('generateLink failed (will use resetPasswordForEmail):', linkError.message)
            }
          } catch (genErr: any) {
            console.warn('generateLink exception:', genErr.message)
          }

          // Step 2: If direct link failed, send reset password email via Supabase Auth
          if (!setPasswordUrl) {
            const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${portalUrl}/auth/set-password`,
            })
            if (resetErr) {
              console.error('resetPasswordForEmail failed:', resetErr.message)
            } else {
              console.log(`Password reset email sent directly to ${email}`)
            }
          }

          // Step 3: Always queue welcome email (with or without direct link)
          const welcomeData = {
            firstName: order.billing.first_name || 'User',
            email: email,
            loginUrl: `${portalUrl}/login`,
            setPasswordUrl: setPasswordUrl || `${portalUrl}/auth/forgot-password`,
          }

          const result = await queueEmailWithTemplate({
            supabase,
            recipientEmail: email,
            recipientName: order.billing.first_name,
            templateName: 'welcome',
            subject: `Welcome to BDA Portal — Set Your Password, ${welcomeData.firstName}!`,
            htmlBody: welcomeEmailHtml(welcomeData),
            textBody: welcomeEmailText(welcomeData),
            priority: 1,
            relatedEntityType: 'woocommerce_order',
            relatedEntityId: order.id.toString(),
          })

          if (result.success) {
            console.log(`Welcome email queued for ${email} (ID: ${result.emailId})`)
          } else {
            console.error('Failed to queue welcome email:', result.error)
          }
        }
      }

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
        } catch (error) {
          console.error('Membership activation error:', error)
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
          } else {
            console.log(`Granted learning system access (${learningProduct.language})`)
          }
        } catch (error) {
          console.error('Learning system error:', error)
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
              p_notes: `Product: ${item.name} (ID: ${item.product_id})`,
            }
          )

          if (partnershipError) {
            console.error('Error activating partnership:', partnershipError)
          } else {
            console.log(`Activated ${partnershipProduct.partnership_type} partnership, license: ${licenseId}`)

            // Queue partner approval email
            const portalUrl = Deno.env.get('PORTAL_URL') || 'https://portal.bda-global.org'
            // Check current user role to detect dual_partner
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

            const partnerEmailResult = await queueEmailWithTemplate({
              supabase,
              recipientEmail: email,
              recipientName: order.billing.first_name,
              templateName: 'partner_approved',
              subject: `✓ ${partnerData.organizationName} Approved as BDA ${partnerType} Partner`,
              htmlBody: partnerApprovedHtml(partnerData),
              textBody: partnerApprovedText(partnerData),
              priority: 2,
              relatedEntityType: partnerType === 'ECP' ? 'ecp_license' : 'pdp_program',
              relatedEntityId: licenseId?.toString(),
            })

            if (partnerEmailResult.success) {
              console.log(`Partner approval email queued for ${email}`)
            } else {
              console.error('Failed to queue partner approval email:', partnerEmailResult.error)
            }
          }
        } catch (error) {
          console.error('Partnership activation error:', error)
        }
      }

      // Process certification exam voucher creation
      if (certificationProduct) {
        console.log(`Processing certification voucher: ${certificationProduct.certification_type} (${certificationProduct.exam_language || 'en'}) for ${email}`)
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
          } else {
            // Log results
            const results = voucherResults || []
            const successCount = results.filter((r: any) => r.success).length

            if (successCount > 0) {
              console.log(`Created ${successCount} exam voucher(s) for ${email} (${certificationProduct.certification_type})`)

              // Log successful activations
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

            // Log failures (skip "already exist" messages)
            for (const failedResult of results.filter((r: any) => !r.success)) {
              if (failedResult.error_message && !failedResult.error_message.includes('already exist')) {
                await logVoucherError(supabase, userId, order.id, item.product_id, certificationProduct.id, failedResult.error_message)
              }
            }
          }
        } catch (error: any) {
          console.error('Certification voucher creation error:', error)
          await logVoucherError(supabase, userId, order.id, item.product_id, certificationProduct.id, error.message || 'Unknown error')
        }
      }
      // Process Direct Book Purchase
      if (bookProduct) {
        console.log(`Processing direct book purchase: ${bookProduct.product_name} (${bookProduct.language}) for ${email}`)
        try {
          const bookProductGroup = categoryToGroupMap[bookProduct.category] || bookProduct.category

          // Check if already granted for this order (idempotent)
          const { data: existingCredit } = await supabase
            .from('user_book_credits')
            .select('id')
            .eq('user_id', userId)
            .eq('source_type', 'woocommerce_order')
            .eq('source_id', order.id.toString())
            .eq('book_product_group', bookProductGroup)
            .maybeSingle()

          if (existingCredit) {
            console.log(`Book credit already exists for order #${order.id} - skipping`)
          } else {
            const { error: creditError } = await supabase
              .from('user_book_credits')
              .insert({
                user_id: userId,
                source_type: 'woocommerce_order',
                source_id: order.id.toString(),
                book_product_group: bookProductGroup,
                book_product_group_name: bookProduct.product_name,
                available_languages: [bookProduct.language],
                is_redeemed: false,
                notes: `WooCommerce Order #${order.id} - Direct purchase`,
              })

            if (creditError) {
              console.error('Error creating book credit:', creditError)
              await logError(supabase, userId, order.id.toString(), item.product_id.toString(),
                creditError.message, { book: bookProduct.product_name })
            } else {
              console.log(`Successfully created book credit for ${bookProduct.product_name} for ${email}`)
              await supabase.from('membership_activation_logs').insert({
                user_id: userId,
                action: 'book_credit_granted',
                triggered_by: 'webhook',
                woocommerce_order_id: order.id,
                notes: `Book: ${bookProduct.product_name} (ID: ${item.product_id}, Group: ${bookProductGroup})`,
              })
            }
          }
        } catch (error) {
          console.error('Book credit creation error:', error)
          await logError(supabase, userId, order.id.toString(), item.product_id.toString(),
            error.message || 'Unknown error', { book: bookProduct.product_name })
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
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
