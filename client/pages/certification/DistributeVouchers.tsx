/**
 * DistributeVouchers Page
 *
 * Allows bulk distribution of exam vouchers.
 * Step 1: User selects Certification Type (BDA-CP™ / BDA-SCP™) + Language (Arabic / English)
 * Step 2: Available vouchers of that type/language are shown
 * Step 3: User enters recipient emails (max = available vouchers count)
 * Step 4: Distribution is done from the filtered pool only
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Send, Ticket, CheckCircle2, AlertCircle,
  Info, ArrowLeft, Mail, Filter, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMergedVouchers } from '@/entities/quiz';
import { supabase } from '@/lib/supabase';
import { getUserFriendlyError } from '@/lib/error-handler';
import type { CertificationType, ExamLanguage } from '@/entities/quiz';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ParsedEmail {
  email: string;
  valid: boolean;
  duplicate: boolean;
}

interface DistributionResult {
  email: string;
  voucherCode: string;
  success: boolean;
  error?: string;
}

// Certification type options with BDA brand names
const CERT_OPTIONS: { value: CertificationType; label: string; description: string }[] = [
  {
    value: 'CP',
    label: 'BDA-CP™',
    description: 'BDA Certified Professional',
  },
  {
    value: 'SCP',
    label: 'BDA-SCP™',
    description: 'BDA Senior Certified Professional',
  },
];

// Language options
const LANG_OPTIONS: { value: ExamLanguage; label: string; flag: string }[] = [
  { value: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
];

export default function DistributeVouchers() {
  const navigate = useNavigate();
  const { vouchers, isLoading } = useMergedVouchers();

  // ── Step 1: Filter selection ──────────────────────────────────────────────
  const [selectedCertType, setSelectedCertType] = useState<CertificationType | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<ExamLanguage | null>(null);

  // ── Step 2: Email input ───────────────────────────────────────────────────
  const [emailInput, setEmailInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<DistributionResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // All available (active, not transferred) vouchers
  const allAvailableVouchers = useMemo(() =>
    vouchers.filter((v) => {
      const raw = v._raw as Record<string, unknown>;
      const transferCount = (raw.transfer_count as number) ?? 0;
      return v.displayInfo.status === 'active' && transferCount === 0;
    }),
    [vouchers]
  );

  // Summary counts per type+language for the filter step
  const voucherSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    allAvailableVouchers.forEach((v) => {
      const key = `${v.certification_type}__${v.exam_language}`;
      summary[key] = (summary[key] ?? 0) + 1;
    });
    return summary;
  }, [allAvailableVouchers]);

  // Filtered vouchers based on selected type + language
  const filteredVouchers = useMemo(() => {
    if (!selectedCertType || !selectedLanguage) return [];
    return allAvailableVouchers.filter(
      (v) => v.certification_type === selectedCertType && v.exam_language === selectedLanguage
    );
  }, [allAvailableVouchers, selectedCertType, selectedLanguage]);

  const filterSelected = selectedCertType !== null && selectedLanguage !== null;

  // Reset email input when filter changes
  const handleCertTypeChange = (val: CertificationType) => {
    setSelectedCertType(val);
    setEmailInput('');
    setConfirmed(false);
    setGlobalError(null);
    setShowResults(false);
  };
  const handleLanguageChange = (val: ExamLanguage) => {
    setSelectedLanguage(val);
    setEmailInput('');
    setConfirmed(false);
    setGlobalError(null);
    setShowResults(false);
  };

  // Parse & validate emails from textarea
  const parsedEmails = useMemo((): ParsedEmail[] => {
    if (!emailInput.trim()) return [];
    const raw = emailInput
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);

    const seen = new Set<string>();
    return raw.map((email) => {
      const valid = EMAIL_REGEX.test(email);
      const duplicate = seen.has(email);
      if (!duplicate) seen.add(email);
      return { email, valid, duplicate };
    });
  }, [emailInput]);

  const validEmails = parsedEmails.filter((e) => e.valid && !e.duplicate);
  const invalidEmails = parsedEmails.filter((e) => !e.valid);
  const duplicateEmails = parsedEmails.filter((e) => e.duplicate);
  const exceedsVouchers = validEmails.length > filteredVouchers.length;

  const canDistribute =
    filterSelected &&
    validEmails.length > 0 &&
    !exceedsVouchers &&
    !isSending &&
    confirmed;

  const handleDistribute = async () => {
    if (!canDistribute) return;
    setGlobalError(null);
    setIsSending(true);
    setShowResults(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setGlobalError('Authentication error. Please log in again.');
      setIsSending(false);
      return;
    }

    // Use only the filtered vouchers (by cert type + language), shuffled randomly
    const shuffled = [...filteredVouchers].sort(() => Math.random() - 0.5);
    const toDistribute = shuffled.slice(0, validEmails.length);

    const distributionResults: DistributionResult[] = [];

    for (let i = 0; i < validEmails.length; i++) {
      const email = validEmails[i].email;
      const voucher = toDistribute[i];
      const raw = voucher._raw as Record<string, unknown>;
      const voucherId = raw.id as string;
      const voucherCode = raw.voucher_code as string;

      try {
        const { data, error: fnErr } = await supabase.rpc('transfer_voucher', {
          p_voucher_id: voucherId,
          p_recipient_email: email,
        });

        if (fnErr) throw fnErr;
        if (data && !data.success) throw new Error(data.error || 'Transfer failed');

        await supabase.functions.invoke('send-voucher-transfer', {
          body: {
            voucher_id: voucherId,
            recipient_email: email,
            recipient_has_account: data?.recipient_has_account ?? false,
            sender_user_id: user.id,
          },
        });

        distributionResults.push({ email, voucherCode, success: true });
      } catch (err: unknown) {
        const msg = getUserFriendlyError(err, 'Transfer failed. Please try again.');
        distributionResults.push({ email, voucherCode, success: false, error: msg });
      }
    }

    setResults(distributionResults);
    setShowResults(true);
    setIsSending(false);
    setEmailInput('');
    setConfirmed(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  // Selected cert label for display
  const selectedCertLabel = CERT_OPTIONS.find((c) => c.value === selectedCertType)?.label ?? '';
  const selectedLangLabel = LANG_OPTIONS.find((l) => l.value === selectedLanguage)?.label ?? '';

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-gray-500">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] via-[#1e4d8c] to-[#2563eb] rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-7 w-7" />
          Distribute Vouchers
        </h1>
        <p className="mt-1 opacity-90 text-sm">
          Send exam vouchers to multiple recipients at once. Select the exam type and language first, then enter recipient emails.
        </p>
      </div>

      {/* No vouchers at all */}
      {allAvailableVouchers.length === 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-10 text-center">
            <Ticket className="h-14 w-14 text-orange-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-orange-900 mb-1">No Vouchers Available</h3>
            <p className="text-orange-700 text-sm">
              You have no available vouchers to distribute. Purchase exam vouchers to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 1: Filter ─────────────────────────────────────────────────── */}
      {allAvailableVouchers.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-blue-900">
              <Filter className="h-5 w-5 text-blue-600" />
              Step 1 — Select Exam Type &amp; Language
            </CardTitle>
            <CardDescription>
              Choose which vouchers to distribute. Only vouchers matching your selection will be used.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Certification Type */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Certification Type</p>
              <div className="grid grid-cols-2 gap-3">
                {CERT_OPTIONS.map((opt) => {
                  const count = (voucherSummary[`${opt.value}__ar`] ?? 0) + (voucherSummary[`${opt.value}__en`] ?? 0);
                  const isSelected = selectedCertType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleCertTypeChange(opt.value)}
                      className={`relative flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                    >
                      <span className={`text-base font-bold ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                        {opt.label}
                      </span>
                      <span className="text-xs text-gray-500 mt-0.5">{opt.description}</span>
                      <Badge
                        className={`mt-2 text-xs px-2 py-0.5 ${
                          count > 0
                            ? isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {count} voucher{count !== 1 ? 's' : ''}
                      </Badge>
                      {isSelected && (
                        <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Exam Language</p>
              <div className="grid grid-cols-2 gap-3">
                {LANG_OPTIONS.map((opt) => {
                  const count = selectedCertType
                    ? (voucherSummary[`${selectedCertType}__${opt.value}`] ?? 0)
                    : CERT_OPTIONS.reduce((sum, c) => sum + (voucherSummary[`${c.value}__${opt.value}`] ?? 0), 0);
                  const isSelected = selectedLanguage === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleLanguageChange(opt.value)}
                      className={`relative flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                    >
                      <span className="text-2xl">{opt.flag}</span>
                      <div className="flex-1">
                        <span className={`text-sm font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                          {opt.label}
                        </span>
                        {selectedCertType && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {count} voucher{count !== 1 ? 's' : ''} available
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected summary */}
            {filterSelected && (
              <div className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                filteredVouchers.length > 0
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className={`flex items-center gap-2 text-sm font-medium ${
                  filteredVouchers.length > 0 ? 'text-blue-800' : 'text-orange-800'
                }`}>
                  <Ticket className="h-4 w-4" />
                  <span>
                    {selectedCertLabel} — {selectedLangLabel} vouchers available
                  </span>
                </div>
                <Badge className={`text-sm px-3 py-1 ${
                  filteredVouchers.length > 0 ? 'bg-blue-600 text-white' : 'bg-orange-500 text-white'
                }`}>
                  {filteredVouchers.length}
                </Badge>
              </div>
            )}

            {/* No vouchers for this filter */}
            {filterSelected && filteredVouchers.length === 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 text-sm">
                  You have no available <strong>{selectedCertLabel}</strong> ({selectedLangLabel}) vouchers.
                  Please select a different type or language.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Email Input ─────────────────────────────────────────────── */}
      {filterSelected && filteredVouchers.length > 0 && (
        <>
          {/* Rules */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Distribution Rules:</strong>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>Each voucher can only be transferred <strong>once</strong></li>
                <li>Transfer window is <strong>60 days</strong> from purchase date</li>
                <li>
                  Only <strong>{selectedCertLabel} ({selectedLangLabel})</strong> vouchers will be distributed
                </li>
                <li>Vouchers are assigned <strong>randomly</strong> from your filtered pool</li>
                <li>Recipients without an account will receive an invitation email</li>
                <li>Once distributed, the voucher is removed from your account</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Results */}
          {showResults && results.length > 0 && (
            <Card className={successCount === results.length ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
              <CardHeader className="pb-2">
                <CardTitle className={`flex items-center gap-2 text-base ${successCount === results.length ? 'text-green-800' : 'text-amber-800'}`}>
                  <CheckCircle2 className="h-5 w-5" />
                  Distribution Complete — {successCount}/{results.length} sent successfully
                </CardTitle>
                {failCount > 0 && (
                  <CardDescription className="text-amber-700">
                    {failCount} transfer{failCount > 1 ? 's' : ''} failed. You may retry the failed ones.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${
                        r.success ? 'bg-white border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {r.success
                          ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          : <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                        }
                        <span className="text-gray-700 truncate">{r.email}</span>
                      </div>
                      <span className={`font-mono text-xs ml-2 shrink-0 ${r.success ? 'text-gray-400' : 'text-red-500'}`}>
                        {r.success ? r.voucherCode : (r.error ?? 'Failed')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Global Error */}
          {globalError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ChevronRight className="h-4 w-4 text-blue-600" />
                Step 2 — Enter Recipient Emails
              </CardTitle>
              <CardDescription>
                Enter one email per line, or separate with commas or semicolons.
                Maximum <strong>{filteredVouchers.length}</strong> email
                {filteredVouchers.length !== 1 ? 's' : ''} (matching your available{' '}
                <strong>{selectedCertLabel} {selectedLangLabel}</strong> vouchers).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Textarea */}
              <textarea
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setConfirmed(false);
                  setGlobalError(null);
                }}
                placeholder={`john@company.com\njane@business.org\nteam@example.com`}
                rows={8}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                disabled={isSending}
              />

              {/* Live Parsing Feedback */}
              {parsedEmails.length > 0 && (
                <div className="space-y-3">
                  {/* Counts */}
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {validEmails.length} valid email{validEmails.length !== 1 ? 's' : ''}
                    </span>
                    {duplicateEmails.length > 0 && (
                      <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        ✕ {duplicateEmails.length} duplicate{duplicateEmails.length !== 1 ? 's' : ''} removed
                      </span>
                    )}
                    {invalidEmails.length > 0 && (
                      <span className="flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {invalidEmails.length} invalid (skipped)
                      </span>
                    )}
                  </div>

                  {/* Exceeds warning */}
                  {exceedsVouchers && (
                    <Alert className="border-red-300 bg-red-50 py-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-sm">
                        You entered <strong>{validEmails.length} emails</strong> but only have{' '}
                        <strong>{filteredVouchers.length} {selectedCertLabel} ({selectedLangLabel}) vouchers</strong>.
                        Please remove {validEmails.length - filteredVouchers.length} email
                        {validEmails.length - filteredVouchers.length !== 1 ? 's' : ''}.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Confirm summary */}
                  {validEmails.length > 0 && !exceedsVouchers && (
                    <div className="bg-blue-50 rounded-lg p-4 space-y-3 border border-blue-200">
                      <p className="text-sm text-blue-900 flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                        <span>
                          <strong>{validEmails.length}</strong>{' '}
                          <strong>{selectedCertLabel} ({selectedLangLabel})</strong> voucher
                          {validEmails.length !== 1 ? 's' : ''} will be randomly assigned and emailed to{' '}
                          <strong>{validEmails.length}</strong> recipient
                          {validEmails.length !== 1 ? 's' : ''}. You will have{' '}
                          <strong>{filteredVouchers.length - validEmails.length}</strong> voucher
                          {filteredVouchers.length - validEmails.length !== 1 ? 's' : ''} of this type remaining.
                        </span>
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={confirmed}
                          onChange={(e) => setConfirmed(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={isSending}
                        />
                        <span className="text-sm text-blue-900">
                          I confirm distributing {validEmails.length}{' '}
                          {selectedCertLabel} ({selectedLangLabel}) voucher
                          {validEmails.length !== 1 ? 's' : ''} to the listed recipients. This action cannot be undone.
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Send Button */}
              <Button
                onClick={handleDistribute}
                disabled={!canDistribute}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Distributing vouchers...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Distribute {validEmails.length > 0 ? validEmails.length : ''}{' '}
                    {selectedCertLabel} Voucher{validEmails.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

DistributeVouchers.displayName = 'DistributeVouchers';
