import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { IndividualRegistrationService } from '@/services/individual-registration.service';

interface VerifyEmailLocationState {
  email?: string;
  message?: string;
}

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const initialEmail = (location.state as VerifyEmailLocationState | null)?.email || '';
  const [email, setEmail] = useState(initialEmail);
  const [isResending, setIsResending] = useState(false);
  const [sent, setSent] = useState(Boolean(initialEmail));

  const emailHint = useMemo(() => email.trim().toLowerCase(), [email]);

  const handleResend = async () => {
    if (!emailHint) {
      toast({
        title: 'Enter your email address',
        description: 'Enter the email address you used to create your BDA account.',
        variant: 'destructive',
      });
      return;
    }

    setIsResending(true);
    try {
      const result = await IndividualRegistrationService.resendConfirmation(emailHint);
      setSent(true);
      toast({
        title: 'Confirmation email sent',
        description: result.message,
      });
    } catch (error) {
      console.error('Unable to resend confirmation email:', error);
      toast({
        title: 'Unable to send confirmation email',
        description: 'Please wait a moment and try again, or contact BDA Support if the issue continues.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef7ff] via-white to-[#e8f2ff] px-4 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-lg items-center">
        <Card className="w-full border-blue-100 shadow-xl shadow-blue-950/10">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0d1f4e] to-[#0f91e0] text-white">
              <Mail className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl text-[#0d1f4e]">Confirm your email address</CardTitle>
              <CardDescription className="mt-2 text-base leading-6">
                We have sent a secure confirmation link to your email. Confirm your address to activate your BDA account and continue to your profile.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-[#1c4a8b]">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0f91e0]" />
                <p>
                  This verification protects your BDA account. Once you select the link in the email, you will be signed in securely and taken to account activation automatically.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation-email">Email address</Label>
              <Input
                id="confirmation-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>

            {sent && emailHint && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Confirmation instructions were sent to <strong>{emailHint}</strong>.
              </div>
            )}

            <Button type="button" className="w-full bg-gradient-to-r from-[#0d1f4e] to-[#0f91e0] text-white hover:opacity-95" onClick={handleResend} disabled={isResending}>
              {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {isResending ? 'Sending...' : sent ? 'Resend confirmation email' : 'Send confirmation email'}
            </Button>

            <div className="border-t pt-5 text-center text-sm text-gray-600">
              Already confirmed your email?{' '}
              <button type="button" onClick={() => navigate('/login', { state: { email: emailHint } })} className="font-semibold text-[#0f91e0] hover:underline">
                Sign in
              </button>
              <span className="mx-2 text-gray-300">|</span>
              <Link to="/support/new" className="font-semibold text-[#0f91e0] hover:underline">Need help?</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

VerifyEmail.displayName = 'VerifyEmail';
