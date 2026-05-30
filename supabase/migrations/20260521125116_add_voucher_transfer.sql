-- Migration: Add Voucher Transfer Fields
-- Adds transfer functionality with anti-resale protections

-- 1. Add transfer columns to exam_vouchers
ALTER TABLE exam_vouchers
  ADD COLUMN IF NOT EXISTS transferred_from_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS transferred_to_email TEXT,
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transfer_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS transfer_expires_at TIMESTAMPTZ;

-- 2. Set transfer_expires_at for existing vouchers (60 days from purchased_at)
UPDATE exam_vouchers
SET transfer_expires_at = purchased_at + INTERVAL '60 days'
WHERE transfer_expires_at IS NULL AND purchased_at IS NOT NULL;

-- 3. Create function to transfer a voucher
CREATE OR REPLACE FUNCTION transfer_voucher(
  p_voucher_id UUID,
  p_recipient_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_voucher exam_vouchers%ROWTYPE;
  v_recipient_user_id UUID;
  v_caller_id UUID := auth.uid();
BEGIN
  -- Get the voucher
  SELECT * INTO v_voucher FROM exam_vouchers WHERE id = p_voucher_id;

  -- Validate ownership
  IF v_voucher.user_id != v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not own this voucher');
  END IF;

  -- Validate status
  IF v_voucher.status != 'available' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voucher is not available for transfer');
  END IF;

  -- Validate transfer count (max 1 transfer)
  IF v_voucher.transfer_count >= 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This voucher has already been transferred once and cannot be transferred again');
  END IF;

  -- Validate transfer window (60 days from purchase)
  IF v_voucher.transfer_expires_at IS NOT NULL AND NOW() > v_voucher.transfer_expires_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer window has expired (60 days from purchase date)');
  END IF;

  -- Cannot transfer to yourself
  IF LOWER(p_recipient_email) = (SELECT LOWER(email) FROM auth.users WHERE id = v_caller_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot transfer a voucher to yourself');
  END IF;

  -- Check if recipient has an account
  SELECT id INTO v_recipient_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(p_recipient_email)
  LIMIT 1;

  -- Record original owner if first transfer
  IF v_voucher.original_owner_id IS NULL THEN
    UPDATE exam_vouchers
    SET original_owner_id = v_caller_id
    WHERE id = p_voucher_id;
  END IF;

  -- Perform the transfer
  IF v_recipient_user_id IS NOT NULL THEN
    -- Recipient has an account: transfer directly
    UPDATE exam_vouchers
    SET
      user_id = v_recipient_user_id,
      transferred_from_user_id = v_caller_id,
      transferred_to_email = p_recipient_email,
      transferred_at = NOW(),
      transfer_count = transfer_count + 1,
      updated_at = NOW()
    WHERE id = p_voucher_id;

    RETURN jsonb_build_object(
      'success', true,
      'recipient_has_account', true,
      'recipient_user_id', v_recipient_user_id,
      'voucher_code', v_voucher.code,
      'certification_type', v_voucher.certification_type
    );
  ELSE
    -- Recipient has no account: mark as pending transfer
    UPDATE exam_vouchers
    SET
      transferred_from_user_id = v_caller_id,
      transferred_to_email = LOWER(p_recipient_email),
      transferred_at = NOW(),
      transfer_count = transfer_count + 1,
      status = 'pending_transfer',
      updated_at = NOW()
    WHERE id = p_voucher_id;

    RETURN jsonb_build_object(
      'success', true,
      'recipient_has_account', false,
      'voucher_code', v_voucher.code,
      'certification_type', v_voucher.certification_type
    );
  END IF;
END;
$$;

-- 4. Create function to claim a pending transfer voucher (called after registration)
CREATE OR REPLACE FUNCTION claim_pending_vouchers(p_user_email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = LOWER(p_user_email) LIMIT 1;
  IF v_user_id IS NULL THEN RETURN 0; END IF;

  UPDATE exam_vouchers
  SET
    user_id = v_user_id,
    status = 'available',
    updated_at = NOW()
  WHERE
    LOWER(transferred_to_email) = LOWER(p_user_email)
    AND status = 'pending_transfer';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION transfer_voucher(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_pending_vouchers(TEXT) TO authenticated, service_role;
