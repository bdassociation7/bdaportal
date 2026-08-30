import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnifiedAuth } from '@/shared/hooks/useUnifiedAuth';
import { useToast } from "@/hooks/use-toast";
import { usePublicPageSeo } from '@/features/seo/publicSeo';
import { AuthStorageService } from "@/shared/utils/auth-storage";
import { Mail, Lock } from "lucide-react";

export default function Login() {
  const { t, isRTL } = useLanguage();
  const { user, login, isLoading } = useUnifiedAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  usePublicPageSeo('portal-home', 'en', {
    title: 'BDA Portal | Business Development Association',
    description: 'Secure portal for BDA professional learning, certification, membership, and partner services.',
    keywords: 'BDA Portal, Business Development Association, professional learning, certification',
    canonicalUrl: 'https://portal.bda-global.org/',
    robotsDirective: 'index, follow',
    schemaType: 'Organization',
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Show session expired message if redirected due to session expiry
  React.useEffect(() => {
    if (location.state?.sessionExpired) {
      toast({
        title: t('auth.sessionExpired'),
        description: t('auth.sessionExpiredMessage'),
        variant: 'default',
      });

      // Clear the state to prevent showing message again on refresh
      window.history.replaceState({}, document.title);
    }

    if (location.state?.tokenRefreshFailed) {
      toast({
        title: t('auth.authError'),
        description: t('auth.tokenRefreshFailed'),
        variant: 'destructive',
      });

      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast, t]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Load saved email on mount
  React.useEffect(() => {
    const savedEmail = AuthStorageService.getLastEmail();
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const from = location.state?.from || "/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: t('common.error'),
        description: t('auth.enterBothFields'),
        variant: "destructive",
      });
      return;
    }

    try {
      await login(email, password);

      // Save email for next login
      AuthStorageService.saveLastEmail(email);

      toast({
        title: t('common.success'),
        description: t('auth.loginSuccess'),
      });
      navigate(from, { replace: true });
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : t('auth.invalidCredentials');

      toast({
        title: t('auth.loginFailed'),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Background image */}
      <div
        className="hidden lg:block lg:w-1/2 xl:w-3/5 relative"
      >
        <img
          src="/login-bg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1c4a8b]/60 to-transparent z-[1]" />

        {/* Content on image */}
        <div className="absolute inset-0 z-[2] flex flex-col justify-end p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            {t('auth.joinProfessionals')}
          </h2>
          <p className="text-lg opacity-90">
            {t('auth.shapingFuture')}
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-2">
            <img
              src="/bda-logo.png?v=5"
              alt="BDA - Business Development Association"
              className="w-[75%] h-auto mx-auto"
            />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-gray-600 mb-6">
            {t('auth.noAccount')}{' '}
            <Link to="/signup" className="text-blue-600 hover:underline font-medium">
              {t('auth.registerFree')}
            </Link>
          </p>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email field */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('common.email')}
                required
                className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white"
                disabled={isLoading}
              />
            </div>

            {/* Password field */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('common.password')}
                required
                className="pl-10 h-12 bg-gray-50 border-gray-200 focus:bg-white"
                disabled={isLoading}
              />
            </div>

            {/* Login button */}
            <Button
              type="submit"
              className="w-full h-12 bg-[#1c4a8b] hover:bg-[#163a6e] text-white font-medium text-base"
              disabled={isLoading}
            >
              {isLoading ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>

          {/* Forgot password */}
          <div className="text-center mt-4">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>

          {/* Help text */}
          <p className="text-center text-xs text-gray-500 mt-8 leading-relaxed">
            {t('auth.usernameIsEmail')}{' '}
            {t('auth.troubleAccessing')}{' '}
            <a
              href="mailto:info@bda-global.org"
              className="text-blue-600 hover:underline"
            >
              info@bda-global.org
            </a>
          </p>

          {/* Back to website link */}
          <div className="text-center mt-4">
            <a
              href="https://bda-global.org"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← {t('auth.backToWebsite')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
