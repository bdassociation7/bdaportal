// BDA Portal — ECP Orders & Requests
// Creates either an Exam Voucher request or a Learning System seat request,
// then sends the corresponding invoice notification to BDA Support.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type OrderRequestBody = {
  request_type: 'exam_vouchers' | 'learning_system_access'
  quantity: number
  certification_type?: 'CP' | 'SCP'
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const authHeader = req.headers.get('Authorization')

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse({ error: 'Server configuration error' }, 500)
    }
    if (!authHeader) {
      return jsonResponse({ error: 'Authentication is required' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return jsonResponse({ error: 'Invalid authentication' }, 401)
    }

    const { data: profile, error: profileError } = await userClient
      .from('users')
      .select('id, role, email, first_name, last_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'ecp') {
      return jsonResponse({ error: 'ECP partner access is required' }, 403)
    }

    const body = await req.json() as OrderRequestBody
    const quantity = Number(body.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5000) {
      return jsonResponse({ error: 'Quantity must be a whole number between 1 and 5000' }, 400)
    }
    if (!['exam_vouchers', 'learning_system_access'].includes(body.request_type)) {
      return jsonResponse({ error: 'Invalid request type' }, 400)
    }
    if (body.request_type === 'exam_vouchers' && !['CP', 'SCP'].includes(body.certification_type || '')) {
      return jsonResponse({ error: 'BDA-CP or BDA-SCP must be selected for exam vouchers' }, 400)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: partner, error: partnerError } = await adminClient
      .from('partners')
      .select('id, company_name, contact_person, contact_email')
      .eq('id', user.id)
      .single()

    if (partnerError || !partner) {
      return jsonResponse({ error: 'Partner profile was not found' }, 404)
    }

    const isVoucherRequest = body.request_type === 'exam_vouchers'
    const { data: request, error: requestError } = isVoucherRequest
      ? await adminClient
        .from('ecp_voucher_requests')
        .insert({
          partner_id: partner.id,
          certification_type: body.certification_type,
          quantity,
          unit_price: 0,
          payment_method: 'invoice',
        })
        .select('id, request_number, quantity, certification_type, created_at')
        .single()
      : await adminClient
        .from('ecp_learning_system_requests')
        .insert({
          partner_id: partner.id,
          quantity,
        })
        .select('id, request_number, quantity, created_at')
        .single()

    if (requestError || !request) {
      console.error('[submit-ecp-order-request] Could not create request', requestError)
      return jsonResponse({ error: 'Unable to create your request. Please try again.' }, 500)
    }

    const partnerName = partner.company_name || partner.contact_person ||
      [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
    const productLabel = isVoucherRequest
      ? `BDA-${body.certification_type} Exam Vouchers`
      : 'Learning System Access'
    const emailType = isVoucherRequest
      ? 'ecp_exam_voucher_request_support'
      : 'ecp_learning_system_request_support'
    const emailPayload = {
      type: emailType,
      to: 'support@bda-global.org',
      data: {
        request_number: request.request_number,
        partner_name: partnerName,
        partner_email: partner.contact_email || profile.email,
        product_label: productLabel,
        quantity: String(quantity),
        requested_at: new Date(request.created_at).toLocaleString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
        }),
      },
    }

    const sendEmailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    if (!sendEmailResponse.ok) {
      const errorText = await sendEmailResponse.text()
      console.error('[submit-ecp-order-request] Support notification failed', errorText)
      const table = isVoucherRequest ? 'ecp_voucher_requests' : 'ecp_learning_system_requests'
      await adminClient.from(table).delete().eq('id', request.id)
      return jsonResponse({ error: 'The support notification could not be sent. No request was created.' }, 502)
    }

    return jsonResponse({
      success: true,
      request: {
        id: request.id,
        request_number: request.request_number,
        request_type: body.request_type,
        quantity,
        product_label: productLabel,
      },
    }, 201)
  } catch (error) {
    console.error('[submit-ecp-order-request] Unexpected error', error)
    return jsonResponse({ error: 'Unexpected error while submitting your request' }, 500)
  }
})
