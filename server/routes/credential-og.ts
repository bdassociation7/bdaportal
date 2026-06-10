/**
 * Credential Open Graph Route
 *
 * Serves a dynamically-generated HTML page for /verify/:credentialId
 * with per-credential Open Graph meta tags so that LinkedIn, Twitter,
 * WhatsApp, and other social crawlers see the correct badge image,
 * title, and description for each credential.
 *
 * Social crawlers do NOT execute JavaScript, so the standard React SPA
 * index.html always shows the generic portal OG tags.  This route
 * intercepts those paths before the catch-all SPA handler and returns
 * the built index.html with the static OG block replaced by dynamic tags.
 */

import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Constants ────────────────────────────────────────────────────────────────

const BADGE_IMAGES: Record<string, string> = {
  CP:  'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/JWEReraWERkmYSXF.webp',
  SCP: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/GVlzJwKvVJdFlVUb.webp',
};
const DEFAULT_BADGE =
  'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/tafPwwNyeykiwJHy.webp';

const PORTAL_BASE_URL =
  process.env.VITE_PORTAL_BASE_URL || 'https://portal.bda-global.org';

// Path to the built SPA — relative to the compiled server bundle location
// In production: dist/server/node-build.mjs → dist/spa/index.html
const SPA_INDEX = path.resolve(
  process.cwd(),
  'dist',
  'spa',
  'index.html',
);

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

// ─── Route handler ────────────────────────────────────────────────────────────

export async function handleCredentialOG(req: Request, res: Response) {
  const credentialId = (req.params.credentialId || '').trim().toUpperCase();

  if (!credentialId) {
    return res.redirect('/verify');
  }

  // ── Fetch credential data ─────────────────────────────────────────────────
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

  // ── Read base index.html ──────────────────────────────────────────────────
  let baseHtml: string;
  try {
    baseHtml = fs.readFileSync(SPA_INDEX, 'utf-8');
  } catch (_) {
    // Minimal fallback shell (should never happen in production)
    baseHtml = `<!doctype html><html lang="en"><head><meta charset="UTF-8"/>` +
      `<meta name="viewport" content="width=device-width,initial-scale=1"/>` +
      `</head><body><div id="root"></div>` +
      `<script type="module" src="/client/App.tsx"></script></body></html>`;
  }

  // ── Inject dynamic OG tags ────────────────────────────────────────────────
  const dynamicTags = [
    `  <title>${ogTitle} | BDA® Certification Portal</title>`,
    `  <meta name="description" content="${ogDescription}" />`,
    `  <link rel="canonical" href="${canonicalUrl}" />`,
    `  <!-- Open Graph / Social Media -->`,
    `  <meta property="og:type" content="profile" />`,
    `  <meta property="og:url" content="${canonicalUrl}" />`,
    `  <meta property="og:title" content="${ogTitle}" />`,
    `  <meta property="og:description" content="${ogDescription}" />`,
    `  <meta property="og:image" content="${badgeImage}" />`,
    `  <meta property="og:image:width" content="400" />`,
    `  <meta property="og:image:height" content="400" />`,
    `  <meta property="og:site_name" content="BDA® Certification Portal" />`,
    `  <!-- Twitter Card -->`,
    `  <meta name="twitter:card" content="summary" />`,
    `  <meta name="twitter:title" content="${ogTitle}" />`,
    `  <meta name="twitter:description" content="${ogDescription}" />`,
    `  <meta name="twitter:image" content="${badgeImage}" />`,
    `  <meta name="robots" content="index, follow" />`,
  ].join('\n');

  // Strip the static OG block from index.html and inject dynamic tags
  const injected = baseHtml
    // Remove static <title>
    .replace(/<title>[^<]*<\/title>/, '')
    // Remove static description meta
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    // Remove the static OG comment + all OG meta tags that follow it
    .replace(/[ \t]*<!-- Open Graph[^>]*-->[\s\S]*?(?=\n[ \t]*<(?!meta\s+property="og:))/i, '')
    // Inject just before </head>
    .replace('</head>', `${dynamicTags}\n  </head>`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cache for 5 minutes — crawlers will re-check periodically
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.send(injected);
}
