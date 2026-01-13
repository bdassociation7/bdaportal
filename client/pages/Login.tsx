import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnifiedAuth } from '@/shared/hooks/useUnifiedAuth';
import { useToast } from "@/hooks/use-toast";
import { AuthStorageService } from "@/shared/utils/auth-storage";

export default function Login() {
  const { t, isRTL } = useLanguage();
  const { user, login, isLoading } = useUnifiedAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

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
  const [rememberEmail, setRememberEmail] = useState(true);

  // Load saved email on mount
  React.useEffect(() => {
    const savedEmail = AuthStorageService.getLastEmail();
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
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

      // Save email if remember is enabled (only after successful login)
      if (rememberEmail) {
        AuthStorageService.saveLastEmail(email);
      } else {
        AuthStorageService.clearLastEmail();
      }

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
    <div className="min-h-screen bg-gradient-to-b from-primary to-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto mb-6 py-4">
            <img
              src="/bda-logo.png"
              alt="BDA Logo"
              className="h-40 w-auto mx-auto"
              style={{ maxWidth: '100%', objectFit: 'contain' }}
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {t('auth.bdaCertification')}
          </CardTitle>
          <p className="text-sm font-semibold text-blue-600">
            BDA-CP | BDA-SCP
          </p>
          <p className="text-sm text-gray-600">
            {t('auth.globalAuthority')}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('common.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                required
                className="w-full"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('common.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                required
                className="w-full"
                disabled={isLoading}
              />
            </div>

            {/* Remember email & Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-email"
                  checked={rememberEmail}
                  onCheckedChange={(checked) => setRememberEmail(checked as boolean)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="remember-email"
                  className="text-sm text-gray-600 cursor-pointer"
                >
                  {t('auth.rememberEmail')}
                </Label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? t('auth.signingIn') : t('auth.signIn')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('auth.noAccount')}{' '}
              <Link to="/signup" className="text-blue-600 hover:underline font-medium">
                {t('auth.createAccount')}
              </Link>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {t('auth.needHelp')}{" "}
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

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              {t('auth.joinProfessionals')}<br />
              <strong>{t('auth.shapingFuture')}</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
