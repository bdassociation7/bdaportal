import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Calendar, Tag, Globe, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatExpiryDate, type MergedVoucher } from '@/entities/quiz/voucher.utils';

interface VoucherCardProps {
  voucher: MergedVoucher;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function VoucherCard({ voucher, isSelected, onSelect, disabled }: VoucherCardProps) {
  const { displayInfo } = voucher;

  return (
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
            BDA-{voucher.certification_type}™
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
      </CardContent>
    </Card>
  );
}
