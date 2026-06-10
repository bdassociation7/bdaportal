/**
 * BDA Portal — Credential OG Tags Edge Function
 *
 * URL: /functions/v1/credential-og?id=SCP-2026-0001
 *
 * Returns a lightweight HTML page with per-credential Open Graph meta tags
 * so that LinkedIn, Twitter, WhatsApp, and other social crawlers display
 * the correct badge image, title, and description when a credential URL is
 * shared.
 *
 * Social crawlers do NOT execute JavaScript, so the standard React SPA
 * index.html always shows the generic portal OG tags.  This function
 * intercepts the share URL (via a redirect configured on the hosting side)
 * and returns an HTML shell with the correct OG tags + an immediate JS
 * redirect to the full SPA page.
 *
 * The function is also called directly from the SPA's "Share on LinkedIn"
 * button to generate the shareable URL.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

// ─── CORS ─────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PORTAL_BASE_URL = 'https://portal.bda-global.org';

const BADGE_IMAGES: Record<string, string> = {
  CP:  'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/JWEReraWERkmYSXF.webp',
  SCP: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/GVlzJwKvVJdFlVUb.webp',
};
const DEFAULT_BADGE =
  'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/tafPwwNyeykiwJHy.webp';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCertLabel(certType: string | null): string {
  if (!certType) return 'BDA® Credential';
  if (certType === 'CP')  return 'BDA Certified Professional (BDA-CP™)';
  if (certType === 'SCP') return 'BDA Senior Certified Professional (BDA-SCP™)';
  return `BDA-${certType}™ Credential`;
}

function getBadgeImage(certType: string | null): string {
  if (!certType) return DEFAULT_BADGE;
  return BADGE_IMAGES[certType] || DEFAULT_BADGE;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const credentialId = (url.searchParams.get('id') || '').trim().toUpperCase();

  if (!credentialId) {
    return new Response(
      JSON.stringify({ error: 'Missing credential id. Use ?id=CP-2026-0001' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // ── Fetch credential from Supabase ──────────────────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let holderName: string  = '';
  let certType: string | null = null;
  let isValid             = false;
  let issuedYear          = '';

  try {
    const { data, error } = await supabase.rpc('verify_certificate', {
      p_credential_id: credentialId,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      const cert  = data[0];
      holderName  = cert.holder_name        || '';
      certType    = cert.certification_type || null;
      isValid     = cert.is_valid === true;
      issuedYear  = cert.issued_date
        ? String(new Date(cert.issued_date).getFullYear())
        : '';
    }
  } catch (_) {
    // fall through — use generic tags
  }

  // ── Build OG values ───────────────────────────────────────────────────────
  const certLabel    = getCertLabel(certType);
  const badgeImage   = getBadgeImage(certType);
  const canonicalUrl = `${PORTAL_BASE_URL}/verify/${encodeURIComponent(credentialId)}`;

  let ogTitle: string;
  let ogDescription: string;

  if (isValid && holderName) {
    ogTitle = `${escHtml(certLabel)} — ${escHtml(holderName)}`;
    ogDescription =
      `${escHtml(certLabel)} Credential was issued by Business Development Association (BDA®) to ` +
      `${escHtml(holderName)}${issuedYear ? ` in ${issuedYear}` : ''}. ` +
      `Verify this credential at the BDA® official registry.`;
  } else {
    ogTitle = `BDA® Credential Verification — ${escHtml(credentialId)}`;
    ogDescription =
      `Verify the authenticity of BDA® certification credential ${escHtml(credentialId)} ` +
      `at the official Business Development Association registry.`;
  }

  // ── Return OG HTML shell with JS redirect ─────────────────────────────────
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>${ogTitle} | BDA® Certification Portal</title>
  <meta name="description" content="${ogDescription}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph / Social Media -->
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:title" content="${ogTitle}" />
  <meta property="og:description" content="${ogDescription}" />
  <meta property="og:image" content="${badgeImage}" />
  <meta property="og:image:width" content="400" />
  <meta property="og:image:height" content="400" />
  <meta property="og:site_name" content="BDA® Certification Portal" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${ogTitle}" />
  <meta name="twitter:description" content="${ogDescription}" />
  <meta name="twitter:image" content="${badgeImage}" />

  <!-- SEO -->
  <meta name="robots" content="index, follow" />

  <!-- Redirect real users to the SPA immediately -->
  <meta http-equiv="refresh" content="0; url=${canonicalUrl}" />
  <script>window.location.replace("${canonicalUrl}");</script>
</head>
<body>
  <p>Redirecting to <a href="${canonicalUrl}">${ogTitle}</a>…</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      // Cache 5 minutes — crawlers re-check periodically
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
});
