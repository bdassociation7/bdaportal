/**
 * Voucher Display Utilities
 * Centralized logic for voucher status display and filtering
 */

import type {
  ExamVoucher,
  ExamVoucherWithQuiz,
  CertificationType,
  ExamLanguage,
  VoucherStatus
} from './quiz.types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Display information for a voucher
 */
export interface VoucherDisplayInfo {
  status: 'active' | 'used' | 'expired' | 'cancelled';
  statusLabel: string;
  statusColor: string;
  sourceLabel: string;
  canUse: boolean;
}

/**
 * Unified voucher format combining direct and ECP vouchers
 */
export interface MergedVoucher {
  id: string;
  code: string;
  certification_type: CertificationType;
  exam_language: ExamLanguage;
  quiz_id: string | null;
  expires_at: string | null;
  status: VoucherStatus;
  source: 'direct' | 'ecp';
  displayInfo: VoucherDisplayInfo;
  /** Original raw data */
  _raw: ExamVoucherWithQuiz | ECPVoucherRaw;
}

/**
 * Raw ECP voucher data from service
 */
export interface ECPVoucherRaw {
  id: string;
  code: string;
  certification_type: CertificationType;
  exam_language: ExamLanguage;
  status: VoucherStatus | 'assigned';
  expires_at: string | null;
  source: 'ecp';
  assigned_at?: string;
}

// =============================================================================
// STATUS COLORS
// =============================================================================

const STATUS_COLORS: Record<VoucherDisplayInfo['status'], string> = {
  active: 'bg-green-100 text-green-800 border-green-300',
  used: 'bg-gray-100 text-gray-600 border-gray-300',
  expired: 'bg-red-100 text-red-800 border-red-300',
  cancelled: 'bg-orange-100 text-orange-800 border-orange-300',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get display information for a voucher
 */
export function getVoucherDisplayInfo(
  voucher: ExamVoucherWithQuiz | ECPVoucherRaw
): VoucherDisplayInfo {
  const now = new Date();
  const isExpired = voucher.expires_at && new Date(voucher.expires_at) <= now;
  const rawStatus = voucher.status;

  // Determine actual display status
  let status: VoucherDisplayInfo['status'] = 'active';

  if (rawStatus === 'used') {
    status = 'used';
  } else if (rawStatus === 'expired' || isExpired) {
    status = 'expired';
  } else if (rawStatus === 'cancelled') {
    status = 'cancelled';
  } else if (rawStatus === 'available' || rawStatus === 'assigned') {
    status = 'active';
  }

  // Determine source label
  let sourceLabel = 'Admin Grant';
  if ('source' in voucher && voucher.source === 'ecp') {
    sourceLabel = 'ECP Partner';
  } else if ('woocommerce_order_id' in voucher && voucher.woocommerce_order_id) {
    sourceLabel = 'Store Purchase';
  }

  return {
    status,
    statusLabel: status.charAt(0).toUpperCase() + status.slice(1),
    statusColor: STATUS_COLORS[status],
    sourceLabel,
    canUse: status === 'active',
  };
}

/**
 * Check if a voucher is valid and can be used
 */
export function isVoucherUsable(voucher: ExamVoucherWithQuiz | ECPVoucherRaw): boolean {
  const now = new Date();
  const isExpired = voucher.expires_at && new Date(voucher.expires_at) <= now;
  const status = voucher.status;

  return (status === 'available' || status === 'assigned') && !isExpired;
}

/**
 * Merge direct vouchers and ECP vouchers into a unified format
 */
export function mergeVouchers(
  directVouchers: ExamVoucherWithQuiz[] | null | undefined,
  ecpVouchers: ECPVoucherRaw[] | null | undefined
): MergedVoucher[] {
  const result: MergedVoucher[] = [];

  // Process direct vouchers
  if (directVouchers) {
    directVouchers.forEach((v) => {
      result.push({
        id: v.id,
        code: v.code,
        certification_type: v.certification_type,
        exam_language: v.exam_language,
        quiz_id: v.quiz_id,
        expires_at: v.expires_at,
        status: v.status,
        source: 'direct',
        displayInfo: getVoucherDisplayInfo(v),
        _raw: v,
      });
    });
  }

  // Process ECP vouchers
  if (ecpVouchers) {
    ecpVouchers.forEach((v) => {
      // ECP vouchers use 'assigned' status, normalize to 'available'
      const normalizedStatus: VoucherStatus =
        v.status === 'assigned' ? 'available' : v.status as VoucherStatus;

      const ecpVoucher: ECPVoucherRaw = {
        ...v,
        status: normalizedStatus,
      };

      result.push({
        id: v.id,
        code: v.code,
        certification_type: v.certification_type,
        exam_language: v.exam_language || 'en',
        quiz_id: null, // ECP vouchers are always wildcard
        expires_at: v.expires_at,
        status: normalizedStatus,
        source: 'ecp',
        displayInfo: getVoucherDisplayInfo(ecpVoucher),
        _raw: ecpVoucher,
      });
    });
  }

  return result;
}

/**
 * Filter vouchers by certification type
 */
export function filterVouchersByCertType(
  vouchers: MergedVoucher[],
  certType: CertificationType | 'all'
): MergedVoucher[] {
  if (certType === 'all') return vouchers;
  return vouchers.filter((v) => v.certification_type === certType);
}

/**
 * Filter vouchers by status
 */
export function filterVouchersByStatus(
  vouchers: MergedVoucher[],
  status: VoucherDisplayInfo['status'] | 'all'
): MergedVoucher[] {
  if (status === 'all') return vouchers;
  return vouchers.filter((v) => v.displayInfo.status === status);
}

/**
 * Get active (usable) vouchers only
 */
export function getActiveVouchers(vouchers: MergedVoucher[]): MergedVoucher[] {
  return vouchers.filter((v) => v.displayInfo.canUse);
}

/**
 * Get voucher counts by certification type
 */
export function getVoucherCounts(vouchers: MergedVoucher[]): { CP: number; SCP: number; total: number } {
  const activeVouchers = getActiveVouchers(vouchers);
  return {
    CP: activeVouchers.filter((v) => v.certification_type === 'CP').length,
    SCP: activeVouchers.filter((v) => v.certification_type === 'SCP').length,
    total: activeVouchers.length,
  };
}

/**
 * Format expiry date for display
 */
export function formatExpiryDate(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry';

  const date = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return `Expired ${Math.abs(daysUntilExpiry)} days ago`;
  } else if (daysUntilExpiry === 0) {
    return 'Expires today';
  } else if (daysUntilExpiry === 1) {
    return 'Expires tomorrow';
  } else if (daysUntilExpiry <= 7) {
    return `Expires in ${daysUntilExpiry} days`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * Find a voucher by ID from merged list
 */
export function findVoucherById(
  vouchers: MergedVoucher[],
  voucherId: string
): MergedVoucher | undefined {
  return vouchers.find((v) => v.id === voucherId);
}
