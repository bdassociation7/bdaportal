/**
 * ECPApplication.tsx
 *
 * Hero Section for the Education & Certification Partner (ECP) application.
 * Parent page — forms will be child routes.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, CheckCircle } from 'lucide-react';

const HIGHLIGHTS = [
  'Authorised to deliver BDA certification training',
  'Access to official BDA exam vouchers for candidates',
  'Listed in the BDA Authorised Providers directory',
  'Dedicated ECP Partner portal and toolkit',
];

export default function ECPApplication() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero Section ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 pt-14 pb-16">
          {/* Back */}
          <button
            onClick={() => navigate('/partnerships/apply')}
            className="flex items-center gap-2 text-gray-400 hover:text-[#0f91e0] text-sm mb-10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All Partnerships
          </button>

          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#0f91e0]/10 flex items-center justify-center">
              <Award className="h-5 w-5 text-[#0f91e0]" />
            </div>
            <span className="text-xs font-bold text-[#0f91e0] uppercase tracking-widest border border-[#0f91e0]/30 rounded-full px-3 py-0.5">
              ECP — Partnership Application
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-bold text-[#0d1f4e] leading-tight mb-5">
            Education &amp; Certification<br className="hidden md:block" /> Partner Programme
          </h1>

          {/* Divider accent */}
          <div className="w-16 h-1 bg-[#0f91e0] rounded-full mb-6" />

          {/* Description */}
          <p className="text-gray-600 text-lg max-w-2xl leading-relaxed mb-10">
            Become an authorised BDA Education &amp; Certification Partner and deliver
            world-class certification training programmes that prepare professionals for
            globally recognised BDA credentials.
          </p>

          {/* Highlights */}
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-gray-600 text-sm">
                <CheckCircle className="h-4 w-4 text-[#0f91e0] mt-0.5 shrink-0" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Placeholder for form (child route) ── */}
      <div className="max-w-5xl mx-auto px-6 py-16 text-center text-gray-400 text-sm">
        Application form will appear here.
      </div>
    </div>
  );
}
