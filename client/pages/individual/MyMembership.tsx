import { useState } from 'react';
import {
  Users,
  Download,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Crown,
  Star,
  Gift,
  BookOpen,
  Shield,
  ExternalLink,
  RefreshCw,
  FileText,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  useUserMembershipStatus,
  useMembershipBenefits,
} from '@/entities/membership';
import type { MembershipStatus, MembershipType } from '@/entities/membership';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadMembershipCertificate } from '@/services/certificate-generator.service';

/**
 * My Membership Page
 * US1: View Membership Status
 * US3: Display Membership Certificate (Professional Only)
 * US5: Display Membership Benefits
 */

const translations = {
  en: {
    // Header
    title: 'My Membership',
    subtitle: 'Manage your BDA membership and access exclusive benefits',
    // Status badges
    statusActive: 'Active',
    statusExpired: 'Expired',
    statusCancelled: 'Cancelled',
    statusSuspended: 'Suspended',
    // Loading
    loading: 'Loading your membership...',
    // Not a member
    notAMember: 'Not a Member Yet',
    notAMemberDesc: 'Join our community of business data analytics professionals and unlock exclusive benefits, resources, and networking opportunities.',
    becomeMember: 'Become a Member',
    // Benefits comparison
    benefitsComparison: 'Membership Benefits Comparison',
    benefitsComparisonDesc: 'See what each membership level offers',
    basicMember: 'Basic Member',
    professionalMember: 'Professional Member',
    // Membership info
    membershipId: 'Membership ID',
    startDate: 'Start Date',
    expiryDate: 'Expiry Date',
    daysRemaining: 'Days Remaining',
    membershipValidity: 'Membership Validity',
    daysRemainingLabel: (days: number) => `${days} days remaining`,
    // Expired banner
    membershipExpired: 'Membership Expired',
    expiredOn: (date: string) => `Your membership expired on ${date}. Renew now to restore your benefits.`,
    renewNow: 'Renew Now',
    // Expiring soon
    membershipExpiringSoon: 'Membership Expiring Soon',
    expiringIn: (days: number) => `Your membership will expire in ${days} days. Renew now to avoid losing access to your benefits.`,
    // Certificate
    membershipCertificate: 'Membership Certificate',
    certificateDesc: 'Download your official BDA Professional Membership certificate',
    professionalCertificate: 'Professional Membership Certificate',
    certificateInfo: 'PDF document • Available even after membership expiry',
    downloading: 'Downloading...',
    downloadCertificate: 'Download Certificate',
    certificatePending: 'Certificate Pending',
    generateCertificate: 'Get Your Certificate',
    generating: 'Generating...',
    certificateGenerationFailed: 'Failed to generate certificate',
    certificateGenerated: 'Certificate generated successfully!',
    // Digital Badge
    digitalBadge: 'Membership Digital Badge',
    digitalBadgeDesc: 'Download your official BDA membership digital badge to share on LinkedIn, email signatures, and social media',
    digitalBadgeFile: 'BDA Individual Membership Badge',
    digitalBadgeInfo: 'PNG image • High resolution • Ready to share',
    downloadBadge: 'Download Badge',
    downloadingBadge: 'Downloading badge...',
    // Benefits
    yourBenefits: 'Your Membership Benefits',
    professionalBenefitsDesc: 'Enjoy all the exclusive benefits of your Professional membership',
    basicBenefitsDesc: 'Your Basic membership benefits',
    // Upgrade
    upgradeToProfessional: 'Upgrade to Professional',
    upgradeDesc: 'Get access to BDA BoCK®, priority support, exclusive webinars, and more!',
    upgradeNow: 'Upgrade Now',
    // Quick links
    bdaBock: 'BDA BoCK®',
    bdaBockDesc: 'Access your exclusive books',
    certifications: 'Certifications',
    certificationsDesc: 'View your BDA-CP™ and BDA-SCP™ credentials',
    helpCenter: 'Help Center',
    helpCenterDesc: 'Get support and answers',
    // Toast
    downloadingCertificate: 'Downloading membership certificate...',
    downloadFailed: 'Failed to download certificate',
  },
  ar: {
    // Header
    title: 'عضويتي',
    subtitle: 'إدارة عضويتك في BDA والوصول إلى المزايا الحصرية',
    // Status badges
    statusActive: 'نشطة',
    statusExpired: 'منتهية',
    statusCancelled: 'ملغاة',
    statusSuspended: 'معلقة',
    // Loading
    loading: 'جارٍ تحميل عضويتك...',
    // Not a member
    notAMember: 'لست عضواً بعد',
    notAMemberDesc: 'انضم إلى مجتمعنا من محترفي تحليلات بيانات الأعمال واحصل على مزايا حصرية وموارد وفرص للتواصل.',
    becomeMember: 'انضم كعضو',
    // Benefits comparison
    benefitsComparison: 'مقارنة مزايا العضوية',
    benefitsComparisonDesc: 'اطلع على ما يقدمه كل مستوى عضوية',
    basicMember: 'عضو أساسي',
    professionalMember: 'عضو محترف',
    // Membership info
    membershipId: 'رقم العضوية',
    startDate: 'تاريخ البدء',
    expiryDate: 'تاريخ الانتهاء',
    daysRemaining: 'الأيام المتبقية',
    membershipValidity: 'صلاحية العضوية',
    daysRemainingLabel: (days: number) => `${days} يوم متبقي`,
    // Expired banner
    membershipExpired: 'العضوية منتهية',
    expiredOn: (date: string) => `انتهت عضويتك في ${date}. جدد الآن لاستعادة مزاياك.`,
    renewNow: 'جدد الآن',
    // Expiring soon
    membershipExpiringSoon: 'العضوية تنتهي قريباً',
    expiringIn: (days: number) => `ستنتهي عضويتك خلال ${days} يوم. جدد الآن لتجنب فقدان الوصول إلى مزاياك.`,
    // Certificate
    membershipCertificate: 'شهادة العضوية',
    certificateDesc: 'تحميل شهادة عضوية BDA المهنية الرسمية',
    professionalCertificate: 'شهادة العضوية المهنية',
    certificateInfo: 'مستند PDF • متاح حتى بعد انتهاء العضوية',
    downloading: 'جارٍ التحميل...',
    downloadCertificate: 'تحميل الشهادة',
    certificatePending: 'الشهادة قيد الإعداد',
    generateCertificate: 'احصل على شهادتك',
    generating: 'جارٍ الإنشاء...',
    certificateGenerationFailed: 'فشل في إنشاء الشهادة',
    certificateGenerated: 'تم إنشاء الشهادة بنجاح!',
    // Digital Badge
    digitalBadge: 'الشارة الرقمية للعضوية',
    digitalBadgeDesc: 'حمّل شارتك الرقمية الرسمية لعضوية BDA لمشاركتها على LinkedIn وتوقيع البريد الإلكتروني ووسائل التواصل الاجتماعي',
    digitalBadgeFile: 'شارة عضوية BDA الفردية',
    digitalBadgeInfo: 'صورة PNG • دقة عالية • جاهزة للمشاركة',
    downloadBadge: 'تحميل الشارة',
    downloadingBadge: 'جارٍ تحميل الشارة...',
    // Benefits
    yourBenefits: 'مزايا عضويتك',
    professionalBenefitsDesc: 'استمتع بجميع المزايا الحصرية لعضويتك المهنية',
    basicBenefitsDesc: 'مزايا عضويتك الأساسية',
    // Upgrade
    upgradeToProfessional: 'الترقية إلى المحترف',
    upgradeDesc: 'احصل على وصول إلى BDA BoCK® والدعم ذو الأولوية والندوات الحصرية والمزيد!',
    upgradeNow: 'ترقية الآن',
    // Quick links
    bdaBock: 'BDA BoCK®',
    bdaBockDesc: 'الوصول إلى كتبك الحصرية',
    certifications: 'الشهادات',
    certificationsDesc: 'عرض شهادات BDA-CP™ و BDA-SCP™',
    helpCenter: 'مركز المساعدة',
    helpCenterDesc: 'احصل على الدعم والإجابات',
    // Toast
    downloadingCertificate: 'جارٍ تحميل شهادة العضوية...',
    downloadFailed: 'فشل في تحميل الشهادة',
  }
};

export default function MyMembership() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const texts = translations[language];
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch membership status
  const { data: statusResult, isLoading, refetch } = useUserMembershipStatus(user?.id || '');
  const membershipStatus = statusResult?.data;

  // Fetch benefits for both types to compare
  const { data: basicBenefitsResult } = useMembershipBenefits('basic');
  const { data: professionalBenefitsResult } = useMembershipBenefits('professional');

  const basicBenefits = basicBenefitsResult?.data || [];
  const professionalBenefits = professionalBenefitsResult?.data || [];

  const handleDownloadCertificate = async () => {
    const membership = membershipStatus?.membership;
    if (!membership?.id) return;

    setIsDownloading(true);
    try {
      // Get user's full name
      const firstName = user?.profile?.first_name || '';
      const lastName = user?.profile?.last_name || '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || user?.email || 'Member';

      // Generate certificate client-side
      await downloadMembershipCertificate({
        membership_id: membership.membership_id,
        user_full_name: fullName,
        membership_type: 'professional',
        start_date: membership.start_date,
        end_date: membership.expiry_date,
      });

      toast.success(texts.downloadingCertificate);
    } catch (error: any) {
      console.error('Certificate generation error:', error);
      toast.error(error.message || texts.downloadFailed);
    } finally {
      setIsDownloading(false);
    }
  };

  // Certificate is now generated client-side, no need for separate generate function
  const handleGenerateCertificate = handleDownloadCertificate;

  const getStatusBadge = (status: MembershipStatus) => {
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
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            {texts.statusCancelled}
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

  const getMembershipIcon = (type: MembershipType | 'none') => {
    switch (type) {
      case 'professional':
        return <Crown className="h-8 w-8 text-royal-600" />;
      case 'basic':
        return <Star className="h-8 w-8 text-blue-500" />;
      default:
        return <Users className="h-8 w-8 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getBenefitIcon = (benefitKey: string) => {
    const icons: Record<string, React.ReactNode> = {
      member_badge: <Shield className="h-5 w-5" />,
      community_access: <Users className="h-5 w-5" />,
      newsletter: <Gift className="h-5 w-5" />,
      job_board: <Star className="h-5 w-5" />,
      bda_bock_access: <BookOpen className="h-5 w-5" />,
      membership_certificate: <Download className="h-5 w-5" />,
      mentorship_program: <Crown className="h-5 w-5" />,
      resource_library: <BookOpen className="h-5 w-5" />,
    };
    return icons[benefitKey] || <CheckCircle className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 border-4 border-royal-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{texts.loading}</p>
        </div>
      </div>
    );
  }

  // No membership state
  if (!membershipStatus?.hasActiveMembership && !membershipStatus?.membership) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            {texts.title}
          </h1>
          <p className="mt-2 opacity-90">{texts.subtitle}</p>
        </div>

        {/* Not a Member Yet */}
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-12 text-center">
            <Users className="h-20 w-20 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{texts.notAMember}</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {texts.notAMemberDesc}
            </p>
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                onClick={() => window.open('https://bda-global.org/en/memberships/', '_blank')}
              >
                <Crown className="h-5 w-5 mr-2" />
                {texts.becomeMember}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Benefits Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>{texts.benefitsComparison}</CardTitle>
            <CardDescription>{texts.benefitsComparisonDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">
                  <Star className="h-4 w-4 mr-2" />
                  {texts.basicMember}
                </TabsTrigger>
                <TabsTrigger value="professional">
                  <Crown className="h-4 w-4 mr-2" />
                  {texts.professionalMember}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="pt-4">
                <div className="space-y-3">
                  {basicBenefits.map((benefit) => (
                    <div
                      key={benefit.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-blue-50"
                    >
                      <div className="text-blue-600">{getBenefitIcon(benefit.benefit_key)}</div>
                      <div>
                        <p className="font-medium text-gray-900">{benefit.benefit_name}</p>
                        {benefit.benefit_description && (
                          <p className="text-sm text-gray-600">{benefit.benefit_description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="professional" className="pt-4">
                <div className="space-y-3">
                  {professionalBenefits.map((benefit) => (
                    <div
                      key={benefit.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-royal-50"
                    >
                      <div className="text-royal-600">{getBenefitIcon(benefit.benefit_key)}</div>
                      <div>
                        <p className="font-medium text-gray-900">{benefit.benefit_name}</p>
                        {benefit.benefit_description && (
                          <p className="text-sm text-gray-600">{benefit.benefit_description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  const membership = membershipStatus.membership!;
  const isProfessional = membership.membership_type === 'professional';
  const currentBenefits = isProfessional ? professionalBenefits : basicBenefits;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8" />
          {texts.title}
        </h1>
        <p className="mt-2 opacity-90">{texts.subtitle}</p>
      </div>

      {/* Expired Membership Banner */}
      {membershipStatus.isExpired && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>{texts.membershipExpired}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {texts.expiredOn(formatDate(membership.expiry_date))}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => window.open('https://bda-global.org/en/memberships/', '_blank')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {texts.renewNow}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Expiring Soon Warning */}
      {membershipStatus.isExpiringSoon && !membershipStatus.isExpired && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <AlertTitle className="text-orange-900">{texts.membershipExpiringSoon}</AlertTitle>
          <AlertDescription className="flex items-center justify-between text-orange-700">
            <span>
              {texts.expiringIn(membershipStatus.daysRemaining)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
              onClick={() => window.open('https://bda-global.org/en/memberships/', '_blank')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {texts.renewNow}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Membership Status Card */}
      <Card className={isProfessional ? 'border-royal-200 bg-royal-50/30' : 'border-blue-200 bg-blue-50/30'}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left: Membership Info */}
            <div className="flex items-start gap-4">
              <div className={`p-4 rounded-full ${isProfessional ? 'bg-royal-100' : 'bg-blue-100'}`}>
                {getMembershipIcon(membership.membership_type)}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {isProfessional ? texts.professionalMember : texts.basicMember}
                  </h2>
                  {getStatusBadge(membership.status)}
                </div>
                <p className="text-sm text-gray-500 font-mono">
                  {texts.membershipId}: {membership.membership_id}
                </p>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">{texts.startDate}</p>
                <p className="font-semibold">{formatDate(membership.start_date)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">{texts.expiryDate}</p>
                <p className="font-semibold">{formatDate(membership.expiry_date)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">{texts.daysRemaining}</p>
                <p className={`font-bold text-2xl ${
                  membershipStatus.isExpired
                    ? 'text-red-600'
                    : membershipStatus.isExpiringSoon
                    ? 'text-orange-600'
                    : 'text-green-600'
                }`}>
                  {membershipStatus.daysRemaining}
                </p>
              </div>
            </div>
          </div>

          {/* Validity Progress */}
          {!membershipStatus.isExpired && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{texts.membershipValidity}</span>
                <span className="text-sm font-semibold">
                  {texts.daysRemainingLabel(membershipStatus.daysRemaining)}
                </span>
              </div>
              <Progress
                value={Math.max(0, (membershipStatus.daysRemaining / 365) * 100)}
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Digital Badge Download - Available for ALL active members */}
      {membershipStatus.hasActiveMembership && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-sky-600" />
              {texts.digitalBadge}
            </CardTitle>
            <CardDescription>
              {texts.digitalBadgeDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-sky-50 rounded-lg border border-sky-100">
              {/* Badge Preview */}
              <div className="flex-shrink-0">
                <img
                  src="https://dfsbzsxuursvqwnzruqt.supabase.co/storage/v1/object/public/certificate-templates/badges/membership-digital-badge.png"
                  alt="BDA Membership Digital Badge"
                  className="w-28 h-28 object-contain rounded-full shadow-sm"
                />
              </div>
              {/* Badge Info */}
              <div className="flex-1 text-center sm:text-left">
                <p className="font-semibold text-gray-900">{texts.digitalBadgeFile}</p>
                <p className="text-sm text-gray-500 mt-1">{texts.digitalBadgeInfo}</p>
              </div>
              {/* Download Button */}
              <a
                href="https://dfsbzsxuursvqwnzruqt.supabase.co/storage/v1/object/public/certificate-templates/badges/membership-digital-badge.png"
                download="BDA-Membership-Digital-Badge.png"
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-md transition-colors text-sm"
                onClick={() => toast.success(texts.downloadingBadge)}
              >
                <Download className="h-4 w-4" />
                {texts.downloadBadge}
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certificate Download (Professional Only) - US3 */}
      {isProfessional && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-royal-600" />
              {texts.membershipCertificate}
            </CardTitle>
            <CardDescription>
              {texts.certificateDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-royal-100 rounded-lg">
                  {membership.certificate_url ? (
                    <Download className="h-6 w-6 text-royal-600" />
                  ) : (
                    <FileText className="h-6 w-6 text-royal-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{texts.professionalCertificate}</p>
                  <p className="text-sm text-gray-500">
                    {texts.certificateInfo}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {membership.certificate_url ? (
                  <Button
                    onClick={handleDownloadCertificate}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {texts.downloading}
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        {texts.downloadCertificate}
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerateCertificate}
                    disabled={isGenerating}
                    variant="default"
                    className="bg-royal-600 hover:bg-royal-700"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {texts.generating}
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        {texts.generateCertificate}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Membership Benefits - US5 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-royal-600" />
            {texts.yourBenefits}
          </CardTitle>
          <CardDescription>
            {isProfessional
              ? texts.professionalBenefitsDesc
              : texts.basicBenefitsDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentBenefits.map((benefit) => (
              <div
                key={benefit.id}
                className={`flex items-start gap-3 p-4 rounded-lg ${
                  isProfessional ? 'bg-royal-50' : 'bg-blue-50'
                }`}
              >
                <div className={isProfessional ? 'text-royal-600' : 'text-blue-600'}>
                  {getBenefitIcon(benefit.benefit_key)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{benefit.benefit_name}</p>
                  {benefit.benefit_description && (
                    <p className="text-sm text-gray-600 mt-1">{benefit.benefit_description}</p>
                  )}
                </div>
                <CheckCircle className={`h-5 w-5 ${isProfessional ? 'text-royal-600' : 'text-blue-600'}`} />
              </div>
            ))}
          </div>

          {/* Upgrade CTA for Basic Members */}
          {!isProfessional && membershipStatus.hasActiveMembership && (
            <div className="mt-6 p-4 bg-gradient-to-r from-royal-50 to-sky-50 rounded-lg border border-royal-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className="h-8 w-8 text-royal-600" />
                  <div>
                    <p className="font-semibold text-gray-900">{texts.upgradeToProfessional}</p>
                    <p className="text-sm text-gray-600">
                      {texts.upgradeDesc}
                    </p>
                  </div>
                </div>
                <Button
                  variant="default"
                  className="bg-royal-600 hover:bg-royal-700"
                  onClick={() => window.open('https://bda-global.org/en/product/professional-membership/', '_blank')}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {texts.upgradeNow}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isProfessional && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/my-books'}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{texts.bdaBock}</p>
                <p className="text-sm text-gray-500">{texts.bdaBockDesc}</p>
              </div>
              <ExternalLink className="h-5 w-5 text-gray-400 ml-auto" />
            </CardContent>
          </Card>
        )}

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/my-certifications'}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{texts.certifications}</p>
              <p className="text-sm text-gray-500">{texts.certificationsDesc}</p>
            </div>
            <ExternalLink className="h-5 w-5 text-gray-400 ml-auto" />
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/help-center'}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{texts.helpCenter}</p>
              <p className="text-sm text-gray-500">{texts.helpCenterDesc}</p>
            </div>
            <ExternalLink className="h-5 w-5 text-gray-400 ml-auto" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

MyMembership.displayName = 'MyMembership';
