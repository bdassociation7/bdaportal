/**
 * Public Page Layout
 *
 * Layout for public pages with two-tier header:
 * - Top: BDA logo + "BDA CERTIFICATION / BDA-CP | BDA-SCP"
 * - Nav bar: Activities | Certificant Directory | Recertification Provider Directory
 */

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LogIn,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { SeoFallback, usePublicPageSeo } from '@/features/seo/publicSeo';

interface PublicPageLayoutProps {
  children: ReactNode;
}

const DEFAULT_PUBLIC_SEO: SeoFallback = {
  title: 'BDA Certification | Business Development Association',
  description: 'Explore BDA professional certification, accredited programmes, and credential verification services.',
  canonicalUrl: 'https://portal.bda-global.org/',
};

const PUBLIC_PAGE_SEO: Record<string, { key: string; fallback: SeoFallback }> = {
  '/public/programs': {
    key: 'public-programmes',
    fallback: {
      title: 'BDA Approved Programmes | Accredited Professional Development Programmes',
      description: 'Explore BDA-approved professional development programmes and accredited learning activities.',
      canonicalUrl: 'https://portal.bda-global.org/public/programs',
      schemaType: 'CollectionPage',
    },
  },
  '/public/providers': {
    key: 'public-providers',
    fallback: {
      title: 'BDA Partners Directory | PDP and ECP Partners Worldwide',
      description: 'Find BDA Education and Certification Partners and Professional Development Partners worldwide.',
      canonicalUrl: 'https://portal.bda-global.org/public/providers',
      schemaType: 'CollectionPage',
    },
  },
  '/public/verify': {
    key: 'credential-verification',
    fallback: {
      title: 'Verify BDA Certification | Credential Verification',
      description: 'Verify BDA professional certification credentials through the official Business Development Association directory.',
      canonicalUrl: 'https://portal.bda-global.org/verify',
    },
  },
};

const navLinks = [
  { path: '/public/programs',  labelEn: 'Activities',                         labelAr: 'الأنشطة' },
  { path: '/public/providers', labelEn: 'BDA Partners Directory',  labelAr: 'دليل شركاء BDA' },
  { path: '/public/verify',    labelEn: 'Certificant Directory',               labelAr: 'دليل حاملي الشهادات' },
];

export function PublicPageLayout({ children }: PublicPageLayoutProps) {
  const { language } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const path = location.pathname.replace(/\/$/, '');
  const pageSeo = PUBLIC_PAGE_SEO[path];
  usePublicPageSeo(pageSeo?.key, language === 'ar' ? 'ar' : 'en', pageSeo?.fallback || DEFAULT_PUBLIC_SEO);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>

      {/* ── Top identity bar ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {/* Logo + title block */}
            <Link to="/" className="flex items-center gap-4">
              <img
                src="/bda-logo.png"
                alt="BDA"
                className="h-16 w-auto"
              />
              <div className="flex flex-col leading-tight">
                <span className="text-xl font-extrabold text-gray-900 tracking-wide uppercase">
                  {language === 'ar' ? 'اعتماد BDA' : 'BDA CERTIFICATION'}
                </span>
                <span className="text-base font-semibold text-gray-600 tracking-widest">
                  {language === 'ar' ? 'BDA-CP | BDA-SCP' : 'BDA-CP | BDA-SCP'}
                </span>
              </div>
            </Link>

            {/* Login button (top-right) */}
            <Link to="/login">
              <Button size="sm" className="hidden sm:flex items-center gap-1.5">
                <LogIn className="h-4 w-4" />
                {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Navigation bar ── */}
      <nav className="bg-[#3a3a3a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-11">

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center h-full">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                const label = language === 'ar' ? link.labelAr : link.labelEn;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`
                      h-full flex items-center px-5 text-sm font-medium transition-colors
                      ${isActive
                        ? 'bg-[#5a8a3c] text-white'
                        : 'text-gray-300 hover:bg-[#4a4a4a] hover:text-white'}
                    `}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-gray-300 hover:text-white p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Mobile login */}
            <Link to="/login" className="md:hidden">
              <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white">
                <LogIn className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-600 py-2">
              {navLinks.map((link) => {
                const label = language === 'ar' ? link.labelAr : link.labelEn;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-[#4a4a4a] hover:text-white"
                  >
                    {label}
                  </Link>
                );
              })}
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm text-blue-400 hover:bg-[#4a4a4a] mt-1"
              >
                {language === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Link>
            </div>
          )}
        </div>
      </nav>

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
