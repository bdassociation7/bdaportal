import { ShieldCheck, ExternalLink, Search, Award, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Verify Certification Page
 * Simple redirect page to the public certification verification portal
 */

const PUBLIC_VERIFY_URL = 'https://portal.bda-global.org/public/verify';

export default function VerifyCertification() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0f91e0] to-[#0d1f4e] rounded-xl p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="h-9 w-9" />
          <h1 className="text-3xl font-bold">Verify a BDA Certification</h1>
        </div>
        <p className="text-white/85 text-base leading-relaxed">
          Confirm the authenticity and current status of any BDA credential using our
          public verification portal — accessible to anyone, no login required.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <div className="flex flex-col items-center text-center gap-6">
          {/* Icon cluster */}
          <div className="flex items-center justify-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#0f91e0]/10 flex items-center justify-center">
              <Search className="h-7 w-7 text-[#0f91e0]" />
            </div>
            <div className="w-14 h-14 rounded-full bg-[#0d1f4e]/10 flex items-center justify-center">
              <Award className="h-7 w-7 text-[#0d1f4e]" />
            </div>
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <Globe className="h-7 w-7 text-green-600" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">
              BDA Public Verification Portal
            </h2>
            <p className="text-gray-600 max-w-lg leading-relaxed">
              Our verification portal allows you to look up any BDA certification by
              <strong className="text-gray-800"> Credential ID</strong> or
              <strong className="text-gray-800"> Holder Name</strong>. Results are
              real-time and reflect the current status in the BDA registry.
            </p>
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            className="bg-[#0f91e0] hover:bg-[#0d7bc4] text-white px-8 py-3 text-base font-semibold rounded-lg flex items-center gap-2 shadow-md"
            onClick={() => window.open(PUBLIC_VERIFY_URL, '_blank', 'noopener,noreferrer')}
          >
            <ShieldCheck className="h-5 w-5" />
            Open Verification Portal
            <ExternalLink className="h-4 w-4 ml-1 opacity-75" />
          </Button>

          <p className="text-xs text-gray-400">
            Opens in a new tab &mdash; no login required
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          How Verification Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: '1',
              title: 'Enter Credential ID',
              desc: 'Use the unique ID printed on the certificate (e.g. BDA-CP-2026-A7K2M9)',
            },
            {
              step: '2',
              title: 'Or Search by Name',
              desc: 'Enter the certificate holder\'s full or partial name to find matching records',
            },
            {
              step: '3',
              title: 'Instant Result',
              desc: 'View the certification status, issue date, expiry, and holder details in real time',
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-[#0f91e0] text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {step}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
