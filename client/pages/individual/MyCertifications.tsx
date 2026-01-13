import { useState } from 'react';
import { Award, Download, Clock, AlertCircle, CheckCircle, XCircle, Calendar, TrendingUp, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/app/providers/AuthProvider';
import { useUserCertifications, useCertificationStats, CertificationsService } from '@/entities/certifications';
import type { CertificationStatus } from '@/entities/certifications';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * My Certifications Page
 * Displays user's earned certifications (BDA-CP™, BDA-SCP™)
 */

const translations = {
  en: {
    // Header
    title: 'My Certifications',
    subtitle: 'Track your BDA-CP and BDA-SCP certifications and renewals',
    // Stats
    totalCertifications: 'Total Certifications',
    active: 'Active',
    expiringSoon: 'Expiring Soon',
    renewals: 'Renewals',
    // Filters
    allTypes: 'All Types',
    allStatus: 'All Status',
    // Status badges
    statusActive: 'Active',
    statusExpired: 'Expired',
    statusRevoked: 'Revoked',
    statusSuspended: 'Suspended',
    // Loading/Empty
    loading: 'Loading your certifications...',
    noCertifications: 'No certifications found',
    noCertificationsDesc: 'Complete a certification exam to earn your BDA-CP or BDA-SCP certification',
    viewExams: 'View Available Exams',
    // Card content
    certification: 'Certification',
    credentialId: 'Credential ID',
    issued: 'Issued',
    expires: 'Expires',
    expiringIn: (days: number) => `Expiring in ${days} days`,
    renewWarning: 'Renew your certification to maintain your credentials',
    pdcCredits: 'PDC Credits',
    renewedTimes: (count: number) => `Renewed ${count} time${count > 1 ? 's' : ''}`,
    lastRenewal: 'Last renewal',
    // Actions
    downloadCertificate: 'Download Certificate',
    certificatePending: 'Certificate Pending',
    verify: 'Verify',
    renewNow: 'Renew Now',
    // Revocation
    revocationReason: 'Revocation reason',
    // Toast
    downloading: (id: string) => `Downloading ${id} certificate...`,
    downloadFailed: 'Failed to download certificate',
  },
  ar: {
    // Header
    title: 'شهاداتي',
    subtitle: 'تتبع شهادات BDA-CP و BDA-SCP الخاصة بك والتجديدات',
    // Stats
    totalCertifications: 'إجمالي الشهادات',
    active: 'نشطة',
    expiringSoon: 'تنتهي قريباً',
    renewals: 'التجديدات',
    // Filters
    allTypes: 'جميع الأنواع',
    allStatus: 'جميع الحالات',
    // Status badges
    statusActive: 'نشطة',
    statusExpired: 'منتهية',
    statusRevoked: 'ملغاة',
    statusSuspended: 'معلقة',
    // Loading/Empty
    loading: 'جارٍ تحميل شهاداتك...',
    noCertifications: 'لم يتم العثور على شهادات',
    noCertificationsDesc: 'أكمل امتحان الشهادة للحصول على شهادة BDA-CP أو BDA-SCP',
    viewExams: 'عرض الامتحانات المتاحة',
    // Card content
    certification: 'الشهادة',
    credentialId: 'رقم الاعتماد',
    issued: 'تاريخ الإصدار',
    expires: 'تاريخ الانتهاء',
    expiringIn: (days: number) => `تنتهي خلال ${days} يوم`,
    renewWarning: 'جدد شهادتك للحفاظ على اعتماداتك',
    pdcCredits: 'رصيد PDC',
    renewedTimes: (count: number) => `تم التجديد ${count} ${count > 1 ? 'مرات' : 'مرة'}`,
    lastRenewal: 'آخر تجديد',
    // Actions
    downloadCertificate: 'تحميل الشهادة',
    certificatePending: 'الشهادة قيد الإعداد',
    verify: 'تحقق',
    renewNow: 'جدد الآن',
    // Revocation
    revocationReason: 'سبب الإلغاء',
    // Toast
    downloading: (id: string) => `جارٍ تحميل شهادة ${id}...`,
    downloadFailed: 'فشل في تحميل الشهادة',
  }
};

export default function MyCertifications() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const texts = translations[language];

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | CertificationStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'CP' | 'SCP'>('all');

  // Build filters
  const filters = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    certification_type: typeFilter !== 'all' ? typeFilter : undefined,
  };

  // Fetch certifications and stats
  const { data: certificationsResult, isLoading } = useUserCertifications(user?.id || '', filters);
  const { data: statsResult } = useCertificationStats(user?.id || '');

  const certifications = certificationsResult?.data || [];
  const stats = statsResult?.data;

  const [generatingCerts, setGeneratingCerts] = useState<Set<string>>(new Set());

  const handleDownloadCertificate = async (certId: string, credentialId: string, hasUrl: boolean) => {
    try {
      // If certificate URL exists, download directly
      if (hasUrl) {
        const result = await CertificationsService.getCertificateUrl(certId);
        if (result.error) throw result.error;

        if (result.data) {
          window.open(result.data, '_blank');
          toast.success(texts.downloading(credentialId));
        }
        return;
      }

      // Request certificate generation
      setGeneratingCerts(prev => new Set(prev).add(credentialId));
      toast.info(language === 'ar' ? 'جارٍ إنشاء الشهادة...' : 'Generating certificate...');

      const { data, error } = await supabase.rpc('request_certificate_generation', {
        p_credential_id: credentialId,
      });

      if (error) throw error;

      const response = data as { success: boolean; status: string; certificate_url?: string; message?: string };

      if (response.status === 'ready' && response.certificate_url) {
        // Certificate is ready, download it
        const urlResult = await CertificationsService.getCertificateUrl(certId);
        if (urlResult.data) {
          window.open(urlResult.data, '_blank');
          toast.success(texts.downloading(credentialId));
        }
      } else if (response.status === 'queued' || response.status === 'generating') {
        toast.info(response.message || (language === 'ar'
          ? 'تم طلب إنشاء الشهادة. يرجى المحاولة مرة أخرى بعد قليل.'
          : 'Certificate generation requested. Please try again shortly.'));
      }
    } catch (error: any) {
      toast.error(error.message || texts.downloadFailed);
    } finally {
      setGeneratingCerts(prev => {
        const next = new Set(prev);
        next.delete(credentialId);
        return next;
      });
    }
  };

  const getStatusBadge = (status: CertificationStatus) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            {texts.statusActive}
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-300">
            <Clock className="h-3 w-3 mr-1" />
            {texts.statusExpired}
          </Badge>
        );
      case 'revoked':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            {texts.statusRevoked}
          </Badge>
        );
      case 'suspended':
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            {texts.statusSuspended}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Award className="h-8 w-8" />
          {texts.title}
        </h1>
        <p className="mt-2 opacity-90">
          {texts.subtitle}
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{texts.totalCertifications}</p>
                  <p className="text-2xl font-bold">{stats.total_certifications}</p>
                </div>
                <Award className="h-8 w-8 text-royal-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{texts.active}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active_certifications}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{texts.expiringSoon}</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.expiring_soon}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{texts.renewals}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {certifications.reduce((sum, c) => sum + c.renewal_count, 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-48">
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{texts.allTypes}</SelectItem>
                  <SelectItem value="CP">BDA-CP™</SelectItem>
                  <SelectItem value="SCP">BDA-SCP™</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{texts.allStatus}</SelectItem>
                  <SelectItem value="active">{texts.statusActive}</SelectItem>
                  <SelectItem value="expired">{texts.statusExpired}</SelectItem>
                  <SelectItem value="revoked">{texts.statusRevoked}</SelectItem>
                  <SelectItem value="suspended">{texts.statusSuspended}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certifications List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{texts.loading}</p>
        </div>
      ) : certifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">{texts.noCertifications}</p>
            <p className="text-sm text-gray-500 mb-4">
              {texts.noCertificationsDesc}
            </p>
            <Button onClick={() => (window.location.href = '/exam-applications')}>
              {texts.viewExams}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {certifications.map((cert) => {
            const isExpiringSoon = CertificationsService.isExpiringSoon(cert);
            const daysUntilExpiry = CertificationsService.getDaysUntilExpiry(cert);

            return (
              <Card
                key={cert.id}
                className={`hover:shadow-lg transition-shadow ${
                  isExpiringSoon ? 'border-orange-300 border-2' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        BDA-{cert.certification_type}™ {texts.certification}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {texts.credentialId}: <span className="font-mono font-semibold">{cert.credential_id}</span>
                      </p>
                    </div>
                    {getStatusBadge(cert.status)}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {texts.issued}
                      </p>
                      <p className="font-semibold">{formatDate(cert.issued_date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {texts.expires}
                      </p>
                      <p className="font-semibold">{formatDate(cert.expiry_date)}</p>
                    </div>
                  </div>

                  {/* Expiry Warning */}
                  {isExpiringSoon && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-orange-900">
                            {texts.expiringIn(daysUntilExpiry)}
                          </p>
                          <p className="text-xs text-orange-700 mt-1">
                            {texts.renewWarning}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PDC Progress (for active certifications) */}
                  {cert.status === 'active' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">{texts.pdcCredits}</span>
                        <span className="text-sm font-semibold">
                          {cert.pdc_credits_earned} / 60
                        </span>
                      </div>
                      <Progress value={(cert.pdc_credits_earned / 60) * 100} className="h-2" />
                    </div>
                  )}

                  {/* Renewal Info */}
                  {cert.renewal_count > 0 && (
                    <div className="text-xs text-gray-500">
                      {texts.renewedTimes(cert.renewal_count)}
                      {cert.last_renewed_at && ` • ${texts.lastRenewal}: ${formatDate(cert.last_renewed_at)}`}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1"
                      disabled={generatingCerts.has(cert.credential_id)}
                      onClick={() => handleDownloadCertificate(cert.id, cert.credential_id, !!cert.certificate_url)}
                    >
                      {generatingCerts.has(cert.credential_id) ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {generatingCerts.has(cert.credential_id)
                        ? (language === 'ar' ? 'جارٍ الإنشاء...' : 'Generating...')
                        : texts.downloadCertificate}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/verify/${cert.credential_id}`, '_blank')}
                      title={texts.verify}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {texts.verify}
                    </Button>
                    {isExpiringSoon && (
                      <Button variant="outline" className="border-orange-300 text-orange-700">
                        {texts.renewNow}
                      </Button>
                    )}
                  </div>

                  {/* Revocation Reason */}
                  {cert.revocation_reason && (
                    <div className="text-xs bg-red-50 border border-red-200 rounded p-2 text-red-700">
                      <strong>{texts.revocationReason}:</strong> {cert.revocation_reason}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

MyCertifications.displayName = 'MyCertifications';
