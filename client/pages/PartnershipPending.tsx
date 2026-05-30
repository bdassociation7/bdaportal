/**
 * PartnershipPending.tsx
 *
 * Shown to users who registered as ECP or PDP partner but are still pending approval.
 * Provides two clear CTAs:
 *   1. Purchase ECP/PDP partnership from the BDA Store
 *   2. Submit a partnership application via email
 */
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  ShoppingCart,
  Mail,
  CheckCircle,
  ArrowRight,
  Shield,
  Building2,
  LogOut,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

const STORE_ECP_URL = 'https://bda-global.org/en/product/ecp-standard/';
const STORE_PDP_URL = 'https://bda-global.org/en/product/pdp/';
const PARTNERSHIP_EMAIL = 'partnerships@bda-global.org';

export default function PartnershipPending() {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  const role = user?.profile?.role ?? '';
  const isECP = role === 'ecp_pending';
  const partnershipType = isECP ? 'ECP' : 'PDP';
  const storeUrl = isECP ? STORE_ECP_URL : STORE_PDP_URL;
  const emailSubject = isECP
    ? 'ECP Partnership Application'
    : 'PDP Partnership Application';
  const emailBody = `Dear BDA Partnerships Team,\n\nI would like to apply for a ${partnershipType} Partnership.\n\nName: ${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}\nEmail: ${user?.profile?.email ?? ''}\nOrganisation: ${user?.profile?.company_name ?? ''}\n\nPlease review my application.\n\nKind regards`;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d2b5e] via-[#1a3f7a] to-[#0d2b5e] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">

        {/* Header */}
        <div className="text-center text-white space-y-3">
          <div className="flex justify-center">
            <div className="bg-white/10 rounded-full p-4">
              {isECP
                ? <Shield className="h-10 w-10 text-white" />
                : <Building2 className="h-10 w-10 text-white" />
              }
            </div>
          </div>
          <h1 className="text-3xl font-bold">
            {partnershipType} Partnership Application
          </h1>
          <p className="text-white/70 text-lg">
            Your account is registered as a <strong>{partnershipType} Partner</strong> applicant.
            To activate your partnership, please choose one of the options below.
          </p>
          <Badge className="bg-amber-500/20 text-amber-200 border-amber-400/30 text-sm px-4 py-1">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Pending Activation
          </Badge>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Option 1: Purchase from Store */}
          <Card className="border-0 bg-white shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#0d2b5e]/10 rounded-lg p-2.5">
                  <ShoppingCart className="h-6 w-6 text-[#0d2b5e]" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Purchase Partnership</h2>
                  <p className="text-sm text-gray-500">Instant activation</p>
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed">
                Purchase your <strong>{partnershipType} Partnership</strong> directly from the BDA Store.
                Your account will be activated automatically upon successful payment.
              </p>

              <ul className="space-y-2">
                {[
                  'Instant account activation',
                  'Secure online payment',
                  'Official partnership certificate',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full bg-[#0d2b5e] hover:bg-[#0d2b5e]/90 text-white"
                onClick={() => window.open(storeUrl, '_blank')}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Purchase {partnershipType} Partnership
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Option 2: Apply via Email */}
          <Card className="border-0 bg-white shadow-xl hover:shadow-2xl transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Advanced Tiers</h2>
                  <p className="text-sm text-gray-500">Advanced & Premium partnerships</p>
                </div>
              </div>

              <p className="text-gray-600 text-sm leading-relaxed">
                Looking for <strong>Advanced</strong> or <strong>Premium</strong> {partnershipType} tiers?
                Contact our partnerships team directly for a tailored offer and personalised onboarding.
              </p>

              <ul className="space-y-2">
                {[
                  'Advanced & Premium tiers available',
                  'Flexible partnership terms',
                  'Dedicated onboarding support',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                variant="outline"
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() =>
                  window.open(
                    `mailto:${PARTNERSHIP_EMAIL}?subject=${encodeURIComponent(`${partnershipType} Advanced/Premium Partnership Enquiry`)}&body=${encodeURIComponent(emailBody)}`,
                    '_blank'
                  )
                }
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact {PARTNERSHIP_EMAIL}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info note */}
        <Card className="border-0 bg-white/10 backdrop-blur">
          <CardContent className="p-4">
            <p className="text-white/80 text-sm text-center">
              Already purchased your partnership?{' '}
              <strong className="text-white">
                Your account will be activated automatically.
              </strong>{' '}
              If your account is not activated within 24 hours, contact{' '}
              <a
                href={`mailto:${PARTNERSHIP_EMAIL}`}
                className="underline text-white hover:text-white/80"
              >
                {PARTNERSHIP_EMAIL}
              </a>.
            </p>
          </CardContent>
        </Card>

        {/* Sign out */}
        <div className="text-center">
          <button
            onClick={handleSignOut}
            className="text-white/50 hover:text-white/80 text-sm flex items-center gap-1.5 mx-auto transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>

      </div>
    </div>
  );
}
