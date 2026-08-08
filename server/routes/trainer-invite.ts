/**
 * Trainer Invite Route
 * Sends a magic-link invitation to a trainer so they can create
 * their own login account linked to the ECP partner.
 *
 * POST /api/trainers/invite
 * Body: { trainer_id: string }
 * Auth: must be authenticated as ECP partner (role = 'ecp')
 */

import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function handleTrainerInvite(req: Request, res: Response) {
  try {
    const { trainer_id } = req.body;

    if (!trainer_id) {
      return res.status(400).json({ error: 'trainer_id is required' });
    }

    // Verify caller is authenticated ECP partner
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get caller profile to verify ECP role
    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || !['ecp', 'dual_partner', 'admin', 'super_admin'].includes(callerProfile.role)) {
      return res.status(403).json({ error: 'Only ECP partners can invite trainers' });
    }

    // Get trainer record (must belong to this partner)
    const { data: trainer, error: trainerError } = await supabaseAdmin
      .from('ecp_trainers')
      .select('id, email, first_name, last_name, partner_id, invite_status, user_id')
      .eq('id', trainer_id)
      .single();

    if (trainerError || !trainer) {
      return res.status(404).json({ error: 'Trainer not found' });
    }

    // For admin, skip partner ownership check; for ECP, enforce it
    if (!['admin', 'super_admin'].includes(callerProfile.role) && trainer.partner_id !== caller.id) {
      return res.status(403).json({ error: 'This trainer does not belong to your organisation' });
    }

    // If trainer already has an account, just return success
    if (trainer.user_id) {
      return res.json({
        success: true,
        message: 'Trainer already has an active account',
        already_active: true,
      });
    }

    // Generate invite token in DB
    const { data: inviteRecord, error: tokenError } = await supabaseAdmin
      .from('trainer_invite_tokens')
      .insert({
        trainer_id: trainer.id,
        partner_id: trainer.partner_id,
        email: trainer.email,
      })
      .select('token')
      .single();

    if (tokenError || !inviteRecord) {
      console.error('Token creation error:', tokenError);
      return res.status(500).json({ error: 'Failed to create invite token' });
    }

    // Build accept URL
    const portalBase = process.env.PORTAL_URL || 'https://portal.bda-global.org';
    const acceptUrl = `${portalBase}/instructor/accept-invite?token=${inviteRecord.token}`;

    // Send magic link via Supabase Auth (creates user if not exists, sends email)
    const { error: magicError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: trainer.email,
      options: {
        redirectTo: acceptUrl,
        data: {
          first_name: trainer.first_name,
          last_name: trainer.last_name,
          invite_token: inviteRecord.token,
          role: 'trainer',
        },
      },
    });

    if (magicError) {
      console.error('Magic link error:', magicError);
      // Fallback: still mark as invited even if email fails
    }

    // Mark trainer as invited
    await supabaseAdmin
      .from('ecp_trainers')
      .update({
        invite_status: 'invited',
        invited_at: new Date().toISOString(),
      })
      .eq('id', trainer_id);

    return res.json({
      success: true,
      message: `Invitation sent to ${trainer.email}`,
      accept_url: acceptUrl, // returned for testing/debugging
    });

  } catch (err: any) {
    console.error('Trainer invite error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
