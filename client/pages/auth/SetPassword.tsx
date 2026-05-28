import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';

export default function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthToken = async () => {
      try {
        // ── 1. Check if there's already an active session (PKCE flow) ──
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user) {
          setUserEmail(existingSession.user.email || null);
          setLoading(false);
          return;
        }

        // ── 2. Check for PKCE ?code= in query string ──
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setError('Your password reset link has expired or is invalid. Please request a new one.');
            setLoading(false);
            return;
          }
          if (data.user) {
            setUserEmail(data.user.email || null);
          }
          setLoading(false);
          return;
        }

        // ── 3. Legacy: Check hash fragment for access_token ──
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        // Check for error parameters first (e.g., expired link)
        const urlError = params.get('error');
        const urlErrorCode = params.get('error_code');
        const urlErrorDescription = params.get('error_description');
        if (urlError || urlErrorCode) {
          let errorMessage = urlErrorDescription?.replace(/\+/g, ' ') || 'An error occurred with your link.';
          if (urlErrorCode === 'otp_expired') {
            errorMessage = 'This password reset link has expired. Please request a new one.';
          } else if (urlErrorCode === 'access_denied') {
            errorMessage = 'Access denied. The link may be invalid or has already been used.';
          }
          setError(errorMessage);
          setErrorCode(urlErrorCode);
          setLoading(false);
          return;
        }

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (!accessToken) {
          setError('Invalid or missing invitation link. Please request a new one.');
          setLoading(false);
          return;
        }

        // Set the session using the tokens
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Your invitation link has expired or is invalid. Please request a new one.');
          setLoading(false);
          return;
        }

        if (data.user) {
          setUserEmail(data.user.email || null);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error processing invite:', err);
        setError('An error occurred while processing your invitation.');
        setLoading(false);
      }
    };

    handleAuthToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        console.error('Password update error:', updateError);
        setError('Failed to update password. Please try again or request a new link.');
        return;
      }

      setSuccess(true);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600 text-sm">Verifying your link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Error state (invalid/expired link) ──
  if (error && !password) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3">
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl text-gray-900">Link Expired or Invalid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            {errorCode && (
              <p className="text-xs text-gray-400 text-center">Error code: {errorCode}</p>
            )}
            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/auth/forgot-password')}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Request New Link
              </Button>
              <Link to="/auth/login" className="text-center text-sm text-blue-600 hover:underline">
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success state ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3">
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-xl text-gray-900">Password Set Successfully!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            <p className="text-gray-600 text-sm">
              Your password has been set. Redirecting you to the dashboard...
            </p>
            <Loader2 className="h-5 w-5 animate-spin text-blue-600 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Set Password Form ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="bg-blue-100 rounded-full p-3">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-gray-900">Set Your Password</CardTitle>
          {userEmail && (
            <p className="text-sm text-gray-500 mt-1">
              Setting password for <span className="font-medium text-gray-700">{userEmail}</span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400">Minimum 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={submitting || !password || !confirmPassword}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting Password...
                </>
              ) : (
                'Set Password & Access Portal'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
