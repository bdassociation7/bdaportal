-- Fix exam_vouchers valid_usage constraint to allow attempt_id to be NULL for used vouchers
-- This happens when an exam/attempt is deleted but we want to preserve the voucher usage history

-- Drop the old constraint
ALTER TABLE public.exam_vouchers
DROP CONSTRAINT IF EXISTS valid_usage;

-- Add updated constraint that allows attempt_id to be NULL for used vouchers
-- (preserves history when exam is force-deleted)
ALTER TABLE public.exam_vouchers
ADD CONSTRAINT valid_usage CHECK (
  (status = 'used' AND used_at IS NOT NULL) OR
  (status != 'used')
);

COMMENT ON CONSTRAINT valid_usage ON public.exam_vouchers IS 'Ensures used vouchers have used_at timestamp. attempt_id can be NULL if exam was deleted.';
