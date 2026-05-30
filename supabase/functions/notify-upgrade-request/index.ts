/**
 * BDA Portal – notify-upgrade-request Edge Function
 *
 * Called by the frontend when a partner submits an upgrade request.
 * 1. Inserts the request into public.upgrade_requests
 * 2. Sends a notification email to info@bda-global.org
 * 3. Sends a confirmation email to the partner
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FROM_EMAIL = 'The Business Development Association (BDA®) <noreply@bda-global.org>';
const ADMIN_EMAIL = 'info@bda-global.org';
const PORTAL_URL = 'https://portal.bda-global.org';

// ── Tier labels ────────────────────────────────────────────────────────────
const TIER_LABELS: Record<string, string> = {
  standard: 'Standard',
  advanced: 'Advanced',
  premium: 'Premium',
};

const TYPE_LABELS: Record<string, string> = {
  ecp: 'ECP – Exam Centre Partner',
  pdp: 'PDP – Professional Development Partner',
  dual_partner: 'ECP + PDP (Dual Partnership)',
};

// ── Send email via Resend ──────────────────────────────────────────────────
async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
  }
}

// ── Admin notification email ───────────────────────────────────────────────
function buildAdminEmail(data: {
  partnerName: string;
  partnerEmail: string;
  currentType: string;
  currentTier: string | null;
  requestedType: string;
  requestedTier: string;
  notes: string | null;
  requestId: string;
}): string {
  const currentLabel = `${TYPE_LABELS[data.currentType] ?? data.currentType}${data.currentTier ? ` (${TIER_LABELS[data.currentTier] ?? data.currentTier})` : ''}`;
  const requestedLabel = `${TYPE_LABELS[data.requestedType] ?? data.requestedType} – ${TIER_LABELS[data.requestedTier] ?? data.requestedTier}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f7fa; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa; padding: 40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0d2b5e; padding:32px 40px; text-align:center;">
            <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">
              Partnership Upgrade Request
            </h1>
            <p style="color:#93c5fd; margin:8px 0 0; font-size:14px;">BDA Portal Admin Notification</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 40px;">
            <p style="color:#374151; font-size:15px; margin:0 0 24px;">
              A partner has submitted a new upgrade request and requires your review.
            </p>
            <!-- Partner Info -->
            <table width="100%" cellpadding="12" cellspacing="0" style="background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:24px;">
              <tr>
                <td style="color:#6b7280; font-size:13px; width:40%;">Partner Name</td>
                <td style="color:#111827; font-size:14px; font-weight:600;">${data.partnerName}</td>
              </tr>
              <tr style="border-top:1px solid #e2e8f0;">
                <td style="color:#6b7280; font-size:13px;">Partner Email</td>
                <td style="color:#111827; font-size:14px;">${data.partnerEmail}</td>
              </tr>
              <tr style="border-top:1px solid #e2e8f0;">
                <td style="color:#6b7280; font-size:13px;">Current Partnership</td>
                <td style="color:#111827; font-size:14px;">${currentLabel}</td>
              </tr>
              <tr style="border-top:1px solid #e2e8f0;">
                <td style="color:#6b7280; font-size:13px;">Requested Upgrade</td>
                <td style="font-size:14px; font-weight:700; color:#0d2b5e;">${requestedLabel}</td>
              </tr>
              ${data.notes ? `
              <tr style="border-top:1px solid #e2e8f0;">
                <td style="color:#6b7280; font-size:13px;">Partner Notes</td>
                <td style="color:#374151; font-size:14px; font-style:italic;">${data.notes}</td>
              </tr>` : ''}
            </table>
            <!-- CTA -->
            <div style="text-align:center; margin:28px 0;">
              <a href="${PORTAL_URL}/admin/upgrade-requests"
                 style="background:#0d2b5e; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:15px; font-weight:600; display:inline-block;">
                Review Request in Admin Panel
              </a>
            </div>
            <p style="color:#9ca3af; font-size:12px; text-align:center; margin:0;">
              Request ID: ${data.requestId}
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc; padding:20px 40px; border-top:1px solid #e5e7eb; text-align:center;">
            <p style="color:#9ca3af; font-size:12px; margin:0;">
              © ${new Date().getFullYear()} Business Development Association (BDA®). All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Partner confirmation email ─────────────────────────────────────────────
function buildPartnerEmail(data: {
  partnerName: string;
  requestedType: string;
  requestedTier: string;
}): string {
  const requestedLabel = `${TYPE_LABELS[data.requestedType] ?? data.requestedType} – ${TIER_LABELS[data.requestedTier] ?? data.requestedTier}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f7fa; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa; padding: 40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0d2b5e; padding:32px 40px; text-align:center;">
            <h1 style="color:#ffffff; margin:0; font-size:22px; font-weight:700;">Upgrade Request Received</h1>
            <p style="color:#93c5fd; margin:8px 0 0; font-size:14px;">BDA Partner Portal</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="color:#374151; font-size:15px;">Dear <strong>${data.partnerName}</strong>,</p>
            <p style="color:#374151; font-size:15px;">
              We have received your upgrade request for the <strong>${requestedLabel}</strong> partnership tier.
              Our team will review your request and get back to you within 1–2 business days.
            </p>
            <p style="color:#374151; font-size:15px;">
              You can track the status of your request from your partner dashboard.
            </p>
            <div style="text-align:center; margin:28px 0;">
              <a href="${PORTAL_URL}"
                 style="background:#0d2b5e; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:15px; font-weight:600; display:inline-block;">
                Go to Dashboard
              </a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc; padding:20px 40px; border-top:1px solid #e5e7eb; text-align:center;">
            <p style="color:#9ca3af; font-size:12px; margin:0;">
              © ${new Date().getFullYear()} Business Development Association (BDA®). All rights reserved.<br>
              If you did not submit this request, please contact <a href="mailto:support@bda-global.org" style="color:#0d2b5e;">support@bda-global.org</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Main handler ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const { requested_type, requested_tier, notes } = body;

    if (!requested_type || !requested_tier) {
      throw new Error('requested_type and requested_tier are required');
    }

    // Get partner info
    const { data: partner, error: partnerErr } = await supabase
      .from('partners')
      .select('id, company_name, contact_email, partner_type')
      .eq('id', user.id)
      .single();

    if (partnerErr || !partner) throw new Error('Partner not found');

    // Get current tier from license
    let currentTier: string | null = null;
    if (partner.partner_type === 'ecp' || partner.partner_type === 'dual_partner') {
      const { data: ecpLic } = await supabase
        .from('ecp_licenses')
        .select('tier')
        .eq('partner_id', partner.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      currentTier = ecpLic?.tier ?? null;
    } else if (partner.partner_type === 'pdp') {
      const { data: pdpLic } = await supabase
        .from('pdp_licenses')
        .select('max_programs')
        .eq('partner_id', partner.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (pdpLic) {
        currentTier = pdpLic.max_programs <= 5 ? 'standard'
          : pdpLic.max_programs <= 8 ? 'advanced'
          : 'premium';
      }
    }

    // Check for existing pending request
    const { data: existing } = await supabase
      .from('upgrade_requests')
      .select('id')
      .eq('partner_id', partner.id)
      .eq('status', 'pending')
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: 'You already have a pending upgrade request. Please wait for it to be reviewed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert upgrade request
    const { data: request, error: insertErr } = await supabase
      .from('upgrade_requests')
      .insert({
        partner_id: partner.id,
        partner_email: partner.contact_email,
        partner_name: partner.company_name,
        current_type: partner.partner_type,
        current_tier: currentTier,
        requested_type,
        requested_tier,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Send emails
    if (resendApiKey) {
      // Admin notification
      await sendEmail(
        resendApiKey,
        ADMIN_EMAIL,
        `[BDA Portal] Partnership Upgrade Request – ${partner.company_name}`,
        buildAdminEmail({
          partnerName: partner.company_name,
          partnerEmail: partner.contact_email,
          currentType: partner.partner_type,
          currentTier,
          requestedType: requested_type,
          requestedTier: requested_tier,
          notes: notes || null,
          requestId: request.id,
        })
      );

      // Partner confirmation
      await sendEmail(
        resendApiKey,
        partner.contact_email,
        'Your Partnership Upgrade Request Has Been Received – BDA Portal',
        buildPartnerEmail({
          partnerName: partner.company_name,
          requestedType: requested_type,
          requestedTier: requested_tier,
        })
      );
    }

    return new Response(
      JSON.stringify({ success: true, request_id: request.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
