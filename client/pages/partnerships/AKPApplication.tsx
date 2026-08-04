/**
 * AKPApplication.tsx
 *
 * Hero Section for the Academic Knowledge Partner (AKP) application.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, CheckCircle } from 'lucide-react';

const HIGHLIGHTS = [
  'Integrate BDA BoCK™ into academic curricula',
  'Co-author research and knowledge publications with BDA',
  'Offer BDA student membership benefits to enrolled students',
  'Recognition as an official BDA Academic Knowledge Partner',
];

export default function AKPApplication() {
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
              <GraduationCap className="h-5 w-5 text-[#0f91e0]" />
            </div>
            <span className="text-xs font-bold text-[#0f91e0] uppercase tracking-widest border border-[#0f91e0]/30 rounded-full px-3 py-0.5">
              AKP — Partnership Application
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-bold text-[#0d1f4e] leading-tight mb-5">
            Academic Knowledge<br className="hidden md:block" /> Partner Programme
          </h1>

          {/* Divider accent */}
          <div className="w-16 h-1 bg-[#0f91e0] rounded-full mb-6" />

          {/* Description */}
          <p className="text-gray-600 text-lg max-w-2xl leading-relaxed mb-10">
            Partner with BDA as an Academic Knowledge Partner and bridge the gap between
            academic research and professional business development practice on a global scale.
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

      {/* ── Placeholder for form ── */}
      <div className="max-w-5xl mx-auto px-6 py-16 text-center text-gray-400 text-sm">
        Application form will appear here.
      </div>
    </div>
  );
}
