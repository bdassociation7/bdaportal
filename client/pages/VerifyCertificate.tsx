/**
 * Certificate Verification Page
 *
 * Public page for verifying certificates by credential ID
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Search,
  Loader2,
  Award,
  Calendar,
  User,
  AlertCircle,
  Shield,
  ExternalLink,
} from 'lucide-react';
import {
  verifyCertificate,
  searchCertificatesByName,
  type CertificateVerification,
  type CertificateSearchResult,
} from '@/entities/certificate';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  // ========================================================================
  // Auto-verify if credential ID in URL
  // ========================================================================

  useEffect(() => {
    if (urlCredentialId && !hasSearched) {
      handleVerify();
    }
  }, [urlCredentialId]);

  // ========================================================================
  // Verification Handler
  // ========================================================================

  const handleVerify = async () => {
    if (!credentialId.trim()) {
      return;
    }

    setIsVerifying(true);
    setHasSearched(true);

    try {
      const result = await verifyCertificate(credentialId.trim());

      if (result.error) {
        throw new Error(result.error.message);
      }

      setVerification(result.data);

      // Update URL with credential ID if not already there
      if (!urlCredentialId) {
        navigate(`/verify/${credentialId.trim()}`, { replace: true });
      }
    } catch (error) {
      console.error('Verification error:', error);
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchMode === 'credential') {
        handleVerify();
      } else {
        handleSearchByName();
      }
    }
  };

  // ========================================================================
  // Name Search Handler
  // ========================================================================

  const handleSearchByName = async () => {
    if (!searchName.trim()) {
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setVerification(null);

    try {
      const result = await searchCertificatesByName(searchName.trim());

      if (result.error) {
        throw new Error(result.error.message);
      }

      setSearchResults(result.data || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // ========================================================================
  // View Certificate from Search Results
  // ========================================================================

  const handleViewCertificate = async (credId: string) => {
    setIsVerifying(true);
    setSearchResults([]);

    try {
      const result = await verifyCertificate(credId);

      if (result.error) {
        throw new Error(result.error.message);
      }

      setVerification(result.data);
      setCredentialId(credId);
      setSearchMode('credential');
      navigate(`/verify/${credId}`, { replace: true });
    } catch (error) {
      console.error('Verification error:', error);
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

  const handleModeChange = (mode: 'credential' | 'name') => {
    setSearchMode(mode);
    setVerification(null);
    setSearchResults([]);
    setHasSearched(false);
  };

  // ========================================================================
  // Format Date
  // ========================================================================

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Verify Certificate</h1>
          </div>
          <p className="text-lg text-gray-600">
            Verify the authenticity of BDA Association certifications
          </p>
        </div>

        {/* Search Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="space-y-4">
              {/* Search Mode Tabs */}
              <Tabs
                value={searchMode}
                onValueChange={(value) => handleModeChange(value as 'credential' | 'name')}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="credential">Credential ID</TabsTrigger>
                  <TabsTrigger value="name">Holder Name</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Title and Description */}
              <div>
                <CardTitle>
                  {searchMode === 'credential' ? 'Enter Credential ID' : 'Search by Name'}
                </CardTitle>
                <CardDescription>
                  {searchMode === 'credential'
                    ? 'Enter the credential ID (e.g., BDA-CP-2026-A7K2M9) to verify a certification'
                    : 'Enter the certificate holder\'s name to find matching certificates'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                {searchMode === 'credential' ? (
                  <Input
                    placeholder="BDA-CP-2026-A7K2M9"
                    value={credentialId}
                    onChange={(e) => setCredentialId(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isVerifying}
                    className="text-lg font-mono"
                  />
                ) : (
                  <Input
                    placeholder="John Doe"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSearching}
                    className="text-lg"
                  />
                )}
              </div>
              <Button
                onClick={searchMode === 'credential' ? handleVerify : handleSearchByName}
                disabled={
                  searchMode === 'credential'
                    ? !credentialId.trim() || isVerifying
                    : !searchName.trim() || isSearching
                }
                size="lg"
              >
                {isVerifying || isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {searchMode === 'credential' ? 'Verifying...' : 'Searching...'}
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    {searchMode === 'credential' ? 'Verify' : 'Search'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results for Name Search */}
        {searchMode === 'name' && hasSearched && searchResults.length > 0 && !verification && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                Search Results ({searchResults.length} certificate{searchResults.length !== 1 ? 's' : ''} found)
              </CardTitle>
              <CardDescription>
                Click on a certificate to view full verification details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {searchResults.map((result, index) => (
                  <div
                    key={`${result.credential_id}-${index}`}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleViewCertificate(result.credential_id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {result.holder_name}
                          </h4>
                          <Badge
                            variant={result.is_valid ? 'default' : 'secondary'}
                            className={result.is_valid ? 'bg-green-600' : ''}
                          >
                            {result.is_valid ? (
                              <>
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="mr-1 h-3 w-3" />
                                {result.status === 'expired' ? 'Expired' : 'Inactive'}
                              </>
                            )}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Credential ID: </span>
                            <span className="font-mono font-medium text-gray-900">
                              {result.credential_id}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Type: </span>
                            <span className="font-medium text-gray-900">
                              BDA-{result.certification_type}™
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Issued: </span>
                            <span className="text-gray-900">
                              {formatDate(result.issued_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ExternalLink className="h-5 w-5 text-gray-400 ml-4" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Results Message for Name Search */}
        {searchMode === 'name' && hasSearched && searchResults.length === 0 && !verification && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No certificates found</AlertTitle>
                <AlertDescription>
                  No certificates were found matching "{searchName}". Please check the spelling and
                  try again.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Verification Results */}
        {verification && hasSearched && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              {/* Valid Certificate */}
              {verification.is_valid ? (
                <div className="space-y-6">
                  {/* Success Banner */}
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <AlertTitle className="text-green-900 text-lg">
                      Certificate Verified
                    </AlertTitle>
                    <AlertDescription className="text-green-800">
                      This is a valid and active certification issued by BDA Association.
                    </AlertDescription>
                  </Alert>

                  {/* Certificate Details */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b">
                      <h3 className="text-2xl font-bold text-gray-900">Certificate Details</h3>
                      <Badge variant="default" className="text-base px-4 py-2">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Active
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Holder Name */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4" />
                          <span className="text-sm font-medium uppercase tracking-wide">
                            Certificate Holder
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">
                          {verification.holder_name}
                        </p>
                      </div>

                      {/* Certification Type */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Award className="h-4 w-4" />
                          <span className="text-sm font-medium uppercase tracking-wide">
                            Certification Type
                          </span>
                        </div>
                        <p className="text-lg font-semibold text-gray-900">
                          {verification.certification_type === 'CP'
                            ? 'BDA Certified Professional (BDA-CP™)'
                            : 'BDA Senior Certified Professional (BDA-SCP™)'}
                        </p>
                      </div>

                      {/* Issue Date */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium uppercase tracking-wide">
                            Issued Date
                          </span>
                        </div>
                        <p className="text-lg text-gray-900">
                          {formatDate(verification.issued_date)}
                        </p>
                      </div>

                      {/* Expiry Date */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-medium uppercase tracking-wide">
                            Valid Until
                          </span>
                        </div>
                        <p className="text-lg text-gray-900">
                          {formatDate(verification.expiry_date)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Authenticity Statement */}
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertTitle>Authenticity Confirmed</AlertTitle>
                    <AlertDescription>
                      This certification has been verified against BDA Association's official
                      records. The credential holder has successfully completed all certification
                      requirements and maintains active standing.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                /* Invalid/Expired/Revoked Certificate */
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <XCircle className="h-5 w-5" />
                    <AlertTitle className="text-lg">
                      {verification.status === 'not_found'
                        ? 'Certificate Not Found'
                        : verification.status === 'expired'
                        ? 'Certificate Expired'
                        : verification.status === 'revoked'
                        ? 'Certificate Revoked'
                        : 'Verification Failed'}
                    </AlertTitle>
                    <AlertDescription className="text-base">
                      {verification.message}
                    </AlertDescription>
                  </Alert>

                  {/* Show limited details for expired/revoked */}
                  {verification.holder_name && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">Holder Name</p>
                          <p className="text-base font-medium text-gray-900">
                            {verification.holder_name}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">Certification Type</p>
                          <p className="text-base font-medium text-gray-900">
                            BDA-{verification.certification_type}™
                          </p>
                        </div>
                        {verification.issued_date && (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">Issued</p>
                            <p className="text-base text-gray-900">
                              {formatDate(verification.issued_date)}
                            </p>
                          </div>
                        )}
                        {verification.expiry_date && (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">Expiry Date</p>
                            <p className="text-base text-gray-900">
                              {formatDate(verification.expiry_date)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t mt-6">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  Verify Another Certificate
                </Button>
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  disabled={!verification.is_valid}
                >
                  Print Verification
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>About Certificate Verification</CardTitle>
            <CardDescription>How to verify BDA Association certifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Two Ways to Verify</h4>
              <p className="text-sm text-gray-600">
                You can verify certificates by entering the <strong>Credential ID</strong> (e.g., BDA-CP-2026-A7K2M9)
                or by searching for the <strong>certificate holder's name</strong>. Name search supports
                partial matches and will show up to 50 matching certificates.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Real-Time Verification</h4>
              <p className="text-sm text-gray-600">
                Our verification system checks certificates in real-time against our official
                database. You'll immediately see if a certificate is valid, expired, or revoked.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">For Employers</h4>
              <p className="text-sm text-gray-600">
                Use this tool to verify candidate certifications during the hiring process. All
                verifications are logged for security purposes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
