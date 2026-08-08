/**
 * Create Independent Instructor Route
 * POST /api/instructors/create
 *
 * Admin-only endpoint that:
 * 1. Creates a Supabase auth user (or finds existing)
 * 2. Creates/updates the users profile with role = 'trainer'
 * 3. Inserts an instructor_certifications record
 * 4. Sends a magic link invite email
 */

import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function handleCreateInstructor(req: Request, res: Response) {
  try {
    const { first_name, last_name, email, approved_programmes, notes } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: 'first_name, last_name, and email are required' });
    }

    // Verify caller is admin
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || !['admin', 'super_admin'].includes(callerProfile.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists in auth
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === normalizedEmail);

    let userId: string;

    if (existingAuthUser) {
      // User exists in auth — just update their profile role
      userId = existingAuthUser.id;

      await supabaseAdmin
        .from('users')
        .update({
          role: 'trainer',
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } else {
      // Create new auth user with magic link
      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: false,
        user_metadata: {
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          role: 'trainer',
        },
      });

      if (createError || !newAuthUser.user) {
        console.error('Create user error:', createError);
        return res.status(500).json({ error: createError?.message || 'Failed to create user account' });
      }

      userId = newAuthUser.user.id;

      // Create users profile row
      await supabaseAdmin.from('users').upsert({
        id: userId,
        email: normalizedEmail,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        role: 'trainer',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Check if already has active certification
    const { data: existingCert } = await supabaseAdmin
      .from('instructor_certifications')
      .select('id, instructor_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingCert) {
      return res.json({
        success: true,
        already_certified: true,
        instructor_id: existingCert.instructor_id,
        message: 'User already has an active instructor certification.',
      });
    }

    // Grant instructor certification
    const programmes = approved_programmes
      ? approved_programmes.split(',').map((p: string) => p.trim()).filter(Boolean)
      : ['BDA Business Development Foundation', 'BDA-CP Preparation'];

    const { data: cert, error: certError } = await supabaseAdmin
      .from('instructor_certifications')
      .insert({
        user_id: userId,
        approved_programmes: programmes,
        notes: notes || null,
        created_by: callerProfile.id,
      })
      .select('instructor_id')
      .single();

    if (certError) {
      console.error('Cert insert error:', certError);
      return res.status(500).json({ error: 'Failed to create certification record' });
    }

    // Send magic link invite
    const portalBase = process.env.PORTAL_URL || 'https://portal.bda-global.org';
    const { error: magicError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: {
        redirectTo: `${portalBase}/trainer/dashboard`,
        data: {
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          role: 'trainer',
          instructor_id: cert.instructor_id,
        },
      },
    });

    if (magicError) {
      console.warn('Magic link send failed (non-blocking):', magicError.message);
    }

    return res.json({
      success: true,
      instructor_id: cert.instructor_id,
      user_id: userId,
      invite_sent: !magicError,
      message: `BDA Certified Instructor account created for ${normalizedEmail}. Invite email sent.`,
    });

  } catch (err: any) {
    console.error('Create instructor error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
