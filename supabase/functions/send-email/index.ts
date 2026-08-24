/**
 * BDA Portal - Send Email Edge Function
 *
 * Core email sending function with DB logging and template support
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Email sender configuration
const FROM_EMAIL = 'The Business Development Association (BDA®) <noreply@bda-global.org>';
const FROM_EMAIL_DEV = 'The Business Development Association (BDA®) <onboarding@resend.dev>';

// Simple template renderer
function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    if (value === undefined || value === null) return match;
    return String(value);
  });
}

function redactSensitiveTemplateData(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      /(password|reset|recovery|invite|action_link|set_password)/i.test(key) ? '[redacted]' : value,
    ]),
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // This function is intentionally callable only by trusted server-side code.
  const internalSecret = Deno.env.get('INTERNAL_EMAIL_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (internalSecret) {
    const providedSecret = req.headers.get('x-internal-secret');
    const providedAuth = req.headers.get('authorization')?.replace('Bearer ', '');
    const isInternalCall = providedSecret === internalSecret;
    const isServiceRole = providedAuth === serviceRoleKey;
    if (!isInternalCall && !isServiceRole) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorised' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Initialize Supabase client (optional - for logging)
    const supabase = supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey)
      : null;

    const body = await req.json();
    // Accept three payload formats:
    // Format 1 (template key):  { type, to, user_id, data }
    // Format 2 (DB governance): { template_key, user_id, variables }
    // Format 3 (pre-rendered):  { to, subject, html }  ← used by DB triggers via pg_net
    const type = body.type || body.template_key;
    const data = body.data || body.variables || {};
    const user_id = body.user_id || null;
    const replyTo = typeof body.reply_to === 'string' && body.reply_to.trim()
      ? body.reply_to.trim()
      : undefined;
    let to = body.to;

    // If no 'to' email but user_id provided, look up from users table
    if (!to && user_id && supabase) {
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', user_id)
        .single();
      to = userData?.email;
    }

    // Format 3: pre-rendered HTML passed directly (no template lookup needed)
    if (!type && body.html && body.subject && to) {
      console.log('Processing pre-rendered email to=' + to);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + resendApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [to],
          subject: body.subject,
          html: body.html,
          ...(typeof body.text === 'string' && body.text ? { text: body.text } : {}),
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        return new Response(
          JSON.stringify({ success: false, error: result.message || 'Send failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: true, resend_id: result.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!type || !to) {
      throw new Error('Missing required fields: type and to (or user_id for lookup)');
    }

    console.log('Processing email: type=' + type + ', to=' + to);

    // Try to load template from DB
    let subject: string;
    let html: string;
    let text: string | undefined;

    if (supabase) {
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('template_key', type)
        .eq('is_active', true)
        .single();

      if (template) {
        subject = renderTemplate(template.subject, data || {});
        html = renderTemplate(template.html_body, data || {});
        text = template.text_body
          ? renderTemplate(template.text_body, data || {})
          : undefined;
      } else {
        // Fallback template
        subject = 'BDA Portal Notification: ' + type;
        html = '<h2>BDA Portal Notification</h2>' +
          '<p>Email type: <strong>' + type + '</strong></p>' +
          '<p>Data:</p>' +
          '<pre>' + JSON.stringify(data || {}, null, 2) + '</pre>';
        text = subject + '\n\n' + JSON.stringify(data || {}, null, 2);
      }
    } else {
      // No Supabase - use fallback
      subject = 'BDA Portal Notification: ' + type;
      html = '<h2>BDA Portal Notification</h2>' +
        '<p>Email type: <strong>' + type + '</strong></p>' +
        '<p>Data:</p>' +
        '<pre>' + JSON.stringify(data || {}, null, 2) + '</pre>';
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + resendApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: subject,
        html: html,
        ...(text ? { text } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend error:', result);
      return new Response(
        JSON.stringify({ success: false, error: result.message || 'Send failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent: ' + result.id);

    // Log to database (non-blocking - don't fail if table doesn't exist)
    let logId = null;
    if (supabase) {
      try {
        const { data: logData } = await supabase
          .from('email_logs')
          .insert({
            email_type: type,
            recipient_email: to,
            recipient_user_id: user_id || null,
            subject: subject,
            status: 'sent',
            resend_id: result.id,
            template_data: redactSensitiveTemplateData(data),
            sent_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        logId = logData?.id;
      } catch (e) {
        console.warn('Could not log email:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, resend_id: result.id, log_id: logId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
