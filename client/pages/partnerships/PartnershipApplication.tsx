/**
 * PartnershipApplication.tsx
 *
 * Parent page for all partnership applications.
 * Contains a Hero Section and links to the four partnership types.
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Award, BookOpen, GraduationCap, Handshake } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PARTNERSHIPS = [
  {
    code: 'ECP',
    title: 'Education & Certification Partner',
    abbr: 'ECP',
    description:
      'Authorised to deliver BDA certification training programmes and prepare candidates for BDA professional examinations.',
    icon: Award,
    path: '/partnerships/apply/ecp',
    color: 'from-[#0f91e0] to-[#0d1f4e]',
  },
  {
    code: 'PDP',
    title: 'Professional Development Provider',
    abbr: 'PDP',
    description:
      'Accredited to offer BDA-aligned professional development programmes and continuing education for business professionals.',
    icon: BookOpen,
    path: '/partnerships/apply/pdp',
    color: 'from-[#0d1f4e] to-[#0f91e0]',
  },
  {
    code: 'AKP',
    title: 'Academic Knowledge Partner',
    abbr: 'AKP',
    description:
      'Universities and academic institutions collaborating with BDA to integrate business development knowledge into academic curricula.',
    icon: GraduationCap,
    path: '/partnerships/apply/akp',
    color: 'from-[#0a2a6e] to-[#0f91e0]',
  },
  {
    code: 'SAP',
    title: 'Strategic Alliance Partner',
    abbr: 'SAP',
    description:
      'Organisations forming a strategic alliance with BDA to co-develop initiatives, share resources, and advance the business development profession.',
    icon: Handshake,
    path: '/partnerships/apply/sap',
    color: 'from-[#0f91e0] to-[#0a2a6e]',
  },
];

export default function PartnershipApplication() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero Section ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 pt-14 pb-16">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-[#0f91e0] text-sm mb-10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Portal
          </button>

          {/* Eyebrow */}
          <p className="text-[#0f91e0] text-sm font-semibold uppercase tracking-widest mb-3">
            BDA Global Partnerships
          </p>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-bold text-[#0d1f4e] leading-tight mb-5">
            Partner with the Business<br className="hidden md:block" /> Development Association
          </h1>

          {/* Divider accent */}
          <div className="w-16 h-1 bg-[#0f91e0] rounded-full mb-6" />

          {/* Sub-headline */}
          <p className="text-gray-600 text-lg max-w-2xl leading-relaxed">
            Join a global network of organisations committed to advancing the business development
            profession. Select a partnership type below to begin your application.
          </p>
        </div>
      </section>

      {/* ── Partnership Cards ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-[#0d1f4e] mb-2">Choose a Partnership Type</h2>
        <p className="text-gray-500 mb-10 text-sm">
          Each partnership type offers a distinct set of benefits and responsibilities aligned with your organisation's mission.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PARTNERSHIPS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.code}
                onClick={() => navigate(p.path)}
                className="group text-left border border-gray-200 rounded-2xl p-6 hover:border-[#0f91e0] hover:shadow-lg transition-all duration-200 bg-white"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} mb-4`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[#0f91e0] uppercase tracking-widest border border-[#0f91e0]/30 rounded-full px-2 py-0.5">
                    {p.abbr}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#0d1f4e] mb-2 group-hover:text-[#0f91e0] transition-colors">
                  {p.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{p.description}</p>
                <span className="flex items-center gap-1 text-[#0f91e0] text-sm font-semibold">
                  Apply Now <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
