/**
 * My Certifications Page
 *
 * Display user's earned certifications
 */

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  Award,
  Loader2,
  Download,
  Share2,
  ExternalLink,
  Info,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import CertificateCard from '@/components/CertificateCard';
import {
  getUserCertificates,
  getActiveCertificates,
  getExpiringCertificates,
  downloadCertificatePDF,
  type UserCertificate,
} from '@/entities/certificate';

// ============================================================================
// Component
// ============================================================================

export default function MyCertifications() {
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [allCertificates, setAllCertificates] = useState<UserCertificate[]>([]);
  const [activeCertificates, setActiveCertificates] = useState<UserCertificate[]>([]);
  const [expiringCertificates, setExpiringCertificates] = useState<UserCertificate[]>([]);
  const [selectedTab, setSelectedTab] = useState('all');

  // ========================================================================
  // Load Certificates
  // ========================================================================

  useEffect(() => {
    if (user?.id) {
      loadCertificates();
    }
  }, [user]);

  const loadCertificates = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Load all certificates
      const allResult = await getUserCertificates(user.id);
      if (allResult.error) {
        throw new Error(allResult.error.message);
      }
      setAllCertificates(allResult.data || []);

      // Load active certificates
      const activeResult = await getActiveCertificates(user.id);
      if (activeResult.data) {
        setActiveCertificates(activeResult.data);
      }

      // Load expiring certificates
      const expiringResult = await getExpiringCertificates(user.id);
      if (expiringResult.data) {
        setExpiringCertificates(expiringResult.data);
      }
    } catch (error) {
      console.error('Error loading certificates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load certificates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================================================
  // Certificate Actions
  // ========================================================================

  const handleDownload = async (certificate: UserCertificate) => {
    if (!certificate.certificate_url) {
      toast({
        title: 'Not Available',
        description: 'Certificate PDF is being generated. Please try again in a few minutes.',
        variant: 'destructive',
      });
      return;
    }

    const result = await downloadCertificatePDF(
      certificate.certificate_url,
      certificate.credential_id
    );

    if (result.success) {
      toast({
        title: 'Download Started',
        description: 'Your certificate PDF is being downloaded',
      });
    } else {
      toast({
        title: 'Download Failed',
        description: result.error || 'Failed to download certificate',
        variant: 'destructive',
      });
    }
  };

  const handleShare = (certificate: UserCertificate) => {
    const verificationUrl = `${window.location.origin}/public/verify/${certificate.credential_id}`;

    if (navigator.share) {
      navigator
        .share({
          title: `$BDA-{certificate.certification_type} Certification`,
          text: `I'm certified! Verify my $BDA-{certificate.certification_type} certification.`,
          url: verificationUrl,
        })
        .catch((error) => console.log('Error sharing:', error));
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(verificationUrl);
      toast({
        title: 'Link Copied',
        description: 'Verification link copied to clipboard',
      });
    }
  };

  const handleView = (certificate: UserCertificate) => {
    if (certificate.certificate_url) {
      window.open(certificate.certificate_url, '_blank');
    } else {
      toast({
        title: 'Not Available',
        description: 'Certificate PDF is being generated',
        variant: 'destructive',
      });
    }
  };

  // ========================================================================
  // Render
  // ========================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Award className="h-10 w-10 text-blue-600" />
            <div>
              <h1 className="text-4xl font-bold text-gray-900">My Certifications</h1>
              <p className="text-lg text-gray-600 mt-1">
                View and manage your professional certifications
              </p>
            </div>
          </div>
        </div>

        {/* Expiring Soon Alert */}
        {expiringCertificates.length > 0 && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-900">Renewal Required</AlertTitle>
            <AlertDescription className="text-orange-800">
              You have {expiringCertificates.length} certification(s) expiring within 60 days.
              Please renew to maintain your certification status.
            </AlertDescription>
          </Alert>
        )}

        {/* No Certificates */}
        {allCertificates.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  No Certifications Yet
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Complete a certification exam to earn your professional credential.
                </p>
                <Button onClick={() => (window.location.href = '/dashboard')}>
                  Browse Exams
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Certificates Tabs */
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
              <TabsTrigger value="all">
                All ({allCertificates.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({activeCertificates.length})
              </TabsTrigger>
              <TabsTrigger value="expiring">
                Expiring ({expiringCertificates.length})
              </TabsTrigger>
            </TabsList>

            {/* All Certificates */}
            <TabsContent value="all" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allCertificates.map((certificate) => (
                  <CertificateCard
                    key={certificate.id}
                    certificate={certificate}
                    onDownload={handleDownload}
                    onShare={handleShare}
                    onView={handleView}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Active Certificates */}
            <TabsContent value="active" className="space-y-4">
              {activeCertificates.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-600">No active certifications</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeCertificates.map((certificate) => (
                    <CertificateCard
                      key={certificate.id}
                      certificate={certificate}
                      onDownload={handleDownload}
                      onShare={handleShare}
                      onView={handleView}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Expiring Certificates */}
            <TabsContent value="expiring" className="space-y-4">
              {expiringCertificates.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600">All certifications are up to date</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {expiringCertificates.map((certificate) => (
                    <CertificateCard
                      key={certificate.id}
                      certificate={certificate}
                      onDownload={handleDownload}
                      onShare={handleShare}
                      onView={handleView}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Info Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              About Your Certifications
            </CardTitle>
            <CardDescription>Important information about your credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Verification</h4>
              <p className="text-sm text-gray-600">
                All certifications can be verified by employers and institutions using your
                credential ID. Share your verification link with confidence.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Renewal</h4>
              <p className="text-sm text-gray-600">
                Certifications are valid for 3 years. You'll receive renewal reminders 60 days
                before expiration. Maintain your certification by earning PDC credits.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Digital Badge</h4>
              <p className="text-sm text-gray-600">
                Add your certification to your LinkedIn profile, resume, or email signature.
                Download your digital badge from the certificate details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
