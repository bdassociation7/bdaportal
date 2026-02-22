/**
 * Certificate Generation API Route
 *
 * Generates PDF certificate on-the-fly and returns it directly
 * POST /api/certificates/generate/:credentialId
 */

import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Template paths (relative to project root)
const TEMPLATES_DIR = path.join(process.cwd(), '..', 'certificates-design');
const CP_TEMPLATE = path.join(TEMPLATES_DIR, 'BDA-CP-portal.psd');
const SCP_TEMPLATE = path.join(TEMPLATES_DIR, 'BDA-SCP-portal.psd');

// Cache directory for converted PNGs
const CACHE_DIR = path.join(process.cwd(), 'certificates', '.cache');

// ============================================================================
// Types
// ============================================================================

interface CertificateData {
  credential_id: string;
  user_full_name: string;
  user_email: string;
  certification_type: 'CP' | 'SCP';
  issued_date: string;
  expiry_date: string;
}

// PSD Dimensions
const PSD_WIDTH = 3508;
const PSD_HEIGHT = 2480;

// Text positions (same as script)
const TEXT_POSITIONS = {
  holderName: {
    x: 1540,
    y: 760,
    fontSize: 92,
    fontWeight: '700',
    color: '#1c4a8b',
    textAlign: 'left' as const,
    fontFamily: "'Hind Madurai', sans-serif",
    maxWidth: 1700,
  },
  credentialId: {
    x: 2302,
    y: 1845,
    fontSize: 44,
    fontWeight: '600',
    color: '#1c4a8b',
    textAlign: 'center' as const,
    fontFamily: "'Hind Madurai', sans-serif",
    letterSpacing: 1,
  },
  issueDate: {
    x: 2818,
    y: 1845,
    fontSize: 44,
    fontWeight: '600',
    color: '#1c4a8b',
    textAlign: 'center' as const,
    fontFamily: "'Hind Madurai', sans-serif",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

async function getCertificateData(credentialId: string): Promise<CertificateData | null> {
  const { data, error } = await supabase.rpc('get_certificate_details', {
    p_credential_id: credentialId,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0] as CertificateData;
}

function psdToPng(psdPath: string, pngPath: string): boolean {
  try {
    execSync(`convert "${psdPath}[0]" -strip "${pngPath}"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    });
    return fs.existsSync(pngPath);
  } catch {
    return false;
  }
}

function getCachedPng(psdPath: string): string | null {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const psdName = path.basename(psdPath, '.psd');
  const pngPath = path.join(CACHE_DIR, `${psdName}.png`);

  if (fs.existsSync(pngPath)) {
    const psdStats = fs.statSync(psdPath);
    const pngStats = fs.statSync(pngPath);
    if (pngStats.mtime > psdStats.mtime) {
      return pngPath;
    }
  }

  return psdToPng(psdPath, pngPath) ? pngPath : null;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateCertificateHTML(data: CertificateData, backgroundPngPath: string): string {
  const issuedDate = new Date(data.issued_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  const pngBuffer = fs.readFileSync(backgroundPngPath);
  const base64Png = pngBuffer.toString('base64');
  const backgroundDataUrl = `data:image/png;base64,${base64Png}`;

  const pos = TEXT_POSITIONS;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Hind+Madurai:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: ${PSD_WIDTH}px ${PSD_HEIGHT}px; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${PSD_WIDTH}px;
      height: ${PSD_HEIGHT}px;
      position: relative;
      font-family: 'Hind Madurai', sans-serif;
      overflow: hidden;
    }
    .background {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background-image: url('${backgroundDataUrl}');
      background-size: cover;
      background-position: center;
      z-index: 0;
    }
    .text-overlay {
      position: absolute;
      z-index: 10;
      white-space: nowrap;
    }
    .holder-name {
      left: ${pos.holderName.x}px;
      top: ${pos.holderName.y}px;
      ${pos.holderName.textAlign === 'center' ? 'transform: translateX(-50%);' : ''}
      font-size: ${pos.holderName.fontSize}px;
      font-weight: ${pos.holderName.fontWeight};
      color: ${pos.holderName.color};
      text-align: ${pos.holderName.textAlign};
      font-family: ${pos.holderName.fontFamily};
      max-width: ${pos.holderName.maxWidth}px;
      white-space: normal;
      word-wrap: break-word;
      line-height: 1.2;
    }
    .credential-id {
      left: ${pos.credentialId.x}px;
      top: ${pos.credentialId.y}px;
      transform: translateX(-50%);
      font-size: ${pos.credentialId.fontSize}px;
      font-weight: ${pos.credentialId.fontWeight};
      color: ${pos.credentialId.color};
      text-align: center;
      font-family: ${pos.credentialId.fontFamily};
      letter-spacing: ${pos.credentialId.letterSpacing || 0}px;
    }
    .issue-date {
      left: ${pos.issueDate.x}px;
      top: ${pos.issueDate.y}px;
      transform: translateX(-50%);
      font-size: ${pos.issueDate.fontSize}px;
      font-weight: ${pos.issueDate.fontWeight};
      color: ${pos.issueDate.color};
      text-align: center;
      font-family: ${pos.issueDate.fontFamily};
    }
  </style>
</head>
<body>
  <div class="background"></div>
  <div class="text-overlay holder-name">${escapeHtml(data.user_full_name)}</div>
  <div class="text-overlay credential-id">${escapeHtml(data.credential_id)}</div>
  <div class="text-overlay issue-date">${issuedDate}</div>
</body>
</html>
  `.trim();
}

async function generatePDFBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: PSD_WIDTH, height: PSD_HEIGHT, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise(resolve => setTimeout(resolve, 500));

  const pdfBuffer = await page.pdf({
    width: `${PSD_WIDTH}px`,
    height: `${PSD_HEIGHT}px`,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}

// ============================================================================
// Route Handler
// ============================================================================

export async function handleGenerateCertificate(req: Request, res: Response) {
  const { credentialId } = req.params;

  if (!credentialId) {
    return res.status(400).json({ error: 'Credential ID required' });
  }

  try {
    // 1. Mark as generating
    await supabase.rpc('mark_certificate_generating', { p_credential_id: credentialId });

    // 2. Get certificate data
    const data = await getCertificateData(credentialId);
    if (!data) {
      await markFailed(credentialId);
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // 3. Get template
    const templatePath = data.certification_type === 'CP' ? CP_TEMPLATE : SCP_TEMPLATE;
    if (!fs.existsSync(templatePath)) {
      await markFailed(credentialId);
      return res.status(500).json({ error: 'Template not found' });
    }

    // 4. Get cached PNG
    const pngPath = getCachedPng(templatePath);
    if (!pngPath) {
      await markFailed(credentialId);
      return res.status(500).json({ error: 'Failed to process template' });
    }

    // 5. Generate HTML and PDF
    const html = generateCertificateHTML(data, pngPath);
    const pdfBuffer = await generatePDFBuffer(html);

    // 6. Upload to Supabase storage
    const fileName = `${credentialId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      await markFailed(credentialId);
      return res.status(500).json({ error: 'Failed to upload certificate' });
    }

    // 7. Mark as completed with URL
    await supabase.rpc('mark_certificate_generated', {
      p_credential_id: credentialId,
      p_certificate_url: fileName,
    });

    return res.json({ success: true, status: 'completed', certificate_url: fileName });

  } catch (error: any) {
    console.error('Certificate generation error:', error);
    await markFailed(credentialId);
    return res.status(500).json({ error: 'Failed to generate certificate' });
  }
}

async function markFailed(credentialId: string) {
  await supabase
    .from('user_certifications')
    .update({ certificate_generation_status: 'failed' })
    .eq('credential_id', credentialId);
}
