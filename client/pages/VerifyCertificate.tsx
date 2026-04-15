/**
 * Certificate Verification Page — Redesigned
 *
 * Public page for verifying BDA® credentials with full brand identity
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
  AlertCircle,
  Shield,
  Copy,
  Download,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import {
  verifyCertificate,
  searchCertificatesByName,
  type CertificateVerification,
  type CertificateSearchResult,
} from '@/entities/certificate';

// ============================================================================
// Badge image URLs (CDN-hosted)
// ============================================================================

const BADGE_IMAGES: Record<string, string> = {
  CP: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/JWEReraWERkmYSXF.webp',
  SCP: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/GVlzJwKvVJdFlVUb.webp',
  'Basic Member': 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/tafPwwNyeykiwJHy.webp',
  'Professional Member': 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/tafPwwNyeykiwJHy.webp',
};

const BDA_LOGO = 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/tafPwwNyeykiwJHy.webp';

// ============================================================================
// Helpers
// ============================================================================

function getBadgeImage(certType: string | null): string {
  if (!certType) return BDA_LOGO;
  return BADGE_IMAGES[certType] || BDA_LOGO;
}

function getCertLabel(certType: string | null): string {
  if (!certType) return 'BDA® Credential';
  if (certType === 'CP') return 'BDA-CP™ — Business Development Certified Professional';
  if (certType === 'SCP') return 'BDA-SCP™ — Senior Certified Professional';
  if (certType === 'Basic Member') return 'BDA® Basic Member';
  if (certType === 'Professional Member') return 'BDA® Professional Member';
  return `BDA-${certType}™`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function buildLinkedInUrl(verification: CertificateVerification, credentialId: string): string {
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: getCertLabel(verification.certification_type),
    organizationName: 'Business Development Association (BDA®)',
    issueYear: verification.issued_date ? new Date(verification.issued_date).getFullYear().toString() : '',
    issueMonth: verification.issued_date ? String(new Date(verification.issued_date).getMonth() + 1) : '',
    expirationYear: verification.expiry_date ? new Date(verification.expiry_date).getFullYear().toString() : '',
    expirationMonth: verification.expiry_date ? String(new Date(verification.expiry_date).getMonth() + 1) : '',
    certUrl: `${window.location.origin}/verify/${credentialId}`,
    certId: credentialId,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

// ============================================================================
// Component
// ============================================================================

export default function VerifyCertificate() {
  const { credentialId: urlCredentialId } = useParams<{ credentialId?: string }>();
  const navigate = useNavigate();

  const [searchMode, setSearchMode] = useState<'credential' | 'name'>('credential');
  const [credentialId, setCredentialId] = useState(urlCredentialId || '');
  const [searchName, setSearchName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [verification, setVerification] = useState<CertificateVerification | null>(null);
  const [searchResults, setSearchResults] = useState<CertificateSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (urlCredentialId && !hasSearched) {
      handleVerify(urlCredentialId);
    }
  }, [urlCredentialId]);

  const handleVerify = async (id?: string) => {
    const targetId = (id || credentialId).trim();
    if (!targetId) return;

    setIsVerifying(true);
    setHasSearched(true);

    try {
      const result = await verifyCertificate(targetId);
      if (result.error) throw new Error(result.error.message);
      setVerification(result.data);
      if (!urlCredentialId) navigate(`/verify/${targetId}`, { replace: true });
    } catch (error) {
      setVerification({
        is_valid: false,
        status: 'error',
        holder_name: null,
        certification_type: null,
        issued_date: null,
        expiry_date: null,
        message: error instanceof Error ? error.message : 'Verification failed',
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
    try {
      const result = await verifyCertificate(credId);
      if (result.error) throw new Error(result.error.message);
      setVerification(result.data);
      setCredentialId(credId);
      setSearchMode('credential');
      navigate(`/verify/${credId}`, { replace: true });
    } catch (error) {
      setVerification({
        is_valid: false,
        status: 'error',
        holder_name: null,
        certification_type: null,
        issued_date: null,
        expiry_date: null,
        message: error instanceof Error ? error.message : 'Verification failed',
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

  const handleDownloadBadge = () => {
    if (!verification) return;
    const badgeUrl = getBadgeImage(verification.certification_type);
    const a = document.createElement('a');
    a.href = badgeUrl;
    a.download = `BDA-Badge-${verification.certification_type || 'credential'}.webp`;
    a.target = '_blank';
    a.click();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      searchMode === 'credential' ? handleVerify() : handleSearchByName();
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#f4f7fb', minHeight: '100vh' }}>

      {/* ── HEADER ── */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #d0dff0',
        padding: '0 48px',
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 8px rgba(13,43,94,.07)',
      }}>
        <a href="https://bda-global.org" target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none' }}>
          <img src={BDA_LOGO} alt="BDA®" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
        </a>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#e8f4fd', border: '1px solid #d0dff0',
          borderRadius: '20px', padding: '6px 14px',
          fontSize: '12px', fontWeight: 600, color: '#1c4a8b',
        }}>
          <Shield size={13} />
          Official Credential Verification
        </div>
      </header>

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0d2b5e 0%, #1c4a8b 60%, #0f91e0 100%)',
        padding: '56px 48px 52px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)',
          borderRadius: '20px', padding: '5px 14px',
          fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,.9)',
          letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: '20px',
        }}>
          <Shield size={11} style={{ color: 'rgba(255,255,255,.9)' }} />
          Credential Verification
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'white', letterSpacing: '-.8px', margin: '0 0 10px' }}>
          Verify a BDA® Credential
        </h1>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.75)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
          Instantly verify the authenticity of any BDA certification or membership credential against our official global registry.
        </p>
      </div>

      {/* ── MAIN ── */}
      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Search Card */}
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #d0dff0',
          padding: '32px', boxShadow: '0 4px 24px rgba(13,43,94,.08)', marginBottom: '28px',
        }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            {(['credential', 'name'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => { setSearchMode(mode); setVerification(null); setSearchResults([]); setHasSearched(false); }}
                style={{
                  padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', border: '1.5px solid',
                  borderColor: searchMode === mode ? '#0d2b5e' : '#d0dff0',
                  background: searchMode === mode ? '#0d2b5e' : 'white',
                  color: searchMode === mode ? 'white' : '#6b7c93',
                  transition: 'all .15s',
                }}
              >
                {mode === 'credential' ? 'Credential ID' : 'Holder Name'}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7c93', letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: '10px' }}>
            {searchMode === 'credential' ? 'Enter Credential ID' : 'Search by Name'}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Input
              placeholder={searchMode === 'credential' ? 'e.g. BDA-CP-2026-A7K2M9' : 'e.g. Ahmed Al-Rashidi'}
              value={searchMode === 'credential' ? credentialId : searchName}
              onChange={(e) => searchMode === 'credential' ? setCredentialId(e.target.value) : setSearchName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isVerifying || isSearching}
              style={{ flex: 1, height: '52px', fontSize: '15px', fontFamily: searchMode === 'credential' ? 'monospace' : 'inherit' }}
            />
            <Button
              onClick={searchMode === 'credential' ? () => handleVerify() : handleSearchByName}
              disabled={searchMode === 'credential' ? !credentialId.trim() || isVerifying : !searchName.trim() || isSearching}
              style={{
                height: '52px', padding: '0 28px',
                background: '#0d2b5e', color: 'white', border: 'none',
                borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
              }}
            >
              {isVerifying || isSearching ? (
                <><Loader2 size={16} className="animate-spin" /> {searchMode === 'credential' ? 'Verifying...' : 'Searching...'}</>
              ) : (
                <><Search size={16} /> {searchMode === 'credential' ? 'Verify' : 'Search'}</>
              )}
            </Button>
          </div>

          {searchMode === 'credential' && (
            <p style={{ marginTop: '10px', fontSize: '12px', color: '#6b7c93' }}>
              Enter the credential ID found on the certificate or digital badge —{' '}
              <code style={{ background: '#e8f4fd', color: '#1c4a8b', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>BDA-CP-2026-A7K2M9</code>
            </p>
          )}
        </div>

        {/* ── Name Search Results ── */}
        {searchMode === 'name' && hasSearched && !verification && (
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #d0dff0', padding: '28px', boxShadow: '0 4px 24px rgba(13,43,94,.08)', marginBottom: '28px' }}>
            {searchResults.length > 0 ? (
              <>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a2a3a', marginBottom: '16px' }}>
                  {searchResults.length} credential{searchResults.length !== 1 ? 's' : ''} found
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {searchResults.map((r, i) => (
                    <div
                      key={`${r.credential_id}-${i}`}
                      onClick={() => handleViewCertificate(r.credential_id)}
                      style={{
                        padding: '16px', border: '1.5px solid #d0dff0', borderRadius: '10px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'background .15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f7fb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: '#1a2a3a' }}>{r.holder_name}</span>
                          <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                            background: r.is_valid ? '#dbeafe' : '#fee2e2',
                            color: r.is_valid ? '#1c4a8b' : '#991b1b',
                          }}>
                            {r.is_valid ? 'ACTIVE' : r.status === 'expired' ? 'EXPIRED' : 'INACTIVE'}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7c93', display: 'flex', gap: '20px' }}>
                          <span>ID: <code style={{ color: '#1c4a8b' }}>{r.credential_id}</code></span>
                          <span>BDA-{r.certification_type}™</span>
                          <span>Issued: {formatDate(r.issued_date)}</span>
                        </div>
                      </div>
                      <ExternalLink size={16} style={{ color: '#6b7c93', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#6b7c93' }}>
                <AlertCircle size={20} />
                <span>No credentials found matching "<strong>{searchName}</strong>". Please check the spelling and try again.</span>
              </div>
            )}
          </div>
        )}

        {/* ── Verification Result ── */}
        {verification && hasSearched && (
          <div style={{
            background: 'white', borderRadius: '16px', border: '1px solid #d0dff0',
            overflow: 'hidden', boxShadow: '0 4px 24px rgba(13,43,94,.08)', marginBottom: '28px',
          }}>
            {/* Result Header */}
            <div style={{
              background: verification.is_valid
                ? 'linear-gradient(135deg, #0d2b5e, #1c4a8b)'
                : 'linear-gradient(135deg, #4a1515, #7f1d1d)',
              padding: '28px 32px',
              display: 'flex', alignItems: 'center', gap: '24px',
            }}>
              {/* Badge image */}
              <div style={{
                width: '88px', height: '88px', flexShrink: 0,
                background: 'rgba(255,255,255,.12)', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                <img
                  src={getBadgeImage(verification.certification_type)}
                  alt="BDA Badge"
                  style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '50%' }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'white', letterSpacing: '-.3px', marginBottom: '4px' }}>
                  {verification.holder_name || 'Unknown Holder'}
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.8)', marginBottom: '12px' }}>
                  {getCertLabel(verification.certification_type)}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '5px 12px', borderRadius: '20px',
                  fontSize: '12px', fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase',
                  background: verification.is_valid ? 'rgba(22,163,74,.2)' : 'rgba(220,38,38,.2)',
                  color: verification.is_valid ? '#86efac' : '#fca5a5',
                  border: `1px solid ${verification.is_valid ? 'rgba(22,163,74,.3)' : 'rgba(220,38,38,.3)'}`,
                }}>
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: 'currentColor',
                    animation: verification.is_valid ? 'bdaPulse 2s infinite' : 'none',
                  }} />
                  {verification.is_valid ? 'Active & Valid' : (
                    verification.status === 'expired' ? 'Expired' :
                    verification.status === 'revoked' ? 'Revoked' :
                    verification.status === 'not_found' ? 'Not Found' : 'Invalid'
                  )}
                </div>
              </div>
            </div>

            {/* Result Body */}
            <div style={{ padding: '28px 32px' }}>

              {verification.is_valid ? (
                <>
                  {/* Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    {[
                      { label: 'Credential ID', value: credentialId || urlCredentialId || '', mono: true },
                      { label: 'Issued By', value: 'Business Development Association (BDA®)', mono: false },
                      { label: 'Certification Level', value: getCertLabel(verification.certification_type), mono: false },
                      { label: 'Issue Date', value: formatDate(verification.issued_date), mono: false },
                      { label: 'Valid Until', value: verification.expiry_date ? formatDate(verification.expiry_date) : 'Lifetime', mono: false },
                    ].map((item) => (
                      <div key={item.label}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7c93', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: '5px' }}>
                          {item.label}
                        </div>
                        {item.mono ? (
                          <code style={{ fontSize: '13px', background: '#e8f4fd', color: '#1c4a8b', padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>
                            {item.value}
                          </code>
                        ) : (
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a2a3a' }}>{item.value}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Verified Seal */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: '10px', padding: '14px 18px', marginBottom: '24px',
                  }}>
                    <CheckCircle size={18} style={{ color: '#16a34a', flexShrink: 0, marginTop: '1px' }} />
                    <p style={{ fontSize: '13px', color: '#166534', lineHeight: 1.5, margin: 0 }}>
                      <strong>Verified by Business Development Association (BDA®)</strong> — This credential has been verified against the official BDA global registry and is currently active and valid.
                    </p>
                  </div>

                  {/* Divider */}
                  <div style={{ height: '1px', background: '#d0dff0', margin: '0 0 20px' }} />

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <a
                      href={buildLinkedInUrl(verification, credentialId || urlCredentialId || '')}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '11px 22px', background: '#0a66c2', color: 'white',
                        borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                        textDecoration: 'none', border: 'none',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      Add to LinkedIn Profile
                    </a>
                    <button
                      onClick={handleCopyLink}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '11px 22px', background: '#e8f4fd', color: '#1c4a8b',
                        border: '1.5px solid #d0dff0', borderRadius: '8px',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
                      {copied ? 'Copied!' : 'Copy Verification Link'}
                    </button>
                    <button
                      onClick={handleDownloadBadge}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '11px 22px', background: 'white', color: '#0d2b5e',
                        border: '1.5px solid #d0dff0', borderRadius: '8px',
                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <Download size={15} />
                      Download Badge
                    </button>
                  </div>
                </>
              ) : (
                /* Invalid / Expired / Not Found */
                <>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: '10px', padding: '16px 18px', marginBottom: '20px',
                  }}>
                    <XCircle size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: '1px' }} />
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b', margin: '0 0 4px' }}>
                        {verification.status === 'not_found' ? 'Credential Not Found' :
                         verification.status === 'expired' ? 'Credential Expired' :
                         verification.status === 'revoked' ? 'Credential Revoked' : 'Verification Failed'}
                      </p>
                      <p style={{ fontSize: '13px', color: '#991b1b', margin: 0, lineHeight: 1.5 }}>
                        {verification.message}
                        {verification.status === 'expired' && (
                          <> The holder may renew at <a href="https://bda-global.org" target="_blank" rel="noreferrer" style={{ color: '#7f1d1d', fontWeight: 600 }}>bda-global.org</a>.</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Show partial details if available */}
                  {verification.holder_name && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                      {[
                        { label: 'Holder Name', value: verification.holder_name },
                        { label: 'Credential Type', value: getCertLabel(verification.certification_type) },
                        verification.issued_date ? { label: 'Issue Date', value: formatDate(verification.issued_date) } : null,
                        verification.expiry_date ? { label: 'Expiry Date', value: formatDate(verification.expiry_date) } : null,
                      ].filter(Boolean).map((item: any) => (
                        <div key={item.label}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7c93', letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a2a3a' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Reset button */}
              <div style={{ borderTop: '1px solid #d0dff0', paddingTop: '20px', marginTop: verification.is_valid ? '0' : '4px' }}>
                <button
                  onClick={handleReset}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 20px', background: 'white', color: '#6b7c93',
                    border: '1.5px solid #d0dff0', borderRadius: '8px',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={14} />
                  Verify Another Credential
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        background: '#0d2b5e', padding: '24px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)' }}>
          <strong style={{ color: 'white' }}>Business Development Association (BDA®)</strong> — Official Credential Registry<br />
          Headquartered in London, United Kingdom
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)' }}>
          © 2026 BDA® · All rights reserved
        </div>
      </footer>

      <style>{`
        @keyframes bdaPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 640px) {
          header { padding: 0 20px !important; }
          main { padding: 24px 16px 60px !important; }
          footer { padding: 20px !important; flex-direction: column; text-align: center; }
        }
      `}</style>
    </div>
  );
}
