/**
 * Trainer Accept Invite Page
 * Handles the magic-link redirect after a trainer clicks their invite email.
 * Calls accept_trainer_invite() DB function to:
 *  - set user role to 'trainer'
 *  - link ecp_trainers.user_id
 *  - grant Learning System access
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/shared/config/supabase.config';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function TrainerAcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Activating your trainer account...');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid invite link. Please contact your partner organisation.');
      return;
    }

    async function acceptInvite() {
      try {
        // Get current user (Supabase magic link already logged them in)
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setStatus('error');
          setMessage('Authentication failed. Please try clicking the invite link again.');
          return;
        }

        // Call DB function to accept invite
        const { data, error } = await supabase.rpc('accept_trainer_invite', {
          p_token: token,
          p_user_id: user.id,
        });

        if (error) {
          console.error('Accept invite error:', error);
          setStatus('error');
          setMessage(error.message || 'Failed to activate account. Please contact support.');
          return;
        }

        if (!data?.success) {
          setStatus('error');
          setMessage(data?.error || 'Invalid or expired invite token.');
          return;
        }

        setStatus('success');
        setMessage('Your trainer account is ready!');

        // Refresh session to pick up new role
        await supabase.auth.refreshSession();

        // Redirect to trainer dashboard after 2 seconds
        setTimeout(() => navigate('/trainer/dashboard', { replace: true }), 2000);
      } catch (err: any) {
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    }

    acceptInvite();
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f6ff] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
        {/* BDA Logo */}
        <img
          src="/bda-logo.png"
          alt="BDA"
          className="h-12 mx-auto mb-6 object-contain"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />

        {status === 'processing' && (
          <>
            <Loader2 className="w-14 h-14 text-[#0f91e0] mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold text-[#0d1f4e] mb-2">Setting Up Your Account</h2>
            <p className="text-slate-500 text-sm">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#0d1f4e] mb-2">Welcome to BDA!</h2>
            <p className="text-slate-500 text-sm">{message}</p>
            <p className="text-slate-400 text-xs mt-3">Redirecting to your dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#0d1f4e] mb-2">Activation Failed</h2>
            <p className="text-slate-500 text-sm">{message}</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 bg-[#0f91e0] text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-[#1C4A8B] transition-colors text-sm"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
