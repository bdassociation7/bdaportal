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
    const handleInviteToken = async () => {
      try {
        // Parse the hash fragment
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        // Check for error parameters first (e.g., expired link)
        const urlError = params.get('error');
        const urlErrorCode = params.get('error_code');
        const urlErrorDescription = params.get('error_description');

        if (urlError || urlErrorCode) {
          // Handle specific error codes
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

    handleInviteToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Error setting password:', err);
      setError(err.message || 'Failed to set password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-secondary flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-gray-600">Verifying your link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-secondary flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto mb-4 py-4">
              <img
                src="/bda-logo.png"
                alt="BDA Logo"
                className="h-32 w-auto mx-auto"
                style={{ maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Set Successfully!</h2>
            <p className="text-gray-600 text-center">
              Redirecting you to the dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state (expired/invalid link)
  if (error && !userEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary to-secondary flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto mb-4 py-4">
              <img
                src="/bda-logo.png"
                alt="BDA Logo"
                className="h-32 w-auto mx-auto"
                style={{ maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Link Expired
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-gray-600 mb-2">{error}</p>
              {errorCode && (
                <p className="text-xs text-gray-400">Error code: {errorCode}</p>
              )}
            </div>

            <div className="space-y-3">
              <Link to="/forgot-password" className="block">
                <Button className="w-full bg-primary hover:bg-primary/90">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Request New Link
                </Button>
              </Link>
              <Link to="/login" className="block">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>

            <div className="pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                Need help?{' '}
                <a
                  href="https://bda-global.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Contact support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Normal form state
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto mb-4 py-4">
            <img
              src="/bda-logo.png"
              alt="BDA Logo"
              className="h-32 w-auto mx-auto"
              style={{ maxWidth: '100%', objectFit: 'contain' }}
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Set Your Password
          </CardTitle>
          <p className="text-sm text-gray-600">
            {userEmail ? (
              <>Welcome! Create a password for <strong>{userEmail}</strong></>
            ) : (
              'Create a secure password for your account'
            )}
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={8}
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500">Must be at least 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting Password...
                </>
              ) : (
                'Set Password & Continue'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Need help?{' '}
              <a
                href="https://bda-global.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                bda-global.org
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
