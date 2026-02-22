/**
 * Client-side Certificate PDF Generator
 *
 * Generates certificate PDFs directly in the browser using:
 * - PNG template backgrounds from Supabase Storage
 * - Canvas for text overlay
 * - jsPDF for PDF generation
 * - Database-driven configuration from certificate_design_config table
 */

import { jsPDF } from 'jspdf';
import { supabase } from '@/lib/supabase';
import {
  getCertificateDesignConfig,
  CertificateDesignConfig,
  DEFAULT_CONFIGS,
  CertificateType,
} from './certificate-design.service';

// ============================================================================
// Types
// ============================================================================

export interface CertificateData {
  credential_id: string;
  user_full_name: string;
  certification_type: 'CP' | 'SCP';
  issued_date: string;
}

export interface MembershipCertificateData {
  membership_id: string;
  user_full_name: string;
  membership_type: 'professional';
  start_date: string;
  end_date: string;
}

// ============================================================================
// Constants
// ============================================================================

const PSD_WIDTH = 3508;
const PSD_HEIGHT = 2480;

// Template paths in public Supabase Storage bucket
const TEMPLATE_BUCKET = 'certificate-templates';
const TEMPLATES = {
  CP: 'BDA-CP-portal.png',
  SCP: 'BDA-SCP-portal.png',
  MEMBERSHIP: 'Memberships-portal.png',
};

// Cache for loaded configurations
const configCache: Map<CertificateType, CertificateDesignConfig> = new Map();

/**
 * Get certificate design config (from database or cache)
 */
async function getConfig(certificateType: CertificateType): Promise<CertificateDesignConfig> {
  // Check cache first
  if (configCache.has(certificateType)) {
    return configCache.get(certificateType)!;
  }

  // Fetch from database
  const config = await getCertificateDesignConfig(certificateType);
  configCache.set(certificateType, config);
  return config;
}

/**
 * Clear config cache (call after admin updates design)
 */
export function clearConfigCache(): void {
  configCache.clear();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load image from URL and return as HTMLImageElement
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Format date as "Month Year" (e.g., "January 2026")
 */
function formatIssueDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });
}

/**
 * Load the Google Font before rendering
 */
async function loadFont(): Promise<void> {
  // Check if font stylesheet is already added
  const fontLinkId = 'hind-madurai-font';
  if (!document.getElementById(fontLinkId)) {
    const link = document.createElement('link');
    link.id = fontLinkId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Hind+Madurai:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }

  // Force font loading by creating test elements with all weights
  const weights = ['400', '500', '600', '700'];
  const testElements: HTMLSpanElement[] = [];

  for (const weight of weights) {
    const el = document.createElement('span');
    el.style.fontFamily = '"Hind Madurai", sans-serif';
    el.style.fontWeight = weight;
    el.style.fontSize = '92px';
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    el.style.visibility = 'hidden';
    el.textContent = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    document.body.appendChild(el);
    testElements.push(el);
  }

  // Wait for all fonts to load
  await document.fonts.ready;

  // Additional wait to ensure fonts are fully rendered
  await new Promise(resolve => setTimeout(resolve, 100));

  // Clean up test elements
  testElements.forEach(el => document.body.removeChild(el));
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate certificate PDF in browser
 */
export async function generateCertificatePDF(data: CertificateData): Promise<Blob> {
  // 1. Load font and config in parallel
  const [, config] = await Promise.all([
    loadFont(),
    getConfig(data.certification_type),
  ]);

  // 2. Get template public URL from Supabase Storage
  const templatePath = TEMPLATES[data.certification_type];
  const { data: urlData } = supabase.storage
    .from(TEMPLATE_BUCKET)
    .getPublicUrl(templatePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get template URL');
  }

  // 3. Load template image
  const templateImg = await loadImage(urlData.publicUrl);

  // 4. Create canvas and draw
  const canvas = document.createElement('canvas');
  canvas.width = PSD_WIDTH;
  canvas.height = PSD_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  // 5. Draw background
  ctx.drawImage(templateImg, 0, 0, PSD_WIDTH, PSD_HEIGHT);

  // 6. Draw holder name (from database config)
  const nameConfig = config.holderName;
  ctx.fillStyle = nameConfig.color;
  ctx.font = `${nameConfig.font_weight} ${nameConfig.font_size}px "Hind Madurai", sans-serif`;
  ctx.textAlign = nameConfig.text_align as CanvasTextAlign;
  ctx.textBaseline = 'top';

  // Handle long names - simple text wrapping
  const words = data.user_full_name.split(' ');
  let line = '';
  let y = nameConfig.y;
  const lineHeight = nameConfig.font_size * 1.2;
  const maxWidth = nameConfig.max_width || 1700;

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, nameConfig.x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, nameConfig.x, y);

  // 7. Draw credential ID (from database config)
  const idConfig = config.credentialId;
  ctx.fillStyle = idConfig.color;
  ctx.font = `${idConfig.font_weight} ${idConfig.font_size}px "Hind Madurai", sans-serif`;
  ctx.textAlign = idConfig.text_align as CanvasTextAlign;
  ctx.textBaseline = 'top';
  ctx.fillText(data.credential_id, idConfig.x, idConfig.y);

  // 8. Draw issue date (from database config)
  const dateConfig = config.issueDate;
  ctx.fillStyle = dateConfig.color;
  ctx.font = `${dateConfig.font_weight} ${dateConfig.font_size}px "Hind Madurai", sans-serif`;
  ctx.textAlign = dateConfig.text_align as CanvasTextAlign;
  ctx.textBaseline = 'top';
  ctx.fillText(formatIssueDate(data.issued_date), dateConfig.x, dateConfig.y);

  // 9. Convert canvas to image data
  const imgData = canvas.toDataURL('image/png', 1.0);

  // 10. Create PDF (landscape A4-ish dimensions matching the PSD ratio)
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [PSD_WIDTH, PSD_HEIGHT],
    hotfixes: ['px_scaling'],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, PSD_WIDTH, PSD_HEIGHT);

  // 11. Return as blob
  return pdf.output('blob');
}

/**
 * Generate and download certificate
 */
export async function downloadCertificate(data: CertificateData): Promise<void> {
  const blob = await generateCertificatePDF(data);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Certificate-${data.credential_id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Membership Certificate Generator
// ============================================================================

/**
 * Format date for membership certificate (e.g., "Jan 2026")
 */
function formatMembershipDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Generate membership certificate PDF in browser
 */
export async function generateMembershipCertificatePDF(data: MembershipCertificateData): Promise<Blob> {
  // 1. Load font and config in parallel
  const [, config] = await Promise.all([
    loadFont(),
    getConfig('MEMBERSHIP'),
  ]);

  // 2. Get template public URL
  const { data: urlData } = supabase.storage
    .from(TEMPLATE_BUCKET)
    .getPublicUrl(TEMPLATES.MEMBERSHIP);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get membership template URL');
  }

  // 3. Load template image
  const templateImg = await loadImage(urlData.publicUrl);

  // 4. Create canvas and draw
  const canvas = document.createElement('canvas');
  canvas.width = PSD_WIDTH;
  canvas.height = PSD_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  // 5. Draw background
  ctx.drawImage(templateImg, 0, 0, PSD_WIDTH, PSD_HEIGHT);

  // 6. Draw holder name (from database config)
  const nameConfig = config.holderName;
  ctx.fillStyle = nameConfig.color;
  ctx.font = `${nameConfig.font_weight} ${nameConfig.font_size}px "Hind Madurai", sans-serif`;
  ctx.textAlign = nameConfig.text_align as CanvasTextAlign;
  ctx.textBaseline = 'top';

  // Handle long names - simple text wrapping
  const words = data.user_full_name.split(' ');
  let line = '';
  let y = nameConfig.y;
  const lineHeight = nameConfig.font_size * 1.2;
  const maxWidth = nameConfig.max_width || 2000;

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, nameConfig.x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, nameConfig.x, y);

  // 7. Draw membership ID (from database config)
  const idConfig = config.membershipId;
  ctx.fillStyle = idConfig.color;
  ctx.font = `${idConfig.font_weight} ${idConfig.font_size}px "Hind Madurai", sans-serif`;
  ctx.textAlign = idConfig.text_align as CanvasTextAlign;
  ctx.textBaseline = 'top';
  ctx.fillText(data.membership_id, idConfig.x, idConfig.y);

  // 8. Draw issued date (from database config)
  const issuedConfig = config.issuedDate;
  ctx.fillStyle = issuedConfig.color;
  ctx.font = `${issuedConfig.font_weight} ${issuedConfig.font_size}px "Hind Madurai", sans-serif`;
  ctx.textAlign = issuedConfig.text_align as CanvasTextAlign;
  ctx.textBaseline = 'top';
  ctx.fillText(formatMembershipDate(data.start_date), issuedConfig.x, issuedConfig.y);

  // 9. Draw expiry date (from database config)
  const expiryConfig = config.expiryDate;
  ctx.fillStyle = expiryConfig.color;
  ctx.font = `${expiryConfig.font_weight} ${expiryConfig.font_size}px "Hind Madurai", sans-serif`;
  ctx.textAlign = expiryConfig.text_align as CanvasTextAlign;
  ctx.textBaseline = 'top';
  ctx.fillText(formatMembershipDate(data.end_date), expiryConfig.x, expiryConfig.y);

  // 10. Convert canvas to image data
  const imgData = canvas.toDataURL('image/png', 1.0);

  // 11. Create PDF
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [PSD_WIDTH, PSD_HEIGHT],
    hotfixes: ['px_scaling'],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, PSD_WIDTH, PSD_HEIGHT);

  // 12. Return as blob
  return pdf.output('blob');
}

/**
 * Generate and download membership certificate
 */
export async function downloadMembershipCertificate(data: MembershipCertificateData): Promise<void> {
  const blob = await generateMembershipCertificatePDF(data);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Membership-Certificate-${data.membership_id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
