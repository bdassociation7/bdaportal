/**
 * BDA Portal - Mailchimp Subscribe Edge Function
 *
 * يُضاف تلقائياً عند تسجيل مستخدم جديد في البورتال
 * يُضيفه لـ Mailchimp Audience "BDA®"
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAILCHIMP_AUDIENCE_ID = 'ece03c5164';
const MAILCHIMP_SERVER = 'us1';

function getMemberHash(email: string): string {
  // MD5 hash of lowercase email (Mailchimp requirement)
  // Using Web Crypto API available in Deno
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase());
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function mapRoleToTag(role: string): string {
  const roleMap: Record<string, string> = {
    individual: 'Individual Member',
    ecp: 'ECP Partner',
    pdp: 'PDP Partner',
    admin: 'Admin',
    super_admin: 'Super Admin',
  };
  return roleMap[role] || 'Portal User';
}

async function md5(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message.toLowerCase());
  const hashBuffer = await crypto.subtle.digest('MD5', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const MAILCHIMP_API_KEY = Deno.env.get('MAILCHIMP_API_KEY');
    if (!MAILCHIMP_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'MAILCHIMP_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { email, first_name, last_name, role, is_active } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compute MD5 hash for Mailchimp member ID
    const memberHash = await md5(email);
    const tag = mapRoleToTag(role || 'individual');

    const mailchimpUrl = `https://${MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members/${memberHash}`;

    const memberData = {
      email_address: email,
      status_if_new: is_active !== false ? 'subscribed' : 'unsubscribed',
      merge_fields: {
        FNAME: first_name || '',
        LNAME: last_name || '',
      },
      tags: [tag, 'BDA Portal'],
    };

    const response = await fetch(mailchimpUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`anystring:${MAILCHIMP_API_KEY}`)}`,
      },
      body: JSON.stringify(memberData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ [Mailchimp] Added/updated: ${email} (${tag})`);
      return new Response(
        JSON.stringify({ success: true, email, status: result.status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Compliance state (unsubscribed/bounced) - not a fatal error
      if (result.title === 'Member In Compliance State') {
        console.warn(`⚠️ [Mailchimp] Compliance state for: ${email}`);
        return new Response(
          JSON.stringify({ success: false, reason: 'compliance_state', email }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.error(`❌ [Mailchimp] Error for ${email}:`, result);
      return new Response(
        JSON.stringify({ success: false, error: result.detail || result.title }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[Mailchimp] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
