/**
 * TransferVoucherModal
 * Allows a user to transfer an available exam voucher to another person.
 *
 * Rules enforced:
 *  - Transfer allowed only once (transfer_count must be 0)
 *  - Transfer allowed only within 60 days of purchase
 *  - Cannot transfer to yourself
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Send, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUserFriendlyError } from '@/lib/error-handler';
import type { MergedVoucher } from '@/entities/quiz/voucher.utils';

interface TransferVoucherModalProps {
  voucher: MergedVoucher;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferVoucherModal({ voucher, open, onClose, onSuccess }: TransferVoucherModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check transfer eligibility
  const raw = voucher._raw as Record<string, unknown>;
  const transferCount = (raw.transfer_count as number) ?? 0;
  const purchasedAt = raw.purchased_at as string | null;
  const transferExpiresAt = raw.transfer_expires_at as string | null;

  const isAlreadyTransferred = transferCount >= 1;
  const isTransferExpired = transferExpiresAt ? new Date(transferExpiresAt) < new Date() : false;
  const canTransfer = !isAlreadyTransferred && !isTransferExpired && voucher.displayInfo.status === 'active';

  const transferDeadline = transferExpiresAt
    ? new Date(transferExpiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : purchasedAt
    ? new Date(new Date(purchasedAt).getTime() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  const handleTransfer = async () => {
    setError(null);

    if (!recipientEmail.trim()) {
      setError('Please enter the recipient\'s email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    // Get current user (needed for self-transfer check and email)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Authentication error. Please log in again.'); return; }

    if (recipientEmail.trim().toLowerCase() === user.email?.toLowerCase()) {
      setError('You cannot transfer a voucher to yourself.');
      return;
    }

    setIsLoading(true);
    try {
      // Call transfer_voucher database function
      // The function uses auth.uid() internally for ownership check
      const { data, error: fnErr } = await supabase.rpc('transfer_voucher', {
        p_voucher_id: voucher.id,
        p_recipient_email: recipientEmail.trim().toLowerCase(),
      });

      if (fnErr) throw fnErr;
      if (!data?.success) throw new Error(data?.error || 'Transfer failed');

      const recipientHasAccount = data?.recipient_has_account ?? false;

      // Send notification email
      const { error: emailErr } = await supabase.functions.invoke('send-voucher-transfer', {
        body: {
          voucher_id: voucher.id,
          recipient_email: recipientEmail.trim().toLowerCase(),
          recipient_has_account: recipientHasAccount,
          sender_user_id: user.id,
        },
      });

      if (emailErr) {
        // Email failed but transfer succeeded — log and continue
        console.warn('Transfer email failed:', emailErr);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);

    } catch (err: unknown) {
      setError(getUserFriendlyError(err, 'Transfer failed. Please try again or contact support.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setRecipientEmail('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" />
            Transfer Exam Voucher
          </DialogTitle>
          <DialogDescription>
            Send this voucher to another person so they can take the exam.
          </DialogDescription>
        </DialogHeader>

        {/* Voucher Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Voucher Code</span>
            <span className="font-mono font-semibold text-gray-900">{voucher.code}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Certification</span>
            <Badge variant="outline">BDA-{voucher.certification_type}™</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Language</span>
            <span className="text-sm font-medium">{voucher.exam_language.toUpperCase()}</span>
          </div>
        </div>

        {/* Transfer Rules Notice */}
        {canTransfer && (
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Transfer Rules:</strong>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Transfer is allowed <strong>once only</strong></li>
                <li>Must be transferred before <strong>{transferDeadline}</strong></li>
                <li>Once transferred, this voucher will be removed from your account</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Not eligible */}
        {!canTransfer && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isAlreadyTransferred && 'This voucher has already been transferred once and cannot be transferred again.'}
              {isTransferExpired && !isAlreadyTransferred && `The 60-day transfer window has expired (deadline was ${transferDeadline}).`}
              {voucher.displayInfo.status !== 'active' && !isAlreadyTransferred && !isTransferExpired && 'Only active vouchers can be transferred.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Success State */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Voucher transferred successfully! A notification email has been sent to <strong>{recipientEmail}</strong>.
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Input */}
        {canTransfer && !success && (
          <div className="space-y-2">
            <Label htmlFor="recipient-email">Recipient Email Address</Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="recipient@example.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTransfer()}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500">
              If the recipient doesn't have a BDA Portal account, they'll receive an invitation email to create one and claim the voucher.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {success ? 'Close' : 'Cancel'}
          </Button>
          {canTransfer && !success && (
            <Button
              onClick={handleTransfer}
              disabled={isLoading || !recipientEmail.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Transferring...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Transfer Voucher
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
