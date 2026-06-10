/**
 * Certificate Verification Page — Full Redesign
 *
 * Public page for verifying BDA® credentials.
 * Header & Footer are provided by PublicPageLayout — no duplicates here.
 * Palette: strictly BDA blue tones (#0d2b5e, #1c4a8b, #0f91e0, #dbeafe).
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  Shield,
  Copy,
  Download,
  RotateCcw,
  ExternalLink,
  Award,
  User,
  Calendar,
  Hash,
  AlertTriangle,
} from 'lucide-react';
import {
  verifyCertificate,
  searchCertificatesByName,
  type CertificateVerification,
  type CertificateSearchResult,
} from '@/entities/certificate';

// ============================================================================
// Constants
// ============================================================================

const BADGE_IMAGES: Record<string, string> = {
  CP:  'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/JWEReraWERkmYSXF.webp',
  SCP: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/GVlzJwKvVJdFlVUb.webp',
  'Basic Member':        'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/tafPwwNyeykiwJHy.webp',
  'Professional Member': 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/tafPwwNyeykiwJHy.webp',
};

const BDA_LOGO_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/tafPwwNyeykiwJHy.webp';

// ============================================================================
// Helpers
// ============================================================================

function getBadgeImage(certType: string | null): string {
  if (!certType) return BDA_LOGO_URL;
  return BADGE_IMAGES[certType] || BDA_LOGO_URL;
}

function getCertLabel(certType: string | null): string {
  if (!certType) return 'BDA® Credential';
  if (certType === 'CP')  return 'BDA-CP™ — Certified Professional';
  if (certType === 'SCP') return 'BDA-SCP™ — Senior Certified Professional';
  if (certType === 'Basic Member') return 'BDA® Basic Member';
  if (certType === 'Professional Member') return 'BDA® Professional Member';
  return `BDA-${certType}™`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function buildLinkedInUrl(v: CertificateVerification, credId: string): string {
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: getCertLabel(v.certification_type),
    organizationName: 'Business Development Association (BDA®)',
    issueYear:       v.issued_date ? String(new Date(v.issued_date).getFullYear()) : '',
    issueMonth:      v.issued_date ? String(new Date(v.issued_date).getMonth() + 1) : '',
    expirationYear:  v.expiry_date ? String(new Date(v.expiry_date).getFullYear()) : '',
    expirationMonth: v.expiry_date ? String(new Date(v.expiry_date).getMonth() + 1) : '',
    certUrl: `${window.location.origin}/verify/${credId}`,
    certId: credId,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

// Build LinkedIn share-as-post URL using Edge Function for dynamic OG tags
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dfsbzsxuursvqwnzruqt.supabase.co';
function buildLinkedInShareUrl(credId: string): string {
  // The Edge Function URL serves dynamic OG tags that LinkedIn crawler reads
  const ogUrl = `${SUPABASE_URL}/functions/v1/credential-og?id=${encodeURIComponent(credId)}`;
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ogUrl)}`;
}

// ============================================================================
// Sub-components
// ============================================================================

function InfoRow({ icon, label, value, mono = false }: {
  icon: React.ReactNode; label: string; value: string; mono?: boolean;
}) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 10, fontWeight: 700, color: '#6b7c93',
        letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5,
      }}>
        {icon} {label}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 600, color: '#1a2a3a',
        fontFamily: mono ? 'monospace' : 'inherit',
      }}>
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function VerifyCertificate() {
  const { credentialId: urlCredentialId } = useParams<{ credentialId?: string }>();
  const navigate = useNavigate();

  const [searchMode, setSearchMode]       = useState<'credential' | 'name'>('credential');
  const [credentialId, setCredentialId]   = useState(urlCredentialId || '');
  const [searchName, setSearchName]       = useState('');
  const [isVerifying, setIsVerifying]     = useState(false);
  const [isSearching, setIsSearching]     = useState(false);
  const [verification, setVerification]   = useState<CertificateVerification | null>(null);
  const [searchResults, setSearchResults] = useState<CertificateSearchResult[]>([]);
  const [hasSearched, setHasSearched]     = useState(false);
  const [copied, setCopied]               = useState(false);

  useEffect(() => {
    document.title = 'Verify BDA Certification | Credential Verification';
  }, []);

  useEffect(() => {
    if (urlCredentialId && !hasSearched) {
      handleVerify(urlCredentialId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCredentialId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleVerify = async (id?: string) => {
    const targetId = (id || credentialId).trim();
    if (!targetId) return;
    setIsVerifying(true);
    setHasSearched(true);
    setSearchResults([]);
    try {
      const result = await verifyCertificate(targetId);
      if (result.error) throw new Error(result.error.message);
      setVerification(result.data);
      if (!urlCredentialId) navigate(`/verify/${targetId}`, { replace: true });
    } catch (error) {
      setVerification({
        is_valid: false, status: 'error',
        holder_name: null, certification_type: null,
        issued_date: null, expiry_date: null,
        message: error instanceof Error ? error.message : 'Verification failed. Please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSearchByName = async () => {
    if (!searchName.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setVerification(null);
    try {
      const result = await searchCertificatesByName(searchName.trim());
      if (result.error) throw new Error(result.error.message);
      setSearchResults(result.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewCertificate = async (credId: string) => {
    setIsVerifying(true);
    setSearchResults([]);
    setSearchMode('credential');
    try {
      const result = await verifyCertificate(credId);
      if (result.error) throw new Error(result.error.message);
      setVerification(result.data);
      setCredentialId(credId);
      navigate(`/verify/${credId}`, { replace: true });
    } catch (error) {
      setVerification({
        is_valid: false, status: 'error',
        holder_name: null, certification_type: null,
        issued_date: null, expiry_date: null,
        message: error instanceof Error ? error.message : 'Verification failed.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setCredentialId('');
    setSearchName('');
    setVerification(null);
    setSearchResults([]);
    setHasSearched(false);
    navigate('/verify', { replace: true });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      searchMode === 'credential' ? handleVerify() : handleSearchByName();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div dir="ltr" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ════════════════════════════════════════════════════════════════════
          HERO SECTION
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #0d2b5e 0%, #1c4a8b 55%, #0f91e0 100%)',
        padding: '56px 24px 64px',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 260, height: 260, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -40, left: -40,
          width: 180, height: 180, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Badge pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 20, padding: '5px 16px',
            fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.9)',
            letterSpacing: '1px', textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            <Shield size={12} />
            Official Credential Registry
          </div>

          <h1 style={{
            fontSize: 36, fontWeight: 800, color: 'white',
            letterSpacing: '-0.5px', margin: '0 0 12px', lineHeight: 1.15,
          }}>
            Verify a BDA<sup style={{ fontSize: 20 }}>®</sup> Credential
          </h1>
          <p style={{
            fontSize: 15, color: 'rgba(255,255,255,0.78)',
            maxWidth: 500, lineHeight: 1.7, margin: 0,
          }}>
            Instantly confirm the authenticity of any BDA certification or membership
            credential against our official global registry.
          </p>

          {/* Trust stats row */}
          <div style={{
            display: 'flex', gap: 32, marginTop: 32, flexWrap: 'wrap',
          }}>
            {[
              { label: 'Credentials Issued', value: '5,000+' },
              { label: 'Countries Covered', value: '40+' },
              { label: 'Verification Time', value: '< 1 sec' },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ background: '#f4f7fb', minHeight: '60vh' }}>
        <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px' }}>

          {/* ── Search Card ──────────────────────────────────────────────── */}
          <div style={{
            background: 'white', borderRadius: 16,
            border: '1px solid #d0dff0',
            padding: 28,
            boxShadow: '0 4px 24px rgba(13,43,94,0.08)',
            marginBottom: 24,
          }}>
            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
              {(['credential', 'name'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setSearchMode(mode);
                    setVerification(null);
                    setSearchResults([]);
                    setHasSearched(false);
                  }}
                  style={{
                    padding: '8px 18px', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: '1.5px solid',
                    borderColor: searchMode === mode ? '#0d2b5e' : '#d0dff0',
                    background: searchMode === mode ? '#0d2b5e' : 'white',
                    color: searchMode === mode ? 'white' : '#6b7c93',
                    transition: 'all 0.15s',
                  }}
                >
                  {mode === 'credential' ? 'By Credential ID' : 'By Holder Name'}
                </button>
              ))}
            </div>

            {/* Label */}
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#6b7c93',
              letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 8,
            }}>
              {searchMode === 'credential' ? 'Enter Credential ID' : 'Search by Full Name'}
            </div>

            {/* Input + button */}
            <div style={{ display: 'flex', gap: 10 }}>
              <Input
                placeholder={searchMode === 'credential' ? 'e.g. BDA-CP-2026-A7K2M9' : 'e.g. Ahmed Al-Rashidi'}
                value={searchMode === 'credential' ? credentialId : searchName}
                onChange={(e) =>
                  searchMode === 'credential'
                    ? setCredentialId(e.target.value)
                    : setSearchName(e.target.value)
                }
                onKeyPress={handleKeyPress}
                disabled={isVerifying || isSearching}
                style={{
                  flex: 1, height: 50, fontSize: 15,
                  fontFamily: searchMode === 'credential' ? 'monospace' : 'inherit',
                  border: '1.5px solid #d0dff0', borderRadius: 10,
                }}
              />
              <Button
                onClick={searchMode === 'credential' ? () => handleVerify() : handleSearchByName}
                disabled={
                  searchMode === 'credential'
                    ? !credentialId.trim() || isVerifying
                    : !searchName.trim() || isSearching
                }
                style={{
                  height: 50, padding: '0 24px',
                  background: '#0d2b5e', color: 'white', border: 'none',
                  borderRadius: 10, fontSize: 14, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 8,
                  whiteSpace: 'nowrap', cursor: 'pointer',
                }}
              >
                {isVerifying || isSearching ? (
                  <><Loader2 size={15} className="animate-spin" />
                    {searchMode === 'credential' ? 'Verifying…' : 'Searching…'}</>
                ) : (
                  <><Search size={15} />
                    {searchMode === 'credential' ? 'Verify' : 'Search'}</>
                )}
              </Button>
            </div>

            {searchMode === 'credential' && (
              <p style={{ marginTop: 8, fontSize: 12, color: '#6b7c93' }}>
                Enter the ID found on the certificate or digital badge —{' '}
                <code style={{
                  background: '#e8f4fd', color: '#1c4a8b',
                  padding: '2px 7px', borderRadius: 4, fontSize: 11,
                }}>BDA-CP-2026-XXXXXX</code>
              </p>
            )}
          </div>


          {/* ── Name Search Results ────────────────────────────────────── */}
          {searchMode === 'name' && hasSearched && !verification && (
            <div style={{
              background: 'white', borderRadius: 16,
              border: '1px solid #d0dff0', padding: 24,
              boxShadow: '0 4px 24px rgba(13,43,94,0.08)',
              marginBottom: 24,
            }}>
              {isSearching ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7c93' }}>
                  <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 10px', color: '#0d2b5e', display: 'block' }} />
                  <p style={{ fontSize: 14 }}>Searching the registry…</p>
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a2a3a', marginBottom: 14 }}>
                    {searchResults.length} credential{searchResults.length !== 1 ? 's' : ''} found
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {searchResults.map((r, i) => (
                      <div
                        key={`${r.credential_id}-${i}`}
                        onClick={() => handleViewCertificate(r.credential_id)}
                        style={{
                          padding: '14px 18px',
                          border: '1.5px solid #d0dff0', borderRadius: 10,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f4f7fb';
                          e.currentTarget.style.borderColor = '#1c4a8b';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#d0dff0';
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2a3a' }}>
                              {r.holder_name}
                            </span>
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              padding: '2px 9px', borderRadius: 20,
                              background: r.is_valid ? '#dbeafe' : '#fee2e2',
                              color: r.is_valid ? '#1c4a8b' : '#991b1b',
                            }}>
                              {r.is_valid ? 'ACTIVE' : r.status === 'expired' ? 'EXPIRED' : 'INACTIVE'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7c93', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <code style={{ color: '#1c4a8b', fontSize: 11 }}>{r.credential_id}</code>
                            <span>{getCertLabel(r.certification_type)}</span>
                          </div>
                        </div>
                        <div style={{ color: '#1c4a8b', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          View →
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <XCircle size={36} style={{ color: '#d0dff0', margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a2a3a', marginBottom: 5 }}>
                    No credentials found
                  </p>
                  <p style={{ fontSize: 12, color: '#6b7c93' }}>
                    No BDA credentials match "{searchName}". Please check the spelling or try a partial name.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Verification Result ────────────────────────────────────── */}
          {verification && (
            <div style={{
              background: 'white', borderRadius: 16,
              border: `1.5px solid ${verification.is_valid ? '#bfdbfe' : '#fecaca'}`,
              padding: 28,
              boxShadow: '0 4px 24px rgba(13,43,94,0.08)',
            }}>

              {verification.is_valid ? (
                /* ── VALID ── */
                <>
                  {/* Status banner */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'linear-gradient(135deg, #0d2b5e 0%, #1c4a8b 100%)',
                    borderRadius: 12, padding: '14px 18px', marginBottom: 24,
                  }}>
                    <CheckCircle size={26} style={{ color: '#60a5fa', flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: 'white', margin: '0 0 2px' }}>
                        Credential Verified
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                        This credential is authentic and currently active in the BDA® official registry.
                      </p>
                    </div>
                  </div>

                  {/* Badge + details */}
                  <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' }}>
                    {/* Badge image */}
                    <div style={{
                      width: 96, height: 96, flexShrink: 0,
                      borderRadius: 12, border: '2px solid #dbeafe',
                      overflow: 'hidden', background: '#f4f7fb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <img
                        src={getBadgeImage(verification.certification_type)}
                        alt="BDA Badge"
                        style={{ width: 76, height: 76, objectFit: 'contain' }}
                      />
                    </div>

                    {/* Details grid */}
                    <div style={{
                      flex: 1,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                      gap: 18,
                    }}>
                      <InfoRow icon={<User size={13} />} label="Holder Name" value={verification.holder_name || 'N/A'} />
                      <InfoRow icon={<Award size={13} />} label="Credential Type" value={getCertLabel(verification.certification_type)} />
                      <InfoRow icon={<Hash size={13} />} label="Credential ID" value={credentialId} mono />
                      <InfoRow icon={<Calendar size={13} />} label="Issue Date" value={formatDate(verification.issued_date)} />
                      {verification.expiry_date && (
                        <InfoRow icon={<Calendar size={13} />} label="Expiry Date" value={formatDate(verification.expiry_date)} />
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{
                    display: 'flex', gap: 10, flexWrap: 'wrap',
                    borderTop: '1px solid #e8f0fb', paddingTop: 18,
                  }}>
                    <button
                      onClick={handleCopyLink}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '9px 16px',
                        background: copied ? '#dbeafe' : '#0d2b5e',
                        color: copied ? '#1c4a8b' : 'white',
                        border: 'none', borderRadius: 8,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <Copy size={13} />
                      {copied ? 'Copied!' : 'Copy Verification Link'}
                    </button>

                    <a
                      href={buildLinkedInUrl(verification, credentialId)}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '9px 16px',
                        background: 'white', color: '#0d2b5e',
                        border: '1.5px solid #d0dff0', borderRadius: 8,
                        fontSize: 13, fontWeight: 600, textDecoration: 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      <ExternalLink size={13} />
                      Add to LinkedIn
                    </a>

                    <a
                      href={buildLinkedInShareUrl(credentialId)}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '9px 16px',
                        background: '#0077b5', color: 'white',
                        border: 'none', borderRadius: 8,
                        fontSize: 13, fontWeight: 600, textDecoration: 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      <ExternalLink size={13} />
                      Share on LinkedIn
                    </a>

                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = getBadgeImage(verification.certification_type);
                        a.download = `BDA-Badge-${verification.certification_type || 'credential'}.webp`;
                        a.target = '_blank';
                        a.click();
                      }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7,
                        padding: '9px 16px',
                        background: 'white', color: '#0d2b5e',
                        border: '1.5px solid #d0dff0', borderRadius: 8,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <Download size={13} />
                      Download Badge
                    </button>
                  </div>
                </>
              ) : (
                /* ── INVALID / NOT FOUND ── */
                <>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 12, padding: '16px 18px', marginBottom: 18,
                  }}>
                    {verification.status === 'expired' ? (
                      <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                    ) : (
                      <XCircle size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
                    )}
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#991b1b', margin: '0 0 4px' }}>
                        {verification.status === 'not_found' ? 'Credential Not Found' :
                         verification.status === 'expired'   ? 'Credential Expired'   :
                         verification.status === 'revoked'   ? 'Credential Revoked'   : 'Verification Failed'}
                      </p>
                      <p style={{ fontSize: 12, color: '#991b1b', margin: 0, lineHeight: 1.6 }}>
                        {verification.message}
                        {verification.status === 'expired' && (
                          <> The holder may renew at{' '}
                            <a href="https://bda-global.org" target="_blank" rel="noreferrer"
                              style={{ color: '#7f1d1d', fontWeight: 600 }}>bda-global.org</a>.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {verification.holder_name && (
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18,
                    }}>
                      <InfoRow icon={<User size={13} />} label="Holder Name" value={verification.holder_name} />
                      <InfoRow icon={<Award size={13} />} label="Credential Type" value={getCertLabel(verification.certification_type)} />
                      {verification.issued_date && (
                        <InfoRow icon={<Calendar size={13} />} label="Issue Date" value={formatDate(verification.issued_date)} />
                      )}
                      {verification.expiry_date && (
                        <InfoRow icon={<Calendar size={13} />} label="Expiry Date" value={formatDate(verification.expiry_date)} />
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Reset button */}
              <div style={{ borderTop: '1px solid #e8f0fb', paddingTop: 18, marginTop: 8 }}>
                <button
                  onClick={handleReset}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '9px 18px', background: 'white', color: '#6b7c93',
                    border: '1.5px solid #d0dff0', borderRadius: 8,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={13} />
                  Verify Another Credential
                </button>
              </div>
            </div>
          )}

          {/* ── Trust indicators (shown before first search) ───────────── */}
          {!hasSearched && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16, marginTop: 28,
            }}>
              {[
                {
                  icon: <Shield size={20} style={{ color: '#1c4a8b' }} />,
                  title: 'Official Registry',
                  desc: "Directly connected to BDA's live certification database",
                },
                {
                  icon: <CheckCircle size={20} style={{ color: '#1c4a8b' }} />,
                  title: 'Real-Time Verification',
                  desc: 'Results reflect the current status of every credential',
                },
                {
                  icon: <Award size={20} style={{ color: '#1c4a8b' }} />,
                  title: 'Globally Recognised',
                  desc: 'BDA credentials are recognised by employers worldwide',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    background: 'white', borderRadius: 12,
                    border: '1px solid #d0dff0', padding: 20,
                    boxShadow: '0 2px 12px rgba(13,43,94,0.05)',
                  }}
                >
                  <div style={{ marginBottom: 10 }}>{card.icon}</div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2a3a', margin: '0 0 5px' }}>
                    {card.title}
                  </p>
                  <p style={{ fontSize: 12, color: '#6b7c93', margin: 0, lineHeight: 1.6 }}>
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
