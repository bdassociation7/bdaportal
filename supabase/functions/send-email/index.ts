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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    const { type, to, user_id, data } = body;

    if (!type || !to) {
      throw new Error('Missing required fields: type, to');
    }

    console.log('Processing email: type=' + type + ', to=' + to);

    // Try to load template from DB
    let subject: string;
    let html: string;

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
      } else {
        // Fallback template
        subject = 'BDA Portal Notification: ' + type;
        html = '<h2>BDA Portal Notification</h2>' +
          '<p>Email type: <strong>' + type + '</strong></p>' +
          '<p>Data:</p>' +
          '<pre>' + JSON.stringify(data || {}, null, 2) + '</pre>';
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

    // Log to database
    let logId = null;
    if (supabase) {
      const { data: logData } = await supabase
        .from('email_logs')
        .insert({
          email_type: type,
          recipient_email: to,
          recipient_user_id: user_id || null,
          subject: subject,
          status: 'sent',
          resend_id: result.id,
          template_data: data || {},
          sent_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      logId = logData?.id;
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
