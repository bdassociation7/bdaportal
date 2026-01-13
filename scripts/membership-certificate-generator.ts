/**
 * Membership Certificate PDF Generator (PSD-based)
 *
 * Generates professional PDF certificates using PSD template
 * Uses ImageMagick to render PSD, then overlays dynamic text
 *
 * Usage: npx tsx scripts/membership-certificate-generator.ts [membership_id]
 *        npx tsx scripts/membership-certificate-generator.ts --test
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

// Template path
const TEMPLATES_DIR = path.join(process.cwd(), '..', 'certificates-design');
const MEMBERSHIP_TEMPLATE = path.join(TEMPLATES_DIR, 'Memberships for portal.psd');

// Output directory
const OUTPUT_DIR = path.join(process.cwd(), 'certificates');

// Cache directory for converted PNGs
const CACHE_DIR = path.join(process.cwd(), 'certificates', '.cache');

// ============================================================================
// Types
// ============================================================================

interface MembershipCertificateData {
  membership_id: string;
  user_full_name: string;
  user_email: string;
  membership_type: 'basic' | 'professional';
  start_date: string;
  expiry_date: string;
  issued_date: string;
}

// PSD Dimensions: 3508 x 2480 (A4 landscape at 300 DPI)
const PSD_WIDTH = 3508;
const PSD_HEIGHT = 2480;

// Position configuration for dynamic text
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

// Text positions from PSD layer analysis (3508x2480)
// Layer[27] "This is to Certify..." at +287+892
// Layer[29] "Membership ID Number" at +281+1859
// Layer[32] blue bar text at +282+2367
const TEXT_POSITIONS: Record<string, TextPosition> = {
  // Member name - below "This is to Certify that the Member" (y=892)
  memberName: {
    x: 287,   // Same x as template text
    y: 1000,  // Below "This is to Certify..." (892 + ~100)
    fontSize: 72,
    fontWeight: '700',
    color: '#000000',  // BLACK per reference
    textAlign: 'left',
    fontFamily: "'Hind Madurai', sans-serif",
    maxWidth: 2500,
  },
  // Membership ID - after "Membership ID Number" label (y=1859)
  // Label at x=281, width=845, ends at x=1126, ID starts right after
  membershipId: {
    x: 1126,
    y: 1859,
    fontSize: 52,  // Match label font size
    fontWeight: '700',
    color: '#000000',
    textAlign: 'left',
    fontFamily: "'Hind Madurai', sans-serif",
  },
  // Issued date - blue bar, after "Issued on" (y=2367)
  // "Issued on" at x=281, width ~220, date starts after colon space
  issuedDate: {
    x: 540,
    y: 2367,
    fontSize: 38,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'left',
    fontFamily: "'Hind Madurai', sans-serif",
  },
  // Expiry date - blue bar, after "Expires on" (y=2365)
  // "Expires on" at x=1266, width ~280, date starts after space
  expiryDate: {
    x: 1580,
    y: 2367,
    fontSize: 38,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'left',
    fontFamily: "'Hind Madurai', sans-serif",
  },
};

// ============================================================================
// Get Membership Data from Database
// ============================================================================

async function getMembershipData(membershipId: string): Promise<MembershipCertificateData | null> {
  const { data, error } = await supabase
    .from('user_memberships')
    .select(`
      id,
      membership_id,
      membership_type,
      start_date,
      expiry_date,
      created_at,
      user:users!user_memberships_user_id_fkey (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('membership_id', membershipId)
    .single();

  if (error) {
    console.error('❌ Error fetching membership:', error.message);
    return null;
  }

  if (!data) {
    console.error('❌ Membership not found:', membershipId);
    return null;
  }

  const user = data.user as any;
  return {
    membership_id: data.membership_id,
    user_full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
    user_email: user.email,
    membership_type: data.membership_type,
    start_date: data.start_date,
    expiry_date: data.expiry_date,
    issued_date: data.start_date,
  };
}

async function getPendingMemberships(): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_memberships')
    .select('membership_id')
    .eq('status', 'active')
    .is('certificate_url', null);

  if (error) {
    console.error('❌ Error fetching pending memberships:', error.message);
    return [];
  }

  return (data || []).map(m => m.membership_id);
}

// ============================================================================
// Convert PSD to PNG using ImageMagick
// ============================================================================

function psdToPng(psdPath: string, pngPath: string): boolean {
  try {
    console.log('  🖼️  Converting PSD to PNG using ImageMagick...');

    // Use ImageMagick convert command with proper CMYK to sRGB conversion
    // [0] selects the flattened/composite layer (not individual layers)
    // Use profile conversion for accurate CMYK to sRGB colors
    execSync(`convert "${psdPath}[0]" -profile /usr/share/color/icc/colord/sRGB.icc "${pngPath}"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
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

  const psdName = path.basename(psdPath, '.psd').replace(/\s+/g, '-');
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

function generateCertificateHTML(data: MembershipCertificateData, backgroundPngPath: string): string {
  // Format as "Month Year" (e.g., "January 2026")
  const issuedDate = new Date(data.issued_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  const expiryDate = new Date(data.expiry_date).toLocaleDateString('en-US', {
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

    .member-name {
      left: ${pos.memberName.x}px;
      top: ${pos.memberName.y}px;
      font-size: ${pos.memberName.fontSize}px;
      font-weight: ${pos.memberName.fontWeight};
      color: ${pos.memberName.color};
      text-align: left;
      font-family: ${pos.memberName.fontFamily};
      max-width: ${pos.memberName.maxWidth}px;
      white-space: normal;
      word-wrap: break-word;
      line-height: 1.2;
    }

    .membership-id {
      left: ${pos.membershipId.x}px;
      top: ${pos.membershipId.y}px;
      font-size: ${pos.membershipId.fontSize}px;
      font-weight: ${pos.membershipId.fontWeight};
      color: ${pos.membershipId.color};
      text-align: left;
      font-family: ${pos.membershipId.fontFamily};
    }

    .issued-date {
      left: ${pos.issuedDate.x}px;
      top: ${pos.issuedDate.y}px;
      font-size: ${pos.issuedDate.fontSize}px;
      font-weight: ${pos.issuedDate.fontWeight};
      color: ${pos.issuedDate.color};
      text-align: left;
      font-family: ${pos.issuedDate.fontFamily};
    }

    .expiry-date {
      left: ${pos.expiryDate.x}px;
      top: ${pos.expiryDate.y}px;
      font-size: ${pos.expiryDate.fontSize}px;
      font-weight: ${pos.expiryDate.fontWeight};
      color: ${pos.expiryDate.color};
      text-align: left;
      font-family: ${pos.expiryDate.fontFamily};
    }
  </style>
</head>
<body>
  <div class="background"></div>

  <!-- Dynamic text overlays -->
  <div class="text-overlay member-name">${escapeHtml(data.user_full_name)}</div>
  <div class="text-overlay membership-id">: ${escapeHtml(data.membership_id)}</div>
  <div class="text-overlay issued-date">${issuedDate}</div>
  <div class="text-overlay expiry-date">${expiryDate}</div>
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

async function uploadCertificate(membershipId: string, filePath: string): Promise<string | null> {
  try {
    const fileName = `${membershipId}.pdf`;
    const fileBuffer = fs.readFileSync(filePath);

    console.log(`  📤 Uploading to storage...`);

    const { error } = await supabase.storage
      .from('membership-certificates')
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
      .from('user_memberships')
      .update({ certificate_url: fileName })
      .eq('membership_id', membershipId);

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

async function generateCertificate(membershipId: string, localOnly: boolean = false): Promise<boolean> {
  console.log(`\n🎫 Generating membership certificate: ${membershipId}\n`);

  // 1. Get membership data
  console.log('📋 Fetching membership data...');
  const data = await getMembershipData(membershipId);

  if (!data) {
    return false;
  }

  console.log(`  ✅ Found: ${data.user_full_name} (${data.membership_type})`);

  // 2. Check template
  if (!fs.existsSync(MEMBERSHIP_TEMPLATE)) {
    console.error(`❌ Template not found: ${MEMBERSHIP_TEMPLATE}`);
    return false;
  }

  // 3. Convert PSD to PNG (cached)
  const pngPath = getCachedPng(MEMBERSHIP_TEMPLATE);
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
  const outputPath = path.join(OUTPUT_DIR, `${membershipId}.pdf`);
  const success = await generatePDFFromHTML(html, outputPath);

  if (!success) {
    return false;
  }

  // 7. Upload to storage (unless local only)
  if (!localOnly) {
    console.log('☁️  Uploading...');
    await uploadCertificate(membershipId, outputPath);
  } else {
    console.log('  📁 Local only - skipping upload');
  }

  console.log('\n✅ Membership certificate complete!\n');
  return true;
}

// ============================================================================
// Test Mode
// ============================================================================

async function testGenerate(): Promise<void> {
  console.log('\n🧪 TEST MODE\n');

  const testData: MembershipCertificateData = {
    membership_id: 'BDA-PM-2026-X7K9M2',
    user_full_name: 'Ahmed Mohammed Al-Rashidi',
    user_email: 'test@example.com',
    membership_type: 'professional',
    start_date: new Date().toISOString(),
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    issued_date: new Date().toISOString(),
  };

  // Check template
  if (!fs.existsSync(MEMBERSHIP_TEMPLATE)) {
    console.error(`❌ Template not found: ${MEMBERSHIP_TEMPLATE}`);
    return;
  }

  console.log(`📄 Template: ${path.basename(MEMBERSHIP_TEMPLATE)}`);

  // Convert PSD
  const pngPath = getCachedPng(MEMBERSHIP_TEMPLATE);
  if (!pngPath) {
    console.error('❌ PSD conversion failed');
    return;
  }

  // Generate HTML
  console.log('📝 Generating HTML...');
  const html = generateCertificateHTML(testData, pngPath);

  // Create output
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate PDF
  const outputPath = path.join(OUTPUT_DIR, `${testData.membership_id}.pdf`);
  await generatePDFFromHTML(html, outputPath);

  console.log(`\n✅ Test certificate: ${outputPath}\n`);
}

// ============================================================================
// Process Pending Memberships
// ============================================================================

async function processPendingMemberships(localOnly: boolean = false): Promise<void> {
  console.log('\n📋 Finding pending membership certificates...\n');

  const pendingIds = await getPendingMemberships();

  if (pendingIds.length === 0) {
    console.log('✅ No pending membership certificates found.\n');
    return;
  }

  console.log(`📌 Found ${pendingIds.length} pending membership certificate(s):\n`);
  pendingIds.forEach(id => console.log(`   - ${id}`));
  console.log('');

  for (const membershipId of pendingIds) {
    await generateCertificate(membershipId, localOnly);
  }

  console.log('\n✅ All pending certificates processed!\n');
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const arg = process.argv[2];

  if (arg === '--test' || arg === '--local') {
    if (arg === '--local') {
      await processPendingMemberships(true);
    } else {
      await testGenerate();
    }
  } else if (arg === '--remote') {
    await processPendingMemberships(false);
  } else if (arg) {
    await generateCertificate(arg);
  } else {
    console.log('Usage:');
    console.log('  npx tsx scripts/membership-certificate-generator.ts [membership_id]');
    console.log('  npx tsx scripts/membership-certificate-generator.ts --test');
    console.log('  npx tsx scripts/membership-certificate-generator.ts --local   # Generate pending, save locally only');
    console.log('  npx tsx scripts/membership-certificate-generator.ts --remote  # Generate pending, upload to storage');
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
