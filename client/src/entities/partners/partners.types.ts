/**
 * Partner Management Types
 * ECP and PDP partner management (subset of users with partner roles)
 */

export type PartnerType = 'ecp' | 'pdp' | 'dual_partner';

export interface Partner {
  id: string;
  partner_type: PartnerType;
  company_name: string;
  company_name_ar?: string | null;
  contact_person: string;
  contact_email: string;
  contact_phone?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
  description_ar?: string | null;
  license_number?: string | null;
  license_valid_from?: string | null;
  license_valid_until?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface PartnerFilters {
  partner_type?: PartnerType;
  is_active?: boolean;
  search?: string;
  country?: string;
}

export interface UpdatePartnerDTO {
  company_name?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  country?: string;
  city?: string;
  address?: string;
  website?: string;
  industry?: string;
  description?: string;
  is_active?: boolean;
}

export interface PartnerStats {
  total_partners: number;
  active_partners: number;
  ecp_partners: number;
  pdp_partners: number;
  dual_partners: number;
  profile_completion_rate: number;
  new_partners_this_month: number;
}

export interface PartnerResult<T> {
  data: T | null;
  error: Error | null;
}
