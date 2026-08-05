import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, Tag, Globe, Ticket, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatExpiryDate, type MergedVoucher } from '@/entities/quiz/voucher.utils';
import { TransferVoucherModal } from './TransferVoucherModal';
import { supabase } from '@/lib/supabase';

interface VoucherCardProps {
  voucher: MergedVoucher;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  onTransferSuccess?: () => void;
  /** Total number of ACTIVE vouchers the user has for the same certification type */
  totalActiveVouchersSameCert?: number;
}

export function VoucherCard({ voucher, isSelected, onSelect, disabled, onTransferSuccess, totalActiveVouchersSameCert = 1 }: VoucherCardProps) {
  const { displayInfo } = voucher;
  const [showTransferModal, setShowTransferModal] = useState(false);

  const raw = voucher._raw as Record<string, unknown>;
  const transferCount = (raw.transfer_count as number) ?? 0;
  const transferExpiresAt = raw.transfer_expires_at as string | null;
  const isTransferExpired = transferExpiresAt ? new Date(transferExpiresAt) < new Date() : false;
  const isEcpVoucher = voucher.source === 'ecp';

  // Check if user has an active certification for this cert type
  // Must be defined BEFORE canTransfer logic
  const { data: userCertification } = useQuery({
    queryKey: ['user-active-certification', voucher.certification_type],
    enabled: !!voucher.certification_type,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('user_certifications')
        .select('id, certification_type, status')
        .eq('user_id', user.id)
        .eq('certification_type', voucher.certification_type)
        .eq('status', 'active')
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const isAlreadyCertified = !!userCertification;

  // Transfer visibility logic:
  // 1. Basic transferability rules (not used/expired/cancelled, not already transferred)
  const isTransferableByRules = displayInfo.status === 'active'
    && (isEcpVoucher || transferCount === 0)
    && !isTransferExpired;

  // 2. Show Transfer button only if:
  //    - User has 2+ active vouchers of this cert type (they have extras to give away), OR
  //    - User is already certified (they don't need this voucher for themselves)
  const hasMultipleVouchers = totalActiveVouchersSameCert > 1;
  const canTransfer = isTransferableByRules && (hasMultipleVouchers || isAlreadyCertified);

  return (
    <>
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          isSelected && 'ring-2 ring-blue-500 border-blue-300 bg-blue-50/50',
          disabled && 'opacity-50 cursor-not-allowed hover:shadow-none',
          !disabled && !isSelected && 'hover:border-gray-300'
        )}
        onClick={() => !disabled && onSelect()}
      >
        <CardContent className="p-4">
          {/* Header: Status and Cert Type */}
          <div className="flex items-start justify-between mb-3">
            <Badge className={cn('text-xs', displayInfo.statusColor)}>
              {displayInfo.statusLabel}
            </Badge>
            <Badge variant="outline" className="font-semibold">
              BDA-{voucher.certification_type}
            </Badge>
          </div>

          {/* Voucher Code */}
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="h-5 w-5 text-gray-500" />
            <p className="font-mono text-lg font-semibold tracking-wide">{voucher.code}</p>
          </div>

          {/* Details */}
          <div className="text-sm text-gray-600 space-y-1.5">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 flex-shrink-0" />
              <span>Source: {displayInfo.sourceLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{formatExpiryDate(voucher.expires_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 flex-shrink-0" />
              <span>Language: {voucher.exam_language.toUpperCase()}</span>
            </div>
          </div>

          {/* Selected Indicator */}
          {isSelected && !disabled && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="flex items-center gap-2 text-blue-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Selected</span>
              </div>
            </div>
          )}

          {/* Disabled Reason */}
          {disabled && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500">
                {displayInfo.status === 'used' && 'This voucher has already been used'}
                {displayInfo.status === 'expired' && 'This voucher has expired'}
                {displayInfo.status === 'cancelled' && 'This voucher was cancelled'}
              </p>
            </div>
          )}

          {/* Already Certified Notice — shown when user is certified and can transfer */}
          {isAlreadyCertified && canTransfer && !disabled && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs text-green-700 font-medium">
                  You are already BDA-{voucher.certification_type} certified
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                onClick={(e) => { e.stopPropagation(); setShowTransferModal(true); }}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Transfer to Someone
              </Button>
            </div>
          )}

          {/* Transfer Button — for non-certified users who have multiple vouchers */}
          {canTransfer && !disabled && !isAlreadyCertified && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                onClick={(e) => { e.stopPropagation(); setShowTransferModal(true); }}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Transfer to Someone
              </Button>
            </div>
          )}

          {/* Already Transferred Badge */}
          {transferCount > 0 && (
            <div className="mt-3 pt-3 border-t">
              <Badge variant="outline" className="text-xs text-gray-500 border-gray-300">
                Transferred
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Modal */}
      <TransferVoucherModal
        voucher={voucher}
        open={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSuccess={() => { setShowTransferModal(false); onTransferSuccess?.(); }}
      />
    </>
  );
}
