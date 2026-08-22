/**
 * Signup Page — BDA Portal
 *
 * Individual Professional registration only.
 * ECP / PDP partner accounts are created via store purchase or admin grant.
 *
 * Layout: Split screen
 * - Left (hidden on mobile): BDA brand panel with gradient + features
 * - Right: Registration form
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { UnifiedSignupService, type SignupRequest, type ConflictInfo } from '@/services/unified-signup.service';
import { ExistingAccountModal } from '@/components/ui/existing-account-modal';
import { WordPressAPIService } from '@/services/wordpress-api.service';
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  Award,
  Users,
} from 'lucide-react';

// ─── Brand ────────────────────────────────────────────────────────────────────
const BDA_BLUE = '#0f91e0';
const BDA_NAVY = '#0d1f4e';
const BDA_GRAD = `linear-gradient(135deg, ${BDA_BLUE} 0%, ${BDA_NAVY} 100%)`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading]     = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [step, setStep]           = useState<1 | 3>(1);

  const [existingAccountModal, setExistingAccountModal] = useState({
    open: false,
    type: 'store' as 'store' | 'portal',
    email: '',
    loading: false,
    error: '',
  });

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  const update = (field: keyof FormData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const { email, password, confirmPassword, firstName, lastName } = formData;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      toast({ title: 'Required fields missing', description: 'Please fill in all required fields.', variant: 'destructive' });
      return false;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please make sure both passwords are identical.', variant: 'destructive' });
      return false;
    }
    if (password.length < 8) {
      toast({ title: 'Password too short', description: 'Password must be at least 8 characters.', variant: 'destructive' });
      return false;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  // ── Signup ──────────────────────────────────────────────────────────────────
  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    setConflicts([]);
    try {
      const request: SignupRequest = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        accessType: 'portal-only',
        role: 'individual',
      };
      const result = await UnifiedSignupService.handleSignup(request);
      if (result.success) {
        toast({ title: 'Account created!', description: result.message });
        navigate(result.nextStep === 'verify_email' ? '/verify-email' : '/login', {
          state: { email: formData.email, message: result.message },
        });
      } else {
        if (result.nextStep === 'confirm_data' && result.conflicts) {
          setConflicts(result.conflicts);
          setStep(3);
        } else if (
          result.action === 'requires_store_password' ||
          result.nextStep === 'provide_store_password' ||
          result.message?.includes('EXISTING_STORE_ACCOUNT')
        ) {
          setExistingAccountModal({ open: true, type: 'store', email: formData.email, loading: false, error: '' });
        } else {
          toast({
            title: 'Notice',
            description: result.message,
            variant: result.action === 'confirmed_existing' ? 'default' : 'destructive',
          });
          if (result.nextStep === 'login') {
            navigate('/login', { state: { email: formData.email, message: result.message } });
          }
        }
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Existing account modal handler ─────────────────────────────────────────
  const handleExistingAccountPassword = async (password: string) => {
    setExistingAccountModal(prev => ({ ...prev, loading: true, error: '' }));
    try {
      if (existingAccountModal.type === 'store') {
        const response = await WordPressAPIService.verifyCredentials(existingAccountModal.email, password);
        if (response.success) {
          const request: SignupRequest = {
            email: formData.email,
            password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            accessType: 'both',
            role: 'individual',
          };
          const result = await UnifiedSignupService.handleSignup(request);
          if (result.success) {
            setExistingAccountModal({ open: false, type: 'store', email: '', loading: false, error: '' });
            toast({ title: 'Accounts linked!', description: result.message });
            if (result.nextStep === 'login') navigate('/login', { state: { email: formData.email, message: result.message } });
          } else {
            setExistingAccountModal(prev => ({ ...prev, loading: false, error: result.message || 'Error linking accounts.' }));
          }
        } else {
          setExistingAccountModal(prev => ({ ...prev, loading: false, error: 'Incorrect password. Please try again.' }));
        }
      }
    } catch {
      setExistingAccountModal(prev => ({ ...prev, loading: false, error: 'An error occurred. Please try again.' }));
    }
  };

  const handleNavigateToLogin = () => {
    setExistingAccountModal({ open: false, type: 'store', email: '', loading: false, error: '' });
    navigate('/login', { state: { email: existingAccountModal.email, message: 'Sign in with your existing credentials.' } });
  };

  // ── Conflict resolution ────────────────────────────────────────────────────
  const handleConfirmConflicts = async () => {
    setLoading(true);
    try {
      const request: SignupRequest = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        accessType: 'portal-only',
        role: 'individual',
        forceUpdate: true,
      };
      const result = await UnifiedSignupService.handleSignup(request);
      if (result.success) {
        toast({ title: 'Account created!', description: result.message });
        navigate(result.nextStep === 'verify_email' ? '/verify-email' : '/login', {
          state: { email: formData.email, message: result.message },
        });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Features list (left panel) ─────────────────────────────────────────────
  const features = [
    { icon: GraduationCap, text: 'BDA Certification — CP & SCP programmes' },
    { icon: BookOpen,      text: 'Full access to the BDA Learning System' },
    { icon: Award,         text: 'Verified digital credentials & certificates' },
    { icon: Users,         text: 'Join a global community of BD professionals' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — brand ── */}
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: BDA_GRAD }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10 bg-white pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full opacity-10 bg-white pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 bg-white pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="inline-block bg-white/95 rounded-2xl px-6 py-4">
            <img
              src="/bda-logo.png"
              alt="Business Development Association"
              className="h-14 object-contain"
            />
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-3">
              Advance your career in Business Development
            </h1>
            <p className="text-white/65 text-base leading-relaxed">
              Join thousands of professionals who have earned BDA certification and accelerated their careers.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-white/80 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-white/30 text-xs">
          &copy; {new Date().getFullYear()} Business Development Association. All rights reserved.
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[#f7f9fc]">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold"
              style={{ background: BDA_GRAD }}
            >
              BDA
            </div>
            <span className="font-bold text-[#0d1f4e]">Business Development Association</span>
          </div>

          {/* ── Step 1: Registration form ── */}
          {step === 1 && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-[#0d1f4e] mb-1">Create your account</h2>
                <p className="text-slate-500 text-sm">
                  Already have an account?{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="font-semibold hover:underline"
                    style={{ color: BDA_BLUE }}
                  >
                    Sign in
                  </button>
                </p>
              </div>

              <div className="space-y-4">
                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                      First Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={e => update('firstName', e.target.value)}
                      className="h-11 border-slate-200 focus:border-[#0f91e0] focus:ring-[#0f91e0]/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                      Last Name <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Smith"
                      value={formData.lastName}
                      onChange={e => update('lastName', e.target.value)}
                      className="h-11 border-slate-200 focus:border-[#0f91e0] focus:ring-[#0f91e0]/20"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Email Address <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.smith@example.com"
                    value={formData.email}
                    onChange={e => update('email', e.target.value)}
                    className="h-11 border-slate-200 focus:border-[#0f91e0] focus:ring-[#0f91e0]/20"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={formData.password}
                      onChange={e => update('password', e.target.value)}
                      className="h-11 pr-10 border-slate-200 focus:border-[#0f91e0] focus:ring-[#0f91e0]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                    Confirm Password <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConf ? 'text' : 'password'}
                      placeholder="Repeat your password"
                      value={formData.confirmPassword}
                      onChange={e => update('confirmPassword', e.target.value)}
                      className="h-11 pr-10 border-slate-200 focus:border-[#0f91e0] focus:ring-[#0f91e0]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConf(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleSignup}
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 mt-2"
                  style={{ background: BDA_GRAD }}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating account&hellip;</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Create Account</>
                  )}
                </button>

                {/* Partner note */}
                <p className="text-center text-xs text-slate-400 pt-1">
                  Looking to become an ECP or PDP partner?{' '}
                  <a
                    href="https://bda-global.org/partnerships"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-slate-600"
                  >
                    Learn more
                  </a>
                </p>
              </div>
            </>
          )}

          {/* ── Step 3: Conflict resolution ── */}
          {step === 3 && conflicts.length > 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-extrabold text-[#0d1f4e] mb-1">Account conflict detected</h2>
                <p className="text-slate-500 text-sm">
                  We found an existing account with different details. Please review before continuing.
                </p>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your new details will overwrite the existing account data.
                </AlertDescription>
              </Alert>
              {conflicts.map((conflict, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white text-sm">
                  <p className="font-semibold text-slate-700 mb-2">Field: {conflict.field}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Existing</p>
                      <p className="font-medium text-slate-600">{conflict.portalValue || conflict.storeValue}</p>
                    </div>
                    <div>
                      <p className="text-xs mb-1 font-semibold" style={{ color: BDA_BLUE }}>Will be updated to</p>
                      <p className="font-medium text-[#0d1f4e]">{formData.firstName} {formData.lastName}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors"
                >
                  Go back
                </button>
                <button
                  onClick={handleConfirmConflicts}
                  disabled={loading}
                  className="flex-1 h-11 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: BDA_GRAD }}
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing&hellip;</>
                    : 'Confirm & Continue'
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Existing account modal */}
      <ExistingAccountModal
        open={existingAccountModal.open}
        type={existingAccountModal.type}
        email={existingAccountModal.email}
        loading={existingAccountModal.loading}
        error={existingAccountModal.error}
        onSubmitPassword={handleExistingAccountPassword}
        onNavigateToLogin={handleNavigateToLogin}
        onClose={() => setExistingAccountModal(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
