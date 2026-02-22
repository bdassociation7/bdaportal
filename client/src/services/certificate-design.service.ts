/**
 * Certificate Design Configuration Service
 *
 * Manages certificate text positions, fonts, and colors
 */

import { supabase } from '@/lib/supabase';

export type CertificateType = 'CP' | 'SCP' | 'MEMBERSHIP';

export interface FieldConfig {
  field_name: string;
  x: number;
  y: number;
  font_size: number;
  font_weight: string;
  color: string;
  max_width: number | null;
  text_align: 'left' | 'center' | 'right';
}

export interface CertificateDesignConfig {
  [fieldName: string]: FieldConfig;
}

// Default configurations (fallback if database is empty)
export const DEFAULT_CONFIGS: Record<CertificateType, CertificateDesignConfig> = {
  CP: {
    holderName: {
      field_name: 'holderName',
      x: 1540,
      y: 820,
      font_size: 92,
      font_weight: 'bold',
      color: '#1c4a8b',
      max_width: 1700,
      text_align: 'left',
    },
    credentialId: {
      field_name: 'credentialId',
      x: 2302,
      y: 1885,
      font_size: 44,
      font_weight: '600',
      color: '#1c4a8b',
      max_width: null,
      text_align: 'center',
    },
    issueDate: {
      field_name: 'issueDate',
      x: 2818,
      y: 1885,
      font_size: 44,
      font_weight: '600',
      color: '#1c4a8b',
      max_width: null,
      text_align: 'center',
    },
  },
  SCP: {
    holderName: {
      field_name: 'holderName',
      x: 1540,
      y: 820,
      font_size: 92,
      font_weight: 'bold',
      color: '#1c4a8b',
      max_width: 1700,
      text_align: 'left',
    },
    credentialId: {
      field_name: 'credentialId',
      x: 2302,
      y: 1885,
      font_size: 44,
      font_weight: '600',
      color: '#1c4a8b',
      max_width: null,
      text_align: 'center',
    },
    issueDate: {
      field_name: 'issueDate',
      x: 2818,
      y: 1885,
      font_size: 44,
      font_weight: '600',
      color: '#1c4a8b',
      max_width: null,
      text_align: 'center',
    },
  },
  MEMBERSHIP: {
    holderName: {
      field_name: 'holderName',
      x: 290,
      y: 1050,
      font_size: 72,
      font_weight: 'bold',
      color: '#1c4a8b',
      max_width: 2000,
      text_align: 'left',
    },
    membershipId: {
      field_name: 'membershipId',
      x: 1200,
      y: 1875,
      font_size: 48,
      font_weight: '600',
      color: '#1c4a8b',
      max_width: null,
      text_align: 'left',
    },
    issuedDate: {
      field_name: 'issuedDate',
      x: 550,
      y: 2375,
      font_size: 36,
      font_weight: '600',
      color: '#ffffff',
      max_width: null,
      text_align: 'left',
    },
    expiryDate: {
      field_name: 'expiryDate',
      x: 1550,
      y: 2375,
      font_size: 36,
      font_weight: '600',
      color: '#ffffff',
      max_width: null,
      text_align: 'left',
    },
  },
};

// Field labels for UI
export const FIELD_LABELS: Record<string, string> = {
  holderName: 'Holder Name',
  credentialId: 'Credential ID',
  issueDate: 'Issue Date',
  membershipId: 'Membership ID',
  issuedDate: 'Issued Date',
  expiryDate: 'Expiry Date',
};

// Sample data for preview
export const SAMPLE_DATA: Record<CertificateType, Record<string, string>> = {
  CP: {
    holderName: 'Mohammed Ahmed Al-Rashidi',
    credentialId: 'BDA-CP-2026-A7K2M9',
    issueDate: 'January 2026',
  },
  SCP: {
    holderName: 'Sarah Elizabeth Johnson-Williams',
    credentialId: 'BDA-SCP-2026-X9P3L7',
    issueDate: 'January 2026',
  },
  MEMBERSHIP: {
    holderName: 'Jean-Pierre Dubois-Martin',
    membershipId: 'BDA-MEM-2026-001',
    issuedDate: 'Jan 15, 2026',
    expiryDate: 'Jan 15, 2027',
  },
};

// Template URLs
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const TEMPLATE_BUCKET = 'certificate-templates';

export const TEMPLATE_URLS: Record<CertificateType, string> = {
  CP: `${SUPABASE_URL}/storage/v1/object/public/${TEMPLATE_BUCKET}/BDA-CP-portal.png`,
  SCP: `${SUPABASE_URL}/storage/v1/object/public/${TEMPLATE_BUCKET}/BDA-SCP-portal.png`,
  MEMBERSHIP: `${SUPABASE_URL}/storage/v1/object/public/${TEMPLATE_BUCKET}/Memberships-portal.png`,
};

// Canvas dimensions
export const CANVAS_WIDTH = 3508;
export const CANVAS_HEIGHT = 2480;

/**
 * Fetch certificate design config from database
 * Uses direct table query instead of RPC to avoid schema cache issues
 */
export async function getCertificateDesignConfig(
  certificateType: CertificateType
): Promise<CertificateDesignConfig> {
  try {
    const { data, error } = await supabase
      .from('certificate_design_config')
      .select('field_name, x, y, font_size, font_weight, color, max_width, text_align')
      .eq('certificate_type', certificateType);

    if (error) {
      console.warn('Error fetching certificate design config, using defaults:', error.message);
      return DEFAULT_CONFIGS[certificateType];
    }

    if (!data || data.length === 0) {
      return DEFAULT_CONFIGS[certificateType];
    }

    // Convert array to object keyed by field_name
    const config: CertificateDesignConfig = {};
    for (const field of data) {
      config[field.field_name] = field as FieldConfig;
    }

    return config;
  } catch (error) {
    console.error('Error fetching certificate design config:', error);
    return DEFAULT_CONFIGS[certificateType];
  }
}

/**
 * Save a single field configuration
 * Uses upsert with direct table query instead of RPC to avoid schema cache issues
 */
export async function saveFieldConfig(
  certificateType: CertificateType,
  fieldConfig: FieldConfig
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('certificate_design_config')
      .upsert(
        {
          certificate_type: certificateType,
          field_name: fieldConfig.field_name,
          x: fieldConfig.x,
          y: fieldConfig.y,
          font_size: fieldConfig.font_size,
          font_weight: fieldConfig.font_weight,
          color: fieldConfig.color,
          max_width: fieldConfig.max_width,
          text_align: fieldConfig.text_align,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'certificate_type,field_name' }
      );

    if (error) {
      console.error('Error saving field config:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving field config:', error);
    return false;
  }
}

/**
 * Save all field configurations for a certificate type
 */
export async function saveAllFieldConfigs(
  certificateType: CertificateType,
  config: CertificateDesignConfig
): Promise<boolean> {
  try {
    const promises = Object.values(config).map((fieldConfig) =>
      saveFieldConfig(certificateType, fieldConfig)
    );

    const results = await Promise.all(promises);
    return results.every((result) => result === true);
  } catch (error) {
    console.error('Error saving all field configs:', error);
    return false;
  }
}

/**
 * Reset to default configuration
 */
export async function resetToDefault(certificateType: CertificateType): Promise<boolean> {
  return saveAllFieldConfigs(certificateType, DEFAULT_CONFIGS[certificateType]);
}
