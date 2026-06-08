/**
 * DEBUG version of woocommerce-webhook
 * Returns detailed diagnostic info without creating any users
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wc-webhook-signature, x-wc-webhook-topic, x-wc-webhook-source, x-wc-webhook-resource, x-wc-webhook-event, x-wc-webhook-id, x-wc-webhook-delivery-id',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const rawBody = await req.text()
  let order: any = {}
  try { order = JSON.parse(rawBody) } catch (_) {}

  // Test 1: Read system_config
  const { data: configRow, error: configErr } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'wc_webhook_secret')
    .maybeSingle()

  // Test 2: Read membership_product_mapping
  const { data: memberships, error: membErr } = await supabase
    .from('membership_product_mapping')
    .select('woocommerce_product_id, membership_type, is_active')
    .eq('is_active', true)

  // Test 3: Read learning_system_products
  const { data: learning, error: learnErr } = await supabase
    .from('learning_system_products')
    .select('woocommerce_product_id, is_active')
    .eq('is_active', true)

  // Test 4: Read book_products
  const { data: books, error: booksErr } = await supabase
    .from('book_products')
    .select('woocommerce_product_id, is_active')
    .eq('is_active', true)

  // Test 5: Check signature
  const signature = req.headers.get('x-wc-webhook-signature')
  const webhookSecret = configRow?.value
  let signatureValid = false
  let computedSig = ''
  if (webhookSecret && signature) {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(webhookSecret)
    const msgData = encoder.encode(rawBody)
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
    computedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    signatureValid = computedSig === signature
  }

  // Test 6: Check product matching
  const membershipMap = new Map((memberships || []).map((p: any) => [p.woocommerce_product_id.toString(), p]))
  const lineItems = order.line_items || []
  const matchResults = lineItems.map((item: any) => ({
    product_id: item.product_id,
    product_id_str: item.product_id?.toString(),
    in_membership_map: membershipMap.has(item.product_id?.toString()),
  }))

  return new Response(
    JSON.stringify({
      debug: true,
      order_id: order.id,
      order_status: order.status,
      order_email: order.billing?.email,
      line_items_count: lineItems.length,
      signature_header: signature,
      computed_signature: computedSig,
      signature_valid: signatureValid,
      webhook_secret_found: !!webhookSecret,
      membership_mappings_count: memberships?.length ?? 0,
      membership_mappings_error: membErr?.message ?? null,
      membership_mappings: memberships,
      learning_products_count: learning?.length ?? 0,
      learning_error: learnErr?.message ?? null,
      books_count: books?.length ?? 0,
      books_error: booksErr?.message ?? null,
      product_match_results: matchResults,
      supabase_url: supabaseUrl ? 'SET' : 'MISSING',
      service_key: supabaseServiceKey ? 'SET' : 'MISSING',
    }, null, 2),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
