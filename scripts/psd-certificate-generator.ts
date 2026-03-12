/**
 * PSD-Based Certificate Generator
 *
 * Generates professional PDF certificates using PSD templates
 * Uses ImageMagick to render PSD, then overlays dynamic text
 *
 * Usage: npx tsx scripts/psd-certificate-generator.ts [credential_id]
 *        npx tsx scripts/psd-certificate-generator.ts --test
 */

import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Template paths
const TEMPLATES_DIR = path.join(process.cwd(), '..', 'certificates-design');
const CP_TEMPLATE = path.join(TEMPLATES_DIR, 'BDA-CP-portal.psd');
const SCP_TEMPLATE = path.join(TEMPLATES_DIR, 'BDA-SCP-portal.psd');

// Output directory
const OUTPUT_DIR = path.join(process.cwd(), 'certificates');

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
  exam_title: string | null;
  exam_score: number | null;
  exam_date: string | null;
}

// PSD Dimensions: 3508 x 2480 (A4 landscape at 300 DPI)
const PSD_WIDTH = 3508;
const PSD_HEIGHT = 2480;

// Position configuration for dynamic text (based on PSD analysis)
interface TextPosition {
  x: number;
  y: number;
  fontSize: number;
  fontWeight: string;
  color: string;
  textAlign: 'center' | 'left' | 'right';
  fontFamily: string;
  letterSpacing?: number;
  maxWidth?: number;
}

// Text positions calibrated from PSD layer analysis
// PSD: 3508x2480, blue sidebar ~33% width (~1170px), content area starts after
const TEXT_POSITIONS: Record<string, TextPosition> = {
  // Holder name - left-aligned with "Hereby Certifies that" text
  holderName: {
    x: 1540,  // Left edge aligned with "Hereby Certifies that"
    y: 760,   // Below "Hereby Certifies that"
    fontSize: 92,  // Slightly reduced for better fit
    fontWeight: '700',
    color: '#1c4a8b',
    textAlign: 'left',  // Left-aligned to match "Hereby" above
    fontFamily: "'Hind Madurai', sans-serif",
    maxWidth: 1700,
  },
  // Credential ID value - below "Certification ID" label (moved up)
  credentialId: {
    x: 2302,
    y: 1845,  // Moved up just a bit
    fontSize: 44,
    fontWeight: '600',
    color: '#1c4a8b',
    textAlign: 'center',
    fontFamily: "'Hind Madurai', sans-serif",
    letterSpacing: 1,
  },
  // Issue date - below "Certified Since" label (moved up)
  issueDate: {
    x: 2818,
    y: 1845,  // Moved up just a bit
    fontSize: 44,
    fontWeight: '600',
    color: '#1c4a8b',
    textAlign: 'center',
    fontFamily: "'Hind Madurai', sans-serif",
  },
};

// ============================================================================
// Get Certificate Data from Database
// ============================================================================

async function getCertificateData(credentialId: string): Promise<CertificateData | null> {
  const { data, error } = await supabase.rpc('get_certificate_details', {
    p_credential_id: credentialId,
  });

  if (error) {
    console.error('❌ Error fetching certificate:', error.message);
    return null;
  }

  if (!data || data.length === 0) {
    console.error('❌ Certificate not found:', credentialId);
    return null;
  }

  return data[0] as CertificateData;
}

// ============================================================================
// Convert PSD to PNG using ImageMagick
// ============================================================================

function psdToPng(psdPath: string, pngPath: string): boolean {
  try {
    console.log('  🖼️  Converting PSD to PNG using ImageMagick...');

    // Use ImageMagick convert command
    // [0] selects the flattened/composite layer (not individual layers)
    execSync(`convert "${psdPath}[0]" -strip "${pngPath}"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
    });

    if (fs.existsSync(pngPath)) {
      const stats = fs.statSync(pngPath);
      console.log(`  ✅ PNG created: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      return true;
    }

    return false;
  } catch (error: any) {
    console.error('❌ ImageMagick conversion failed:', error.message);
    return false;
  }
}

// Get or create cached PNG from PSD
function getCachedPng(psdPath: string): string | null {
  // Create cache directory
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const psdName = path.basename(psdPath, '.psd');
  const pngPath = path.join(CACHE_DIR, `${psdName}.png`);

  // Check if PNG exists and is newer than PSD
  if (fs.existsSync(pngPath)) {
    const psdStats = fs.statSync(psdPath);
    const pngStats = fs.statSync(pngPath);

    if (pngStats.mtime > psdStats.mtime) {
      console.log('  📦 Using cached PNG...');
      return pngPath;
    }
  }

  // Convert PSD to PNG
  if (psdToPng(psdPath, pngPath)) {
    return pngPath;
  }

  return null;
}

// ============================================================================
// Generate Certificate HTML
// ============================================================================

function generateCertificateHTML(data: CertificateData, backgroundPngPath: string): string {
  // Format as "Month Year" (e.g., "January 2026")
  const issuedDate = new Date(data.issued_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  // Read PNG as base64
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
    @page {
      size: ${PSD_WIDTH}px ${PSD_HEIGHT}px;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      width: ${PSD_WIDTH}px;
      height: ${PSD_HEIGHT}px;
      position: relative;
      font-family: 'Hind Madurai', sans-serif;
      overflow: hidden;
    }

    .background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
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

  <!-- Dynamic text overlays -->
  <div class="text-overlay holder-name">${escapeHtml(data.user_full_name)}</div>
  <div class="text-overlay credential-id">${escapeHtml(data.credential_id)}</div>
  <div class="text-overlay issue-date">${issuedDate}</div>
</body>
</html>
  `.trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// Generate PDF from HTML using Puppeteer
// ============================================================================

async function generatePDFFromHTML(html: string, outputPath: string): Promise<boolean> {
  try {
    console.log('  🌐 Launching browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();

    // Set viewport to match PSD dimensions
    await page.setViewport({
      width: PSD_WIDTH,
      height: PSD_HEIGHT,
      deviceScaleFactor: 1,
    });

    console.log('  📝 Loading certificate HTML...');
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('  🖨️  Generating PDF...');
    await page.pdf({
      path: outputPath,
      width: `${PSD_WIDTH}px`,
      height: `${PSD_HEIGHT}px`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    console.log(`  ✅ PDF saved: ${outputPath}`);

    // Save HTML for debugging
    const htmlPath = outputPath.replace('.pdf', '.html');
    fs.writeFileSync(htmlPath, html);

    return true;
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    return false;
  }
}

// ============================================================================
// Upload Certificate to Supabase Storage
// ============================================================================

async function uploadCertificate(credentialId: string, filePath: string): Promise<string | null> {
  try {
    const fileName = `${credentialId}.pdf`;
    const fileBuffer = fs.readFileSync(filePath);

    console.log(`  📤 Uploading to storage...`);

    const { error } = await supabase.storage
      .from('certificates')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      console.error('❌ Upload error:', error.message);
      return null;
    }

    // Update database record
    const { error: updateError } = await supabase
      .from('user_certifications')
      .update({ certificate_url: fileName })
      .eq('credential_id', credentialId);

    if (updateError) {
      console.warn('⚠️  Could not update database:', updateError.message);
    } else {
      console.log('  ✅ Database updated');
    }

    return fileName;
  } catch (error) {
    console.error('❌ Upload failed:', error);
    return null;
  }
}

// ============================================================================
// Main Certificate Generation
// ============================================================================

async function generateCertificate(credentialId: string): Promise<boolean> {
  console.log(`\n🎓 Generating certificate: ${credentialId}\n`);

  // 1. Get certificate data
  console.log('📋 Fetching certificate data...');
  const data = await getCertificateData(credentialId);

  if (!data) {
    return false;
  }

  console.log(`  ✅ Found: ${data.user_full_name} (${data.certification_type})`);

  // 2. Select template
  const templatePath = data.certification_type === 'CP' ? CP_TEMPLATE : SCP_TEMPLATE;

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template not found: ${templatePath}`);
    return false;
  }

  // 3. Convert PSD to PNG (cached)
  const pngPath = getCachedPng(templatePath);
  if (!pngPath) {
    console.error('❌ Failed to convert PSD');
    return false;
  }

  // 4. Generate HTML
  console.log('📝 Generating HTML...');
  const html = generateCertificateHTML(data, pngPath);

  // 5. Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 6. Generate PDF
  const outputPath = path.join(OUTPUT_DIR, `${credentialId}.pdf`);
  const success = await generatePDFFromHTML(html, outputPath);

  if (!success) {
    return false;
  }

  // 7. Upload to storage
  console.log('☁️  Uploading...');
  await uploadCertificate(credentialId, outputPath);

  console.log('\n✅ Certificate complete!\n');
  return true;
}

// ============================================================================
// Generate All Pending Certificates (using RPC for proper data)
// ============================================================================

async function generateAllPending(): Promise<void> {
  console.log('\n🎓 Processing pending certificate generation requests...\n');

  // Use the RPC function that returns full certificate data
  const { data: pendingCerts, error } = await supabase.rpc('get_pending_certificate_generations', {
    p_limit: 50,
  });

  if (error) {
    console.error('❌ Database error:', error.message);
    return;
  }

  if (!pendingCerts || pendingCerts.length === 0) {
    console.log('✅ No pending certificates to generate');
    return;
  }

  console.log(`📋 Found ${pendingCerts.length} pending certificates\n`);

  let success = 0;
  for (const cert of pendingCerts) {
    // Mark as generating
    await supabase.rpc('mark_certificate_generating', {
      p_credential_id: cert.credential_id,
    });

    // Generate the certificate
    if (await generateCertificate(cert.credential_id)) {
      success++;
    }
  }

  console.log(`\n✅ Generated ${success}/${pendingCerts.length} certificates\n`);
}

// ============================================================================
// Test Mode
// ============================================================================

async function testGenerate(): Promise<void> {
  console.log('\n🧪 TEST MODE\n');

  // Test both CP and SCP templates
  const testDataCP: CertificateData = {
    credential_id: 'BDA-CP-2026-A7K2M9',
    user_full_name: 'Mohammed Ahmed Al-Rashidi',
    user_email: 'test@example.com',
    certification_type: 'CP',
    issued_date: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    exam_title: 'BDA-CP Certification Exam',
    exam_score: 85,
    exam_date: new Date().toISOString(),
  };

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate CP certificate
  console.log('📄 Generating CP certificate...');
  if (fs.existsSync(CP_TEMPLATE)) {
    const cpPngPath = getCachedPng(CP_TEMPLATE);
    if (cpPngPath) {
      const cpHtml = generateCertificateHTML(testDataCP, cpPngPath);
      const cpOutputPath = path.join(OUTPUT_DIR, `${testDataCP.credential_id}.pdf`);
      await generatePDFFromHTML(cpHtml, cpOutputPath);
      console.log(`✅ CP certificate: ${cpOutputPath}\n`);
    }
  }

  // Test SCP template
  const testDataSCP: CertificateData = {
    credential_id: 'BDA-SCP-2026-X9P3L7',
    user_full_name: 'Sarah Johnson Williams',
    user_email: 'sarah@example.com',
    certification_type: 'SCP',
    issued_date: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    exam_title: 'BDA-SCP Certification Exam',
    exam_score: 92,
    exam_date: new Date().toISOString(),
  };

  // Generate SCP certificate
  console.log('📄 Generating SCP certificate...');
  if (fs.existsSync(SCP_TEMPLATE)) {
    const scpPngPath = getCachedPng(SCP_TEMPLATE);
    if (scpPngPath) {
      const scpHtml = generateCertificateHTML(testDataSCP, scpPngPath);
      const scpOutputPath = path.join(OUTPUT_DIR, `${testDataSCP.credential_id}.pdf`);
      await generatePDFFromHTML(scpHtml, scpOutputPath);
      console.log(`✅ SCP certificate: ${scpOutputPath}\n`);
    }
  }

  console.log('🎉 Test generation complete!\n');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const arg = process.argv[2];

  if (arg === '--test') {
    await testGenerate();
  } else if (arg) {
    await generateCertificate(arg);
  } else {
    await generateAllPending();
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
