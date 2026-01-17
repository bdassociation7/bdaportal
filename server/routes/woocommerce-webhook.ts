/**
 * WooCommerce Webhook Handler
 * US2: Activate Membership After Purchase
 * US8: Error Handling
 * US9: Partnership Auto-Activation (PDP/ECP)
 */

import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client with service role for admin operations
// Use fallback values for build-time to prevent errors
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

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
  meta_data?: Array<{
    key: string;
    value: string;
  }>;
}

/**
 * Verify WooCommerce webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');
  return hash === signature;
}

/**
 * Handle WooCommerce order webhook
 * Activates memberships when membership products are purchased
 */
export async function handleWooCommerceOrderWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const signature = req.headers['x-wc-webhook-signature'] as string;
    const webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      const rawBody = JSON.stringify(req.body);
      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        console.error('Invalid webhook signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    const order: WooCommerceOrderWebhook = req.body;

    // Only process completed orders
    if (order.status !== 'completed' && order.status !== 'processing') {
      res.status(200).json({ message: 'Order status not applicable' });
      return;
    }

    const email = order.billing?.email;
    if (!email) {
      console.error('No email in order:', order.id);
      res.status(400).json({ error: 'No email provided' });
      return;
    }

    // Get membership product mappings from database
    const { data: productMappings, error: mappingError } = await supabase
      .from('membership_product_mapping')
      .select('*')
      .eq('is_active', true);

    if (mappingError) {
      console.error('Error fetching product mappings:', mappingError);
      throw mappingError;
    }

    // Get Learning System product mappings from database
    const { data: learningProducts, error: learningError } = await supabase
      .from('learning_system_products')
      .select('*')
      .eq('is_active', true);

    if (learningError) {
      console.error('Error fetching learning system products:', learningError);
      throw learningError;
    }

    // Get Partnership product mappings from database
    const { data: partnershipProducts, error: partnershipError } = await supabase
      .from('partnership_product_mapping')
      .select('*')
      .eq('is_active', true);

    if (partnershipError) {
      console.error('Error fetching partnership products:', partnershipError);
      throw partnershipError;
    }

    // Create maps for quick lookup
    const productMap = new Map(
      productMappings.map((p) => [p.woocommerce_product_id.toString(), p])
    );

    const learningProductMap = new Map(
      (learningProducts || []).map((p) => [p.woocommerce_product_id.toString(), p])
    );

    const partnershipProductMap = new Map(
      (partnershipProducts || []).map((p) => [p.woocommerce_product_id.toString(), p])
    );

    // Process each line item
    for (const item of order.line_items) {
      const mapping = productMap.get(item.product_id.toString());
      const learningProduct = learningProductMap.get(item.product_id.toString());
      const partnershipProduct = partnershipProductMap.get(item.product_id.toString());

      // Skip if none of the product types match
      if (!mapping && !learningProduct && !partnershipProduct) {
        continue;
      }

      // Find or create user (needed for both membership and learning system)
      let userId: string;

      // First, try to find existing user by email
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error finding user:', userError);
        throw userError;
      }

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // US8: If user doesn't exist → create user account automatically
        // First, create user in Supabase Auth, then in users table
        console.log(`Creating new user for email: ${email}`);

        // Generate a temporary password - user will need to reset it
        const tempPassword = crypto.randomBytes(16).toString('hex');

        // Create auth user first
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: email.toLowerCase(),
          password: tempPassword,
          email_confirm: true, // Auto-confirm the email
          user_metadata: {
            first_name: order.billing.first_name || '',
            last_name: order.billing.last_name || '',
            created_from: 'woocommerce_webhook',
          },
        });

        if (authError) {
          console.error('Error creating auth user:', authError);
          await logActivationError(
            null,
            order.id.toString(),
            item.product_id.toString(),
            `Failed to create auth user: ${authError.message}`,
            { email, order_id: order.id }
          );
          continue;
        }

        userId = authData.user.id;
        console.log(`Created auth user with ID: ${userId}`);

        // Now create the users table record with the same ID
        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: userId, // Use the auth user's ID
            email: email.toLowerCase(),
            first_name: order.billing.first_name || '',
            last_name: order.billing.last_name || '',
            phone: order.billing.phone || null,
            country_code: order.billing.country || null,
            role: 'individual',
            is_active: true,
            profile_completed: false,
            created_from: 'woocommerce',
          });

        if (createError) {
          console.error('Error creating user record:', createError);
          // Auth user exists but users table insert failed - log but continue
          // The user can still log in, they just won't have a profile yet
          await logActivationError(
            userId,
            order.id.toString(),
            item.product_id.toString(),
            `Auth user created but users table insert failed: ${createError.message}`,
            { email, order_id: order.id }
          );
        }

        // Send password reset email so user can set their password
        try {
          const resetUrl = process.env.PORTAL_URL || 'https://portal.bda-global.org';
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(
            email.toLowerCase(),
            {
              redirectTo: `${resetUrl}/auth/set-password`,
            }
          );
          if (resetError) {
            console.error('Failed to send password reset email:', resetError);
          } else {
            console.log(`Password reset email sent to ${email}`);
          }
        } catch (resetError) {
          console.error('Failed to send password reset email:', resetError);
          // Don't fail the whole process - user can use forgot password later
        }
      }

      // Process membership activation
      if (mapping) {
        console.log(
          `Processing membership activation: ${mapping.membership_type} for ${email}`
        );

        try {
          const { data: membershipId, error: activationError } = await supabase.rpc(
            'activate_membership',
            {
              p_user_id: userId,
              p_membership_type: mapping.membership_type,
              p_duration_months: mapping.duration_months || 12,
              p_woocommerce_order_id: order.id.toString(),
              p_woocommerce_product_id: item.product_id.toString(),
            }
          );

          if (activationError) {
            console.error('Error activating membership:', activationError);
            await logActivationError(
              userId,
              order.id.toString(),
              item.product_id.toString(),
              activationError.message,
              { membership_type: mapping.membership_type }
            );
            continue;
          }

          console.log(
            `Successfully activated ${mapping.membership_type} membership for ${email}, membership ID: ${membershipId}`
          );

          // Log successful activation
          await supabase.from('membership_activation_logs').insert({
            user_id: userId,
            membership_id: membershipId,
            action: 'activated',
            triggered_by: 'webhook',
            woocommerce_order_id: parseInt(order.id.toString()),
            notes: `Product: ${item.name} (ID: ${item.product_id}) - Order date: ${order.date_created}`,
          });

          // For professional memberships, trigger certificate generation
          if (mapping.membership_type === 'professional') {
            await triggerCertificateGeneration(membershipId, userId);
          }
        } catch (error: any) {
          console.error('Membership activation error:', error);
          await logActivationError(
            userId,
            order.id.toString(),
            item.product_id.toString(),
            error.message,
            { membership_type: mapping.membership_type }
          );
        }
      }

      // Process Learning System access grant
      if (learningProduct) {
        console.log(
          `Processing Learning System activation: ${learningProduct.language} for ${email}`
        );

        try {
          const { data: accessId, error: accessError } = await supabase.rpc(
            'grant_learning_system_access',
            {
              p_user_id: userId,
              p_language: learningProduct.language,
              p_woocommerce_order_id: parseInt(order.id.toString()),
              p_woocommerce_product_id: item.product_id,
              p_purchased_at: order.date_created,
              p_validity_months: learningProduct.validity_months,
              p_includes_question_bank: learningProduct.includes_question_bank,
              p_includes_flashcards: learningProduct.includes_flashcards,
            }
          );

          if (accessError) {
            console.error('Error granting Learning System access:', accessError);
            await logLearningSystemError(
              userId,
              order.id.toString(),
              item.product_id.toString(),
              accessError.message,
              { language: learningProduct.language }
            );
            continue;
          }

          console.log(
            `Successfully granted Learning System access (${learningProduct.language}) for ${email}, access ID: ${accessId}`
          );

          // Log successful access grant
          await supabase.from('membership_activation_logs').insert({
            user_id: userId,
            action: 'learning_system_granted',
            triggered_by: 'webhook',
            woocommerce_order_id: parseInt(order.id.toString()),
            notes: `Learning System ${learningProduct.language}: ${item.name} (ID: ${item.product_id}) - Order date: ${order.date_created}`,
          });
        } catch (error: any) {
          console.error('Learning System access error:', error);
          await logLearningSystemError(
            userId,
            order.id.toString(),
            item.product_id.toString(),
            error.message,
            { language: learningProduct.language }
          );
        }
      }

      // Process Partnership activation (PDP/ECP)
      if (partnershipProduct) {
        console.log(
          `Processing Partnership activation: ${partnershipProduct.partnership_type.toUpperCase()} for ${email}`
        );

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
              p_notes: `Product: ${item.name} (ID: ${item.product_id}) - Order date: ${order.date_created}`,
            }
          );

          if (partnershipError) {
            console.error('Error activating partnership:', partnershipError);
            await logPartnershipError(
              userId,
              order.id.toString(),
              item.product_id.toString(),
              partnershipError.message,
              { partnership_type: partnershipProduct.partnership_type }
            );
            continue;
          }

          console.log(
            `Successfully activated ${partnershipProduct.partnership_type.toUpperCase()} partnership for ${email}, license ID: ${licenseId}`
          );
        } catch (error: any) {
          console.error('Partnership activation error:', error);
          await logPartnershipError(
            userId,
            order.id.toString(),
            item.product_id.toString(),
            error.message,
            { partnership_type: partnershipProduct.partnership_type }
          );
        }
      }
    }

    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);

    // US8: Webhook must not break even if unexpected data received
    // Always return 200 to prevent WooCommerce from retrying indefinitely
    res.status(200).json({
      success: false,
      error: 'Processing error',
      message: error.message,
    });
  }
}

/**
 * Log activation errors for admin review
 */
async function logActivationError(
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
    });
  } catch (logError) {
    console.error('Failed to log activation error:', logError);
  }
}

/**
 * Log Learning System access errors for admin review
 */
async function logLearningSystemError(
  userId: string | null,
  orderId: string,
  productId: string,
  errorMessage: string,
  details: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('membership_activation_logs').insert({
      user_id: userId,
      action: 'learning_system_granted',
      triggered_by: 'webhook',
      woocommerce_order_id: parseInt(orderId),
      error_message: errorMessage,
      notes: `Learning System Product ID: ${productId} - ${JSON.stringify(details)}`,
    });
  } catch (logError) {
    console.error('Failed to log Learning System error:', logError);
  }
}

/**
 * Log Partnership activation errors for admin review
 */
async function logPartnershipError(
  userId: string | null,
  orderId: string,
  productId: string,
  errorMessage: string,
  details: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('partnership_activation_logs').insert({
      user_id: userId,
      partnership_type: details.partnership_type || 'unknown',
      action: 'failed',
      triggered_by: 'webhook',
      woocommerce_order_id: parseInt(orderId),
      woocommerce_product_id: parseInt(productId),
      error_message: errorMessage,
      notes: JSON.stringify(details),
    });
  } catch (logError) {
    console.error('Failed to log Partnership error:', logError);
  }
}

/**
 * Trigger certificate generation for professional memberships
 * US3: PDF is generated and stored on activation
 */
async function triggerCertificateGeneration(
  membershipId: string,
  userId: string
): Promise<void> {
  try {
    // Log that certificate generation is needed
    await supabase.from('membership_activation_logs').insert({
      user_id: userId,
      membership_id: membershipId,
      action: 'certificate_generated',
      triggered_by: 'webhook',
      notes: `Certificate generation queued at ${new Date().toISOString()}`,
    });

    console.log(`Certificate generation queued for membership: ${membershipId}`);

    // Trigger actual certificate generation
    // This is done asynchronously via background worker
    // Run: tsx scripts/membership-certificate-generator.ts [membership_id]
    // Or run without args to generate all pending certificates
    //
    // For production deployment, this should be:
    // 1. Supabase Edge Function (recommended)
    // 2. Background job queue (Bull, BullMQ, etc.)
    // 3. Cron job that runs periodically
    // 4. Separate microservice triggered by webhook/event
    //
    // For now, admin can run: npm run membership-certificate:generate
  } catch (error) {
    console.error('Failed to queue certificate generation:', error);
  }
}

/**
 * Health check endpoint for webhook
 */
export function handleWebhookHealth(_req: Request, res: Response): void {
  res.json({
    status: 'healthy',
    service: 'woocommerce-webhook',
    timestamp: new Date().toISOString(),
  });
}
