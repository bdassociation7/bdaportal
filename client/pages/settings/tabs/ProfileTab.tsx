/**
 * ProfileTab Component
 * Complete profile editor with ALL user fields organized in sections
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/shared/hooks/useAuth';
import { useUpdateProfile, useChangePassword } from '@/entities/settings/settings.hooks';
import { User, Lock, Loader2, Save, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { CountryDialCodeSelect } from '@/components/ui/country-dial-code-select';

export function ProfileTab() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const t = {
    en: {
      // Personal Information
      personalInfo: 'Personal Information',
      personalInfoDesc: 'Your basic personal details',
      firstName: 'First Name',
      lastName: 'Last Name',
      firstNamePlaceholder: 'Enter your first name',
      lastNamePlaceholder: 'Enter your last name',
      email: 'Email (Read-only)',
      emailNote: 'Email cannot be changed for security reasons',
      countryCode: 'Country and Dialling Code',
      countryCodePlaceholder: 'Select your country',
      countryCodeSearchPlaceholder: 'Search by country, ISO code, or dial code...',
      countryCodeEmpty: 'No country found.',
      phone: 'Phone Number',
      phonePlaceholder: '555-123-4567',
      dateOfBirth: 'Date of Birth',
      // Professional Information
      professionalInfo: 'Professional Information',
      professionalInfoDesc: 'Your professional background and experience',
      jobTitle: 'Job Title',
      jobTitlePlaceholder: 'e.g., Business Development Manager',
      organization: 'Organisation / Company',
      organizationPlaceholder: 'Organisation or company name',
      industry: 'Industry',
      industryPlaceholder: 'e.g., Technology, Finance, Healthcare',
      yearsExperience: 'Years of Experience',
      yearsExperiencePlaceholder: 'Number of years in business development',
      // Buttons
      saving: 'Saving...',
      saveAllChanges: 'Save All Changes',
      // Password
      changePassword: 'Change Password',
      changePasswordDesc: 'Update your account password',
      currentPassword: 'Current Password',
      currentPasswordPlaceholder: 'Enter your current password',
      newPassword: 'New Password',
      newPasswordPlaceholder: 'Enter new password (min 8 characters)',
      newPasswordNote: 'Password must be at least 8 characters',
      confirmPassword: 'Confirm New Password',
      confirmPasswordPlaceholder: 'Re-enter new password',
      updating: 'Updating...',
      // Validation
      validationError: 'Validation Error',
      fillAllFields: 'Please fill in all password fields.',
      minPasswordLength: 'New password must be at least 8 characters.',
      passwordsNoMatch: 'New passwords do not match.',
      // Security Notice
      securityNotice: 'Security Notice:',
      securityNoticeText: 'After changing your password, you will remain logged in on this device. For security, we recommend logging out and back in on other devices.',
    },
    ar: {
      // Personal Information
      personalInfo: 'المعلومات الشخصية',
      personalInfoDesc: 'بياناتك الشخصية الأساسية',
      firstName: 'الاسم الأول',
      lastName: 'اسم العائلة',
      firstNamePlaceholder: 'أدخل اسمك الأول',
      lastNamePlaceholder: 'أدخل اسم عائلتك',
      email: 'البريد الإلكتروني (للقراءة فقط)',
      emailNote: 'لا يمكن تغيير البريد الإلكتروني لأسباب أمنية',
      countryCode: 'الدولة ومفتاح الاتصال',
      countryCodePlaceholder: 'اختر دولتك',
      countryCodeSearchPlaceholder: 'ابحث باسم الدولة أو الرمز أو مفتاح الاتصال...',
      countryCodeEmpty: 'لم يتم العثور على دولة.',
      phone: 'رقم الهاتف',
      phonePlaceholder: '555-123-4567',
      dateOfBirth: 'تاريخ الميلاد',
      // Professional Information
      professionalInfo: 'المعلومات المهنية',
      professionalInfoDesc: 'خلفيتك المهنية وخبراتك',
      jobTitle: 'المسمى الوظيفي',
      jobTitlePlaceholder: 'مثال: مدير تطوير الأعمال',
      organization: 'المنظمة / الشركة',
      organizationPlaceholder: 'اسم المنظمة أو الشركة',
      industry: 'الصناعة',
      industryPlaceholder: 'مثال: التكنولوجيا، المالية، الرعاية الصحية',
      yearsExperience: 'سنوات الخبرة',
      yearsExperiencePlaceholder: 'عدد سنوات الخبرة في تطوير الأعمال',
      // Buttons
      saving: 'جارٍ الحفظ...',
      saveAllChanges: 'حفظ جميع التغييرات',
      // Password
      changePassword: 'تغيير كلمة المرور',
      changePasswordDesc: 'تحديث كلمة مرور حسابك',
      currentPassword: 'كلمة المرور الحالية',
      currentPasswordPlaceholder: 'أدخل كلمة المرور الحالية',
      newPassword: 'كلمة المرور الجديدة',
      newPasswordPlaceholder: 'أدخل كلمة المرور الجديدة (8 أحرف على الأقل)',
      newPasswordNote: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل',
      confirmPassword: 'تأكيد كلمة المرور الجديدة',
      confirmPasswordPlaceholder: 'أعد إدخال كلمة المرور الجديدة',
      updating: 'جارٍ التحديث...',
      // Validation
      validationError: 'خطأ في التحقق',
      fillAllFields: 'يرجى ملء جميع حقول كلمة المرور.',
      minPasswordLength: 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.',
      passwordsNoMatch: 'كلمات المرور الجديدة غير متطابقة.',
      // Security Notice
      securityNotice: 'ملاحظة أمنية:',
      securityNoticeText: 'بعد تغيير كلمة المرور، ستظل مسجل الدخول على هذا الجهاز. للأمان، نوصي بتسجيل الخروج والدخول مرة أخرى على الأجهزة الأخرى.',
    }
  };

  const texts = t[language];

  // Complete profile form state with ALL fields
  const [profileData, setProfileData] = useState({
    // Personal Information
    first_name: '',
    last_name: '',
    phone: '',
    country_code: '',
    date_of_birth: '',

    // Professional Information
    job_title: '',
    organization: '',
    industry: '',
    experience_years: 0,
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileChanged, setProfileChanged] = useState(false);

  // Load ALL user data
  useEffect(() => {
    if (user?.profile) {
      setProfileData({
        first_name: user.profile.first_name || '',
        last_name: user.profile.last_name || '',
        phone: user.profile.phone || '',
        country_code: user.profile.country_code || '',
        date_of_birth: user.profile.date_of_birth || '',
        job_title: user.profile.job_title || '',
        organization: user.profile.organization || '',
        industry: user.profile.industry || '',
        experience_years: user.profile.experience_years || 0,
      });
    }
  }, [user]);

  // Track if ANY field changed
  useEffect(() => {
    if (!user?.profile) return;

    const hasChanges =
      profileData.first_name !== (user.profile.first_name || '') ||
      profileData.last_name !== (user.profile.last_name || '') ||
      profileData.phone !== (user.profile.phone || '') ||
      profileData.country_code !== (user.profile.country_code || '') ||
      profileData.date_of_birth !== (user.profile.date_of_birth || '') ||
      profileData.job_title !== (user.profile.job_title || '') ||
      profileData.organization !== (user.profile.organization || '') ||
      profileData.industry !== (user.profile.industry || '') ||
      profileData.experience_years !== (user.profile.experience_years || 0);

    setProfileChanged(hasChanges);
  }, [profileData, user]);

  const handleProfileSave = async () => {
    if (!user?.id) return;

    await updateProfile.mutateAsync({
      userId: user.id,
      updates: profileData,
    });

    setProfileChanged(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: texts.validationError,
        description: texts.fillAllFields,
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: texts.validationError,
        description: texts.minPasswordLength,
        variant: 'destructive',
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: texts.validationError,
        description: texts.passwordsNoMatch,
        variant: 'destructive',
      });
      return;
    }

    await changePassword.mutateAsync(passwordData.newPassword);

    // Clear form on success
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Personal Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {texts.personalInfo}
          </CardTitle>
          <CardDescription>{texts.personalInfoDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">{texts.firstName} *</Label>
              <Input
                id="first_name"
                value={profileData.first_name}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, first_name: e.target.value }))
                }
                placeholder={texts.firstNamePlaceholder}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">{texts.lastName} *</Label>
              <Input
                id="last_name"
                value={profileData.last_name}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, last_name: e.target.value }))
                }
                placeholder={texts.lastNamePlaceholder}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{texts.email}</Label>
            <Input id="email" value={user?.email || ''} disabled className="bg-gray-100" />
            <p className="text-xs text-gray-500">{texts.emailNote}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">{texts.phone}</Label>
              <div className="flex overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <CountryDialCodeSelect
                  id="country_code"
                  value={profileData.country_code}
                  onValueChange={(value) =>
                    setProfileData((prev) => ({ ...prev, country_code: value }))
                  }
                  placeholder={texts.countryCodePlaceholder}
                  searchPlaceholder={texts.countryCodeSearchPlaceholder}
                  emptyText={texts.countryCodeEmpty}
                  ariaLabel={texts.countryCode}
                  className="h-11 w-[min(17rem,48%)] rounded-none border-0 border-r border-input bg-muted/30 shadow-none hover:bg-muted/50 focus-visible:ring-0"
                />
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder={texts.phonePlaceholder}
                  className="h-11 flex-1 rounded-none border-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">{texts.dateOfBirth}</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={profileData.date_of_birth}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, date_of_birth: e.target.value }))
                }
                className="h-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            {texts.professionalInfo}
          </CardTitle>
          <CardDescription>{texts.professionalInfoDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="job_title">{texts.jobTitle}</Label>
              <Input
                id="job_title"
                value={profileData.job_title}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, job_title: e.target.value }))
                }
                placeholder={texts.jobTitlePlaceholder}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organisation">{texts.organization}</Label>
              <Input
                id="organisation"
                value={profileData.organization}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, organization: e.target.value }))
                }
                placeholder={texts.organizationPlaceholder}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="industry">{texts.industry}</Label>
              <Input
                id="industry"
                value={profileData.industry}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, industry: e.target.value }))
                }
                placeholder={texts.industryPlaceholder}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience_years">{texts.yearsExperience}</Label>
            <Input
              id="experience_years"
              type="number"
              min="0"
              max="50"
              value={profileData.experience_years || ''}
              onChange={(e) =>
                setProfileData((prev) => ({
                  ...prev,
                  experience_years: parseInt(e.target.value) || 0,
                }))
              }
              placeholder={texts.yearsExperiencePlaceholder}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button for All Profile Changes */}
      <div className="flex justify-end">
        <Button
          onClick={handleProfileSave}
          disabled={!profileChanged || updateProfile.isPending}
          size="lg"
        >
          {updateProfile.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {texts.saving}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {texts.saveAllChanges}
            </>
          )}
        </Button>
      </div>

      <Separator className="my-6" />

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {texts.changePassword}
          </CardTitle>
          <CardDescription>{texts.changePasswordDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_password">{texts.currentPassword} *</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))
                }
                placeholder={texts.currentPasswordPlaceholder}
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_password">{texts.newPassword} *</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                placeholder={texts.newPasswordPlaceholder}
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-500">{texts.newPasswordNote}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">{texts.confirmPassword} *</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                placeholder={texts.confirmPasswordPlaceholder}
                autoComplete="new-password"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={changePassword.isPending} variant="secondary">
                {changePassword.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {texts.updating}
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    {texts.changePassword}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>{texts.securityNotice}</strong> {texts.securityNoticeText}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
