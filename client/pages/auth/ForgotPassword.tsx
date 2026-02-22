import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const translations = {
  en: {
    title: "Reset Password",
    subtitle: "Enter your email address and we'll send you a link to reset your password.",
    emailLabel: "Email Address",
    emailPlaceholder: "Enter your email",
    sendLink: "Send Reset Link",
    sending: "Sending...",
    backToLogin: "Back to Login",
    successTitle: "Check Your Email",
    successMessage: "We've sent a password reset link to your email address. Please check your inbox and follow the instructions.",
    checkSpam: "If you don't see the email, check your spam folder.",
    tryAgain: "Didn't receive the email?",
    resend: "Send again",
    errorTitle: "Error",
    errorMessage: "Failed to send reset link. Please try again.",
    invalidEmail: "Please enter a valid email address.",
  },
  ar: {
    title: "إعادة تعيين كلمة المرور",
    subtitle: "أدخل عنوان بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.",
    emailLabel: "عنوان البريد الإلكتروني",
    emailPlaceholder: "أدخل بريدك الإلكتروني",
    sendLink: "إرسال رابط إعادة التعيين",
    sending: "جارٍ الإرسال...",
    backToLogin: "العودة لتسجيل الدخول",
    successTitle: "تحقق من بريدك الإلكتروني",
    successMessage: "لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى عنوان بريدك الإلكتروني. يرجى التحقق من صندوق الوارد واتباع التعليمات.",
    checkSpam: "إذا لم تجد البريد الإلكتروني، تحقق من مجلد البريد العشوائي.",
    tryAgain: "لم تستلم البريد الإلكتروني؟",
    resend: "أرسل مرة أخرى",
    errorTitle: "خطأ",
    errorMessage: "فشل في إرسال رابط إعادة التعيين. حاول مرة أخرى.",
    invalidEmail: "يرجى إدخال عنوان بريد إلكتروني صالح.",
  },
};

export default function ForgotPassword() {
  const { language } = useLanguage();
  const texts = translations[language];
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast({
        title: texts.errorTitle,
        description: texts.invalidEmail,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('request-password-reset', {
        body: {
          email: email.toLowerCase().trim(),
          redirect_to: `${window.location.origin}/auth/set-password`,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to send reset link');
      }

      setIsSuccess(true);
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: texts.errorTitle,
        description: texts.errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setIsSuccess(false);
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-4">
            <img
              src="/bda-logo.png"
              alt="BDA Logo"
              className="h-20 w-auto mx-auto"
            />
          </div>

          <CardTitle className="text-2xl font-bold text-gray-900">
            {texts.title}
          </CardTitle>
          <p className="text-sm text-gray-600">{texts.subtitle}</p>
        </CardHeader>

        <CardContent>
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {texts.successTitle}
              </h3>
              <p className="text-sm text-gray-600">{texts.successMessage}</p>
              <p className="text-xs text-gray-500">{texts.checkSpam}</p>

              <div className="pt-4 space-y-2">
                <p className="text-sm text-gray-600">{texts.tryAgain}</p>
                <Button
                  variant="outline"
                  onClick={handleResend}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {texts.resend}
                </Button>
              </div>

              <Link
                to="/login"
                className="inline-flex items-center text-sm text-blue-600 hover:underline mt-4"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                {texts.backToLogin}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{texts.emailLabel}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={texts.emailPlaceholder}
                  required
                  className="w-full"
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? texts.sending : texts.sendLink}
              </Button>

              <div className="text-center pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm text-blue-600 hover:underline"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {texts.backToLogin}
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
