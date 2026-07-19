/**
 * Certificate Verification Page — SHRM-style Directory
 *
 * Public page for verifying BDA® credentials.
 * Header & Footer are provided by PublicPageLayout.
 * Design: clean form with 4 filters (Holder Name, Country, Cert Type, Cert ID)
 * Results shown as a table below the form.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import {
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  Shield,
  Copy,
  RotateCcw,
  ExternalLink,
  Award,
  User,
  Calendar,
  Hash,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import {
  verifyCertificate,
  type CertificateVerification,
} from '@/entities/certificate';
import { supabase } from '@/shared/config/supabase.config';

// ============================================================================
// Country code → full name map (ISO 3166-1 alpha-2)
// ============================================================================
const COUNTRY_NAMES: Record<string, string> = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AD: 'Andorra', AO: 'Angola',
  AG: 'Antigua and Barbuda', AR: 'Argentina', AM: 'Armenia', AU: 'Australia',
  AT: 'Austria', AZ: 'Azerbaijan', BS: 'Bahamas', BH: 'Bahrain', BD: 'Bangladesh',
  BB: 'Barbados', BY: 'Belarus', BE: 'Belgium', BZ: 'Belize', BJ: 'Benin',
  BT: 'Bhutan', BO: 'Bolivia', BA: 'Bosnia and Herzegovina', BW: 'Botswana',
  BR: 'Brazil', BN: 'Brunei', BG: 'Bulgaria', BF: 'Burkina Faso', BI: 'Burundi',
  CV: 'Cabo Verde', KH: 'Cambodia', CM: 'Cameroon', CA: 'Canada',
  CF: 'Central African Republic', TD: 'Chad', CL: 'Chile', CN: 'China',
  CO: 'Colombia', KM: 'Comoros', CG: 'Congo', CD: 'Congo (DRC)', CR: 'Costa Rica',
  HR: 'Croatia', CU: 'Cuba', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark',
  DJ: 'Djibouti', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador',
  EG: 'Egypt', SV: 'El Salvador', GQ: 'Equatorial Guinea', ER: 'Eritrea',
  EE: 'Estonia', SZ: 'Eswatini', ET: 'Ethiopia', FJ: 'Fiji', FI: 'Finland',
  FR: 'France', GA: 'Gabon', GM: 'Gambia', GE: 'Georgia', DE: 'Germany',
  GH: 'Ghana', GR: 'Greece', GD: 'Grenada', GT: 'Guatemala', GN: 'Guinea',
  GW: 'Guinea-Bissau', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', HU: 'Hungary',
  IS: 'Iceland', IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq',
  IE: 'Ireland', IL: 'Israel', IT: 'Italy', JM: 'Jamaica', JP: 'Japan',
  JO: 'Jordan', KZ: 'Kazakhstan', KE: 'Kenya', KI: 'Kiribati', KW: 'Kuwait',
  KG: 'Kyrgyzstan', LA: 'Laos', LV: 'Latvia', LB: 'Lebanon', LS: 'Lesotho',
  LR: 'Liberia', LY: 'Libya', LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg',
  MG: 'Madagascar', MW: 'Malawi', MY: 'Malaysia', MV: 'Maldives', ML: 'Mali',
  MT: 'Malta', MH: 'Marshall Islands', MR: 'Mauritania', MU: 'Mauritius',
  MX: 'Mexico', FM: 'Micronesia', MD: 'Moldova', MC: 'Monaco', MN: 'Mongolia',
  ME: 'Montenegro', MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar', NA: 'Namibia',
  NR: 'Nauru', NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand', NI: 'Nicaragua',
  NE: 'Niger', NG: 'Nigeria', NO: 'Norway', OM: 'Oman', PK: 'Pakistan',
  PW: 'Palau', PA: 'Panama', PG: 'Papua New Guinea', PY: 'Paraguay', PE: 'Peru',
  PH: 'Philippines', PL: 'Poland', PT: 'Portugal', QA: 'Qatar', RO: 'Romania',
  RU: 'Russia', RW: 'Rwanda', KN: 'Saint Kitts and Nevis', LC: 'Saint Lucia',
  VC: 'Saint Vincent and the Grenadines', WS: 'Samoa', SM: 'San Marino',
  ST: 'Sao Tome and Principe', SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia',
  SC: 'Seychelles', SL: 'Sierra Leone', SG: 'Singapore', SK: 'Slovakia',
  SI: 'Slovenia', SB: 'Solomon Islands', SO: 'Somalia', ZA: 'South Africa',
  SS: 'South Sudan', ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan', SR: 'Suriname',
  SE: 'Sweden', CH: 'Switzerland', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan',
  TZ: 'Tanzania', TH: 'Thailand', TL: 'Timor-Leste', TG: 'Togo', TO: 'Tonga',
  TT: 'Trinidad and Tobago', TN: 'Tunisia', TR: 'Turkey', TM: 'Turkmenistan',
  TV: 'Tuvalu', UG: 'Uganda', UA: 'Ukraine', AE: 'United Arab Emirates',
  GB: 'United Kingdom', US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan',
  VU: 'Vanuatu', VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen', ZM: 'Zambia',
  ZW: 'Zimbabwe', PS: 'Palestine', XK: 'Kosovo',
};

const SORTED_COUNTRIES = Object.entries(COUNTRY_NAMES).sort((a, b) => a[1].localeCompare(b[1]));

// ============================================================================
// Constants
// ============================================================================
const CERTIFICATION_TYPES = [
  { value: 'CP',  label: 'BDA-CP® — Certified Professional' },
  { value: 'SCP', label: 'BDA-SCP® — Senior Certified Professional' },
  { value: 'Basic Member',        label: 'BDA® Basic Member' },
  { value: 'Professional Member', label: 'BDA® Professional Member' },
];

const BADGE_IMAGES: Record<string, string> = {
  CP:  'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/JWEReraWERkmYSXF.webp',
  SCP: 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/GVlzJwKvVJdFlVUb.webp',
  'Basic Member':        'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/tafPwwNyeykiwJHy.webp',
  'Professional Member': 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/tafPwwNyeykiwJHy.webp',
};
const BDA_LOGO_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663032148679/tafPwwNyeykiwJHy.webp';

// ============================================================================
// Types
// ============================================================================
interface AdvancedSearchResult {
  credential_id: string;
  holder_name: string;
  certification_type: string;
  issued_date: string;
  expiry_date: string;
  status: string;
  is_valid: boolean;
  country_code: string;
}

// ============================================================================
// Helpers
// ============================================================================
function getBadgeImage(certType: string | null): string {
  if (!certType) return BDA_LOGO_URL;
  return BADGE_IMAGES[certType] || BDA_LOGO_URL;
}

function getCertLabel(certType: string | null): string {
  if (!certType) return 'BDA® Credential';
  if (certType === 'CP')  return 'BDA-CP® — Certified Professional';
  if (certType === 'SCP') return 'BDA-SCP® — Senior Certified Professional';
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dfsbzsxuursvqwnzruqt.supabase.co';
function buildLinkedInShareUrl(credId: string): string {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        <span style={{ color: '#6b7c93' }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#6b7c93', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
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

  // Search form state
  const [holderName, setHolderName]     = useState('');
  const [country, setCountry]           = useState('');
  const [certType, setCertType]         = useState('');
  const [credentialId, setCredentialId] = useState(urlCredentialId || '');

  // Results state
  const [isSearching, setIsSearching]   = useState(false);
  const [searchResults, setSearchResults] = useState<AdvancedSearchResult[]>([]);
  const [hasSearched, setHasSearched]   = useState(false);

  // Detail view state
  const [selectedCredId, setSelectedCredId] = useState<string | null>(urlCredentialId || null);
  const [isVerifying, setIsVerifying]       = useState(false);
  const [verification, setVerification]     = useState<CertificateVerification | null>(null);
  const [copied, setCopied]                 = useState(false);

  useEffect(() => {
    document.title = 'BDA® Certified Directory | Credential Verification';
  }, []);

  useEffect(() => {
    if (urlCredentialId && !verification) {
      handleViewCertificate(urlCredentialId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCredentialId]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const hasAnyFilter = () =>
    holderName.trim() || country || certType || credentialId.trim();

  const handleSearch = async () => {
    if (!hasAnyFilter()) return;
    setIsSearching(true);
    setHasSearched(true);
    setVerification(null);
    setSelectedCredId(null);
    try {
      const { data, error } = await (supabase as any).rpc('search_certificates_advanced', {
        p_holder_name:        holderName.trim() || null,
        p_country_code:       country || null,
        p_certification_type: certType || null,
        p_credential_id:      credentialId.trim() || null,
      });
      if (error) throw error;
      setSearchResults((data || []) as AdvancedSearchResult[]);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewCertificate = async (credId: string) => {
    setIsVerifying(true);
    setSelectedCredId(credId);
    try {
      const result = await verifyCertificate(credId);
      if (result.error) throw new Error(result.error.message);
      setVerification(result.data);
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
    setHolderName('');
    setCountry('');
    setCertType('');
    setCredentialId('');
    setSearchResults([]);
    setHasSearched(false);
    setVerification(null);
    setSelectedCredId(null);
    navigate('/verify', { replace: true });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #ccc',
    borderRadius: 3,
    padding: '7px 10px',
    fontSize: 14,
    color: '#333',
    background: 'white',
    height: 36,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 5,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div dir="ltr" style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* ── Page Title ─────────────────────────────────────────────────── */}
        <div style={{ borderBottom: '3px solid #0d2b5e', paddingBottom: 14, marginBottom: 22 }}>
          <h1 style={{
            fontSize: 22, fontWeight: 800, color: '#0d2b5e',
            margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            BDA® Certified Directory
          </h1>
          <p style={{ fontSize: 13, color: '#555', margin: '8px 0 0', lineHeight: 1.65 }}>
            The Certified Directory may be used to verify a credential holder's certification.
            Enter one or more fields below and click <strong>Search</strong> to find matching records.
            The search results will provide the credential holder's name, certification type, country, and validity status.
          </p>
        </div>

        {/* ── Search Form ────────────────────────────────────────────────── */}
        <div style={{
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: 4,
          padding: '24px 28px 20px',
          marginBottom: 24,
        }}>
          {/* Row 1: Holder Name + Country */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 32px', marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Holder Name</label>
              <Input
                placeholder="e.g. John Smith"
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                onKeyPress={handleKeyPress}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">— All Countries —</option>
                {SORTED_COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Certification Type + Certification ID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 32px', marginBottom: 22 }}>
            <div>
              <label style={labelStyle}>Certification Type</label>
              <select
                value={certType}
                onChange={(e) => setCertType(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">— All Types —</option>
                {CERTIFICATION_TYPES.map((ct) => (
                  <option key={ct.value} value={ct.value}>{ct.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Certification ID</label>
              <Input
                placeholder="e.g. BDA-CP-2026-A7K2M9"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleReset}
              style={{
                padding: '8px 22px',
                background: '#777',
                color: 'white',
                border: 'none',
                borderRadius: 3,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
            <button
              onClick={handleSearch}
              disabled={!hasAnyFilter() || isSearching}
              style={{
                padding: '8px 28px',
                background: hasAnyFilter() && !isSearching ? '#0d2b5e' : '#aaa',
                color: 'white',
                border: 'none',
                borderRadius: 3,
                fontSize: 13,
                fontWeight: 700,
                cursor: hasAnyFilter() && !isSearching ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              {isSearching ? (
                <><Loader2 size={13} className="animate-spin" /> Searching…</>
              ) : (
                <><Search size={13} /> Search</>
              )}
            </button>
          </div>
        </div>

        {/* ── Search Results Table ────────────────────────────────────────── */}
        {hasSearched && !verification && (
          <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: 4, marginBottom: 24 }}>
            {isSearching ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#666' }}>
                <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#0d2b5e', display: 'block' }} />
                <p style={{ fontSize: 14 }}>Searching the registry…</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#666' }}>
                <Shield size={32} style={{ margin: '0 auto 12px', color: '#ccc', display: 'block' }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 6 }}>No records found</p>
                <p style={{ fontSize: 13, color: '#888' }}>
                  No credentials match your search criteria. Please check the spelling or try different filters.
                </p>
              </div>
            ) : (
              <>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #eee', background: '#f9f9f9' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>
                    {searchResults.length} record{searchResults.length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#efefef', borderBottom: '2px solid #ddd' }}>
                        {['Holder Name', 'Certification Type', 'Certification ID', 'Country', 'Status', 'Expiry Date', 'Details'].map((h, i) => (
                          <th key={h} style={{
                            padding: '9px 14px',
                            textAlign: i === 6 ? 'center' : 'left',
                            fontWeight: 700, color: '#444',
                            textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px',
                            whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {searchResults.map((r, i) => (
                        <tr
                          key={`${r.credential_id}-${i}`}
                          style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? 'white' : '#fafafa' }}
                        >
                          <td style={{ padding: '9px 14px', fontWeight: 600, color: '#1a2a3a' }}>{r.holder_name}</td>
                          <td style={{ padding: '9px 14px' }}>
                            <span style={{
                              display: 'inline-block', padding: '2px 7px', borderRadius: 3,
                              fontSize: 11, fontWeight: 700, background: '#dbeafe', color: '#1c4a8b',
                            }}>
                              {r.certification_type === 'CP' ? 'BDA-CP®' :
                               r.certification_type === 'SCP' ? 'BDA-SCP®' :
                               r.certification_type}
                            </span>
                          </td>
                          <td style={{ padding: '9px 14px', fontFamily: 'monospace', color: '#555', fontSize: 12 }}>{r.credential_id}</td>
                          <td style={{ padding: '9px 14px', color: '#555' }}>
                            {r.country_code ? (COUNTRY_NAMES[r.country_code.toUpperCase()] || r.country_code) : '—'}
                          </td>
                          <td style={{ padding: '9px 14px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '2px 7px', borderRadius: 3, fontSize: 11, fontWeight: 700,
                              background: r.is_valid ? '#dcfce7' : r.status === 'expired' ? '#fef9c3' : '#fee2e2',
                              color: r.is_valid ? '#166534' : r.status === 'expired' ? '#854d0e' : '#991b1b',
                            }}>
                              {r.is_valid ? <><CheckCircle size={10} /> Active</> :
                               r.status === 'expired' ? <><AlertTriangle size={10} /> Expired</> :
                               <><XCircle size={10} /> {r.status}</>}
                            </span>
                          </td>
                          <td style={{ padding: '9px 14px', color: '#555' }}>{formatDate(r.expiry_date)}</td>
                          <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleViewCertificate(r.credential_id)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '5px 12px', background: '#0d2b5e', color: 'white',
                                border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              View <ChevronRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Credential Detail View ─────────────────────────────────────── */}
        {(isVerifying || verification) && (
          <div style={{
            background: 'white',
            border: `1.5px solid ${verification?.is_valid ? '#bfdbfe' : '#fecaca'}`,
            borderRadius: 8,
            padding: 28,
            boxShadow: '0 4px 24px rgba(13,43,94,0.08)',
            marginBottom: 24,
          }}>
            {isVerifying ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#0d2b5e', display: 'block' }} />
                <p style={{ fontSize: 14 }}>Verifying credential…</p>
              </div>
            ) : verification?.is_valid ? (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'linear-gradient(135deg, #0d2b5e 0%, #1c4a8b 100%)',
                  borderRadius: 10, padding: '14px 18px', marginBottom: 24,
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
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' }}>
                  <div style={{
                    width: 96, height: 96, flexShrink: 0,
                    borderRadius: 10, border: '2px solid #dbeafe',
                    overflow: 'hidden', background: '#f4f7fb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <img
                      src={getBadgeImage(verification.certification_type)}
                      alt="BDA Badge"
                      style={{ width: 76, height: 76, objectFit: 'contain' }}
                    />
                  </div>
                  <div style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                    gap: 18,
                  }}>
                    <InfoRow icon={<User size={13} />} label="Holder Name" value={verification.holder_name || 'N/A'} />
                    <InfoRow icon={<Award size={13} />} label="Credential Type" value={getCertLabel(verification.certification_type)} />
                    <InfoRow icon={<Hash size={13} />} label="Credential ID" value={selectedCredId || ''} mono />
                    <InfoRow icon={<Calendar size={13} />} label="Issue Date" value={formatDate(verification.issued_date)} />
                    {verification.expiry_date && (
                      <InfoRow icon={<Calendar size={13} />} label="Expiry Date" value={formatDate(verification.expiry_date)} />
                    )}
                  </div>
                </div>
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
                      border: 'none', borderRadius: 6,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <Copy size={13} />
                    {copied ? 'Copied!' : 'Copy Verification Link'}
                  </button>
                  <a
                    href={buildLinkedInUrl(verification, selectedCredId || '')}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '9px 16px',
                      background: 'white', color: '#0d2b5e',
                      border: '1.5px solid #d0dff0', borderRadius: 6,
                      fontSize: 13, fontWeight: 600, textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={13} />
                    Add to LinkedIn Profile
                  </a>
                  <a
                    href={buildLinkedInShareUrl(selectedCredId || '')}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      padding: '9px 16px',
                      background: 'white', color: '#0d2b5e',
                      border: '1.5px solid #d0dff0', borderRadius: 6,
                      fontSize: 13, fontWeight: 600, textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={13} />
                    Share on LinkedIn
                  </a>
                </div>
              </>
            ) : verification ? (
              <>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  background: verification.status === 'expired' ? '#fffbeb' : '#fef2f2',
                  borderRadius: 10, padding: '14px 18px', marginBottom: 18,
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
                    </p>
                  </div>
                </div>
                {verification.holder_name && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
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
            ) : null}

            {/* Navigation buttons */}
            <div style={{ borderTop: '1px solid #e8f0fb', paddingTop: 18, marginTop: 8, display: 'flex', gap: 10 }}>
              {hasSearched && searchResults.length > 0 && (
                <button
                  onClick={() => { setVerification(null); setSelectedCredId(null); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '9px 18px', background: '#f4f7fb', color: '#0d2b5e',
                    border: '1.5px solid #d0dff0', borderRadius: 6,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  ← Back to Results
                </button>
              )}
              <button
                onClick={handleReset}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', background: 'white', color: '#6b7c93',
                  border: '1.5px solid #d0dff0', borderRadius: 6,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <RotateCcw size={13} />
                New Search
              </button>
            </div>
          </div>
        )}

        {/* ── Trust indicators (shown before first search) ──────────────── */}
        {!hasSearched && !verification && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 14, marginTop: 4,
          }}>
            {[
              {
                icon: <Shield size={18} style={{ color: '#1c4a8b' }} />,
                title: 'Official Registry',
                desc: "Directly connected to BDA's live certification database",
              },
              {
                icon: <CheckCircle size={18} style={{ color: '#1c4a8b' }} />,
                title: 'Real-Time Verification',
                desc: 'Results reflect the current status of every credential',
              },
              {
                icon: <Award size={18} style={{ color: '#1c4a8b' }} />,
                title: 'Globally Recognised',
                desc: 'BDA credentials are recognised by employers worldwide',
              },
            ].map((card) => (
              <div
                key={card.title}
                style={{
                  background: 'white', borderRadius: 6,
                  border: '1px solid #ddd', padding: 18,
                }}
              >
                <div style={{ marginBottom: 8 }}>{card.icon}</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2a3a', margin: '0 0 4px' }}>
                  {card.title}
                </p>
                <p style={{ fontSize: 12, color: '#6b7c93', margin: 0, lineHeight: 1.6 }}>
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
