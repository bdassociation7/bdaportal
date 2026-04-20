import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

interface LearningSystemLayoutProps {
  children: React.ReactNode;
}

export function LearningSystemLayout({ children }: LearningSystemLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Detect current language from URL query param
  const searchParams = new URLSearchParams(location.search);
  const currentLang = searchParams.get('lang') || 'EN';
  const isArabic = currentLang === 'AR';

  // Determine back destination based on path
  const isECP = location.pathname.startsWith('/ecp/');
  const backPath = isECP ? '/ecp/dashboard' : '/individual/dashboard';
  const backLabel = isArabic ? 'العودة للبوابة' : 'Back to Portal';

  return (
    <div className={cn("min-h-screen bg-gray-50", isArabic && "font-arabic")} dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Minimal Top Navigation Bar */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-6 h-14"
        style={{ background: 'linear-gradient(135deg, #0d1f4e 0%, #1C4A8B 50%, #0f91e0 100%)' }}
      >
        {/* Back to Portal */}
        <button
          onClick={() => navigate(backPath)}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-medium group"
        >
          <ArrowLeft className={cn("h-4 w-4 transition-transform", isArabic ? "group-hover:translate-x-1 rotate-180" : "group-hover:-translate-x-1")} />
          <span>{backLabel}</span>
        </button>

        {/* Center: BDA Learning System branding */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
            <span
              className="text-xs font-extrabold"
              style={{
                background: 'linear-gradient(135deg, #0f91e0, #0d1f4e)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              BDA
            </span>
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">
            {isArabic ? 'نظام التعلم' : 'Learning System'}
          </span>
          <span
            className="text-xs px-2.5 py-0.5 rounded-full font-medium border border-white/30 text-white/80"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            {isArabic ? 'العربية' : 'English'}
          </span>
        </div>

        {/* Right spacer for balance */}
        <div className="w-[110px]" />
      </header>

      {/* Page Content */}
      <main>
        {children}
      </main>
    </div>
  );
}
