/**
 * Certificate Service
 *
 * Service layer for certificate management
 */

import { supabase } from '@/lib/supabase';
import type {
  Certificate,
  CertificateResponse,
  CertificateListResponse,
  CertificateDetailsResponse,
  CertificateVerificationResponse,
  CertificateSearchResponse,
  BooleanResponse,
  UserCertificate,
  CertificateDetails,
  CertificateVerification,
  CertificateSearchResult,
} from './certificate.types';

// ============================================================================
// Get User Certificates
// ============================================================================

export async function getUserCertificates(
  userId: string
): Promise<CertificateListResponse> {
  try {
    const { data, error } = await supabase.rpc('get_user_certificates', {
      p_user_id: userId,
    });

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }

    return {
      data: data as UserCertificate[],
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// ============================================================================
// Get Certificate Details
// ============================================================================

export async function getCertificateDetails(
  credentialId: string
): Promise<CertificateDetailsResponse> {
  try {
    const { data, error } = await supabase.rpc('get_certificate_details', {
      p_credential_id: credentialId,
    });

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }

    if (!data || data.length === 0) {
      return {
        data: null,
        error: {
          message: 'Certificate not found',
          code: 'NOT_FOUND',
        },
      };
    }

    return {
      data: data[0] as CertificateDetails,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// ============================================================================
// Verify Certificate (Public)
// ============================================================================

export async function verifyCertificate(
  credentialId: string
): Promise<CertificateVerificationResponse> {
  try {
    const { data, error } = await supabase.rpc('verify_certificate', {
      p_credential_id: credentialId,
    });

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }

    if (!data || data.length === 0) {
      return {
        data: {
          is_valid: false,
          status: 'not_found',
          holder_name: null,
          certification_type: null,
          issued_date: null,
          expiry_date: null,
          message: 'Certificate not found',
        },
        error: null,
      };
    }

    return {
      data: data[0] as CertificateVerification,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// ============================================================================
// Search Certificates by Name (Public)
// ============================================================================

export async function searchCertificatesByName(
  searchName: string
): Promise<CertificateSearchResponse> {
  try {
    if (!searchName.trim()) {
      return {
        data: null,
        error: {
          message: 'Search name is required',
          code: 'INVALID_INPUT',
        },
      };
    }

    const { data, error } = await supabase.rpc('search_certificates_by_name', {
      p_search_name: searchName.trim(),
    });

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }

    if (!data || data.length === 0) {
      return {
        data: [],
        error: null,
      };
    }

    return {
      data: data as CertificateSearchResult[],
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// ============================================================================
// Get Certificate by ID
// ============================================================================

export async function getCertificateById(
  certificateId: string
): Promise<CertificateResponse> {
  try {
    const { data, error } = await supabase
      .from('user_certifications')
      .select('*')
      .eq('id', certificateId)
      .single();

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }

    return {
      data: data as Certificate,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// ============================================================================
// Get Certificate by Credential ID
// ============================================================================

export async function getCertificateByCredentialId(
  credentialId: string
): Promise<CertificateResponse> {
  try {
    const { data, error } = await supabase
      .from('user_certifications')
      .select('*')
      .eq('credential_id', credentialId)
      .single();

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }

    return {
      data: data as Certificate,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// ============================================================================
// Update Certificate URL
// ============================================================================

export async function updateCertificateUrl(
  credentialId: string,
  certificateUrl: string
): Promise<BooleanResponse> {
  try {
    const { data, error } = await supabase.rpc('update_certificate_url', {
      p_credential_id: credentialId,
      p_certificate_url: certificateUrl,
    });

    if (error) {
      return {
        data: false,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }

    return {
      data: data as boolean,
      error: null,
    };
  } catch (error) {
    return {
      data: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// ============================================================================
// Download Certificate PDF
// ============================================================================

export async function downloadCertificatePDF(
  certificateUrl: string,
  credentialId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = certificateUrl;
    link.download = `Certificate-${credentialId}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed',
    };
  }
}

// ============================================================================
// Get Certificate Public URL
// ============================================================================

export function getCertificatePublicUrl(filePath: string): string {
  const { data } = supabase.storage.from('certificates').getPublicUrl(filePath);
  return data.publicUrl;
}

// ============================================================================
// Get Certificate Download URL
// ============================================================================

export async function getCertificateDownloadUrl(
  filePath: string,
  expiresIn: number = 60
): Promise<{ data: { signedUrl: string } | null; error: any }> {
  try {
    const { data, error } = await supabase.storage
      .from('certificates')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ============================================================================
// Get Expiring Certificates
// ============================================================================

export async function getExpiringCertificates(
  userId: string,
  daysThreshold: number = 60
): Promise<CertificateListResponse> {
  try {
    const { data: certificates, error } = await supabase.rpc(
      'get_user_certificates',
      {
        p_user_id: userId,
      }
    );

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }

    // Filter for expiring certificates
    const expiring = (certificates as UserCertificate[]).filter(
      (cert) => cert.is_expiring_soon
    );

    return {
      data: expiring,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// ============================================================================
// Get Active Certificates
// ============================================================================

export async function getActiveCertificates(
  userId: string
): Promise<CertificateListResponse> {
  try {
    const { data: certificates, error } = await supabase.rpc(
      'get_user_certificates',
      {
        p_user_id: userId,
      }
    );

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }

    // Filter for active certificates
    const active = (certificates as UserCertificate[]).filter(
      (cert) => cert.status === 'active'
    );

    return {
      data: active,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// ============================================================================
// Check if User Has Certificate
// ============================================================================

export async function hasCertificate(
  userId: string,
  certificationType: 'CP' | 'SCP'
): Promise<BooleanResponse> {
  try {
    const { data, error } = await supabase
      .from('user_certifications')
      .select('id')
      .eq('user_id', userId)
      .eq('certification_type', certificationType)
      .eq('status', 'active')
      .limit(1);

    if (error) {
      return {
        data: false,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }

    return {
      data: data.length > 0,
      error: null,
    };
  } catch (error) {
    return {
      data: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
