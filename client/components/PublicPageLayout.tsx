/**
 * Public Page Layout
 *
 * Simple layout for public pages that don't require authentication
 * Provides consistent header/footer without portal navigation
 */

import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LogIn,
  GraduationCap,
  Building2,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

interface PublicPageLayoutProps {
  children: ReactNode;
}

export function PublicPageLayout({ children }: PublicPageLayoutProps) {
  const { language, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: '/public/programs', label: language === 'ar' ? 'البرامج المعتمدة' : 'Accredited Programs', icon: GraduationCap },
    { path: '/public/providers', label: language === 'ar' ? 'المزودون المعتمدون' : 'Authorized Providers', icon: Building2 },
    { path: '/verify', label: language === 'ar' ? 'التحقق من الشهادات' : 'Verify Credentials', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/bda-logo.png"
                alt="BDA"
                className="h-10 w-auto"
              />
              <span className="hidden sm:inline text-lg font-bold text-gray-800">
                {language === 'ar' ? 'جمعية تطوير الأعمال' : 'BDA'}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {/* Login Button */}
              <Link to="/login">
                <Button size="sm" className="hidden sm:flex items-center gap-1">
                  <LogIn className="h-4 w-4" />
                  {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
                </Button>
              </Link>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <nav className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg mt-2"
                >
                  <LogIn className="h-4 w-4" />
                  {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/bda-logo.png"
                alt="BDA"
                className="h-8 w-auto brightness-0 invert"
              />
              <span className="text-sm">
                © {new Date().getFullYear()} {language === 'ar' ? 'جمعية تطوير الأعمال (BDA®)' : 'Business Development Association (BDA®)'}
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a
                href="https://bda-global.org"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                {language === 'ar' ? 'الموقع الرسمي' : 'Main Website'}
              </a>
              <a
                href="https://bda-global.org/contact"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                {language === 'ar' ? 'اتصل بنا' : 'Contact Us'}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicPageLayout;
