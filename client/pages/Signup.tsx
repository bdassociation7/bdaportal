/**
 * Signup Page — BDA Portal
 * Individual Professional registration only.
 * ECP / PDP partner accounts are created through a store purchase or an admin grant.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { IndividualRegistrationService, type ExistingAccountStatus } from '@/services/individual-registration.service';
import {
  Loader2,
  CheckCircle,
  Eye,
  EyeOff,
  GraduationCap,
  BookOpen,
  Award,
  Users,
  KeyRound,
  LogIn,
} from 'lucide-react';

const BDA_BLUE = '#0f91e0';
const BDA_NAVY = '#0d1f4e';
const BDA_GRAD = `linear-gradient(135deg, ${BDA_BLUE} 0%, ${BDA_NAVY} 100%)`;

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [existingAccountStatus, setExistingAccountStatus] = useState<ExistingAccountStatus | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  const update = (field: keyof FormData, value: string) => {
    if (field === 'email') setExistingAccountStatus(null);
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const validate = (): boolean => {
    const { email, password, confirmPassword, firstName, lastName } = formData;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      toast({
        title: 'Required fields missing',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return false;
    }
    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are identical.',
        variant: 'destructive',
      });
      return false;
    }
    if (password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters.',
        variant: 'destructive',
      });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const result = await IndividualRegistrationService.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      if (result.accountStatus === 'existing_confirmed') {
        setExistingAccountStatus('existing_confirmed');
        toast({ title: 'Account already exists', description: result.message });
        return;
      }

      toast({
        title: result.accountStatus === 'existing_unconfirmed' ? 'Confirmation email sent' : 'Account created',
        description: result.message,
      });
      navigate('/verify-email', {
        state: { email: formData.email, message: result.message },
      });
    } catch (error) {
      toast({
        title: 'Unable to create account',
        description: error instanceof Error ? error.message : 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: GraduationCap, text: 'BDA Certification — CP & SCP programmes' },
    { icon: BookOpen, text: 'Full access to the BDA Learning System' },
    { icon: Award, text: 'Verified digital credentials & certificates' },
    { icon: Users, text: 'Join a global community of BD professionals' },
  ];

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: BDA_GRAD }}
      >
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10 bg-white pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full opacity-10 bg-white pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 bg-white pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-block bg-white/95 rounded-2xl px-6 py-4">
            <img src="/bda-logo.png" alt="Business Development Association" className="h-14 object-contain" />
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-3">
              Advance your career in Business Development
            </h1>
            <p className="text-white/65 text-base leading-relaxed">
              Join thousands of professionals who have earned BDA certification and accelerated their careers.
            </p>
          </div>
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

        <p className="relative z-10 text-white/30 text-xs">
          &copy; {new Date().getFullYear()} Business Development Association. All rights reserved.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[#f7f9fc]">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-extrabold" style={{ background: BDA_GRAD }}>
              BDA
            </div>
            <span className="font-bold text-[#0d1f4e]">Business Development Association</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-[#0d1f4e] mb-1">Create your account</h2>
            <p className="text-slate-500 text-sm">
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="font-semibold hover:underline" style={{ color: BDA_BLUE }}>
                Sign in
              </button>
            </p>
          </div>

          {existingAccountStatus === 'existing_confirmed' && (
            <div role="alert" className="mb-6 rounded-xl border border-[#0f91e0]/25 bg-[#f0f6ff] p-4">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#0f91e0]/10">
                  <KeyRound className="h-4 w-4 text-[#0f91e0]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#0d1f4e]">Account already exists</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    An account is already registered with this email address. Please sign in or reset your password.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => navigate('/login')} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-white" style={{ background: BDA_GRAD }}>
                      <LogIn className="h-3.5 w-3.5" /> Sign in
                    </button>
                    <button type="button" onClick={() => navigate('/forgot-password')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#0f91e0]/30 bg-white px-3 text-sm font-semibold text-[#0d1f4e] hover:bg-[#f0f6ff]">
                      <KeyRound className="h-3.5 w-3.5" /> Reset password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">First Name <span className="text-red-400">*</span></Label>
                <Input id="firstName" placeholder="John" value={formData.firstName} onChange={(event) => update('firstName', event.target.value)} className="h-11 border-slate-200 focus:border-[#0f91e0] focus:ring-[#0f91e0]/20" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">Last Name <span className="text-red-400">*</span></Label>
                <Input id="lastName" placeholder="Smith" value={formData.lastName} onChange={(event) => update('lastName', event.target.value)} className="h-11 border-slate-200 focus:border-[#0f91e0] focus:ring-[#0f91e0]/20" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address <span className="text-red-400">*</span></Label>
              <Input id="email" type="email" placeholder="john.smith@example.com" value={formData.email} onChange={(event) => update('email', event.target.value)} className="h-11 border-slate-200 focus:border-[#0f91e0] focus:ring-[#0f91e0]/20" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password <span className="text-red-400">*</span></Label>
              <div className="relative">
                <Input id="password" type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters" value={formData.password} onChange={(event) => update('password', event.target.value)} className="h-11 pr-10 border-slate-200 focus:border-[#0f91e0] focus:ring-[#0f91e0]/20" />
                <button type="button" onClick={() => setShowPass((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={showPass ? 'Hide password' : 'Show password'}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm Password <span className="text-red-400">*</span></Label>
              <div className="relative">
                <Input id="confirmPassword" type={showConf ? 'text' : 'password'} placeholder="Repeat your password" value={formData.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} className="h-11 pr-10 border-slate-200 focus:border-[#0f91e0] focus:ring-[#0f91e0]/20" />
                <button type="button" onClick={() => setShowConf((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={showConf ? 'Hide password' : 'Show password'}>
                  {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="button" onClick={handleSignup} disabled={loading} className="w-full h-12 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 mt-2" style={{ background: BDA_GRAD }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account&hellip;</> : <><CheckCircle className="w-4 h-4" /> Create Account</>}
            </button>

            <p className="text-center text-xs text-slate-400 pt-1">
              Looking to become an ECP or PDP partner?{' '}
              <a href="https://bda-global.org/partnerships" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Learn more</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
