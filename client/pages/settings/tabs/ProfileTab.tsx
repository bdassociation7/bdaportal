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
import { User, Lock, Loader2, Save, BriefcaseBusiness, Building2, CalendarDays, Mail, Phone, Layers3, Clock3 } from 'lucide-react';
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
      mobileContact: 'Mobile contact',
      mobileContactDesc: 'Select your country once; its dialling code stays paired with your mobile number.',
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
      yearsExperienceUnit: 'years',
      saveHint: 'Review your details, then save them securely to your BDA profile.',
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
      mobileContact: 'بيانات الجوال',
      mobileContactDesc: 'اختر دولتك مرة واحدة، وسيبقى مفتاح الاتصال مرتبطاً برقم جوالك.',
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
      yearsExperienceUnit: 'سنوات',
      saveHint: 'راجع بياناتك ثم احفظها بأمان في ملفك لدى BDA.',
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
      <Card className="overflow-hidden border-border shadow-[0_16px_40px_rgba(13,31,78,0.07)] dark:shadow-black/20">
        <CardHeader className="border-b border-border bg-gradient-to-r from-[#f0f6ff] via-white to-white px-5 py-5 sm:px-7 dark:from-[#102a44] dark:via-[#0f2137] dark:to-[#0f2137]">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f91e0] text-white shadow-[0_8px_20px_rgba(15,145,224,0.25)]">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xl font-bold tracking-tight text-[#0d1f4e] dark:text-slate-100 sm:text-2xl">
                {texts.personalInfo}
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {texts.personalInfoDesc}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {texts.firstName} <span className="text-[#0f91e0]">*</span>
              </Label>
              <Input
                id="first_name"
                value={profileData.first_name}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, first_name: e.target.value }))
                }
                placeholder={texts.firstNamePlaceholder}
                className="h-12 rounded-xl border-input bg-background px-4 shadow-sm transition-colors focus-visible:border-[#0f91e0] focus-visible:ring-[#0f91e0]/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {texts.lastName} <span className="text-[#0f91e0]">*</span>
              </Label>
              <Input
                id="last_name"
                value={profileData.last_name}
                onChange={(e) =>
                  setProfileData((prev) => ({ ...prev, last_name: e.target.value }))
                }
                placeholder={texts.lastNamePlaceholder}
                className="h-12 rounded-xl border-input bg-background px-4 shadow-sm transition-colors focus-visible:border-[#0f91e0] focus-visible:ring-[#0f91e0]/20"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/60 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-[#1c4a8b] shadow-sm dark:text-sky-300">
                <Mail className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-800 dark:text-slate-100">{texts.email}</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="mt-1 h-auto border-0 bg-transparent p-0 text-sm text-slate-500 shadow-none disabled:cursor-default disabled:opacity-100 dark:text-slate-300"
                />
              </div>
            </div>
            <p className="mt-2 pl-12 text-xs leading-5 text-slate-500 dark:text-slate-400">{texts.emailNote}</p>
          </div>

          <div className="rounded-2xl border border-[#cfe8fb] bg-[#f7fbff] p-4 sm:p-5 dark:border-[#1c4a8b] dark:bg-[#102a44]/70">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#dbeafe] text-[#0f91e0] dark:bg-[#1c4a8b]/45 dark:text-sky-300">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0d1f4e] dark:text-slate-100">{texts.mobileContact}</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">{texts.mobileContactDesc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(13rem,0.8fr)]">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-slate-800 dark:text-slate-100">{texts.phone}</Label>
                <div className="flex h-12 overflow-hidden rounded-xl border border-[#bfdbfe] bg-white shadow-sm transition-shadow focus-within:ring-4 focus-within:ring-[#0f91e0]/10 dark:border-[#2d5d8f] dark:bg-background">
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
                    className="h-full w-[45%] rounded-none border-0 border-r border-[#bfdbfe] bg-[#f0f6ff] px-3 shadow-none hover:bg-[#e3f1fd] focus-visible:ring-0 dark:border-[#2d5d8f] dark:bg-[#163654] dark:text-slate-100 dark:hover:bg-[#1c4a8b] sm:w-[42%]"
                  />
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder={texts.phonePlaceholder}
                    className="h-full flex-1 rounded-none border-0 bg-white px-4 text-base shadow-none focus-visible:ring-0 dark:bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth" className="text-sm font-semibold text-slate-800 dark:text-slate-100">{texts.dateOfBirth}</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0f91e0]" />
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={profileData.date_of_birth}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, date_of_birth: e.target.value }))
                    }
                    className="h-12 rounded-xl border-input bg-background pl-11 pr-4 shadow-sm transition-colors focus-visible:border-[#0f91e0] focus-visible:ring-[#0f91e0]/20"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information Card */}
      <Card className="overflow-hidden border-border shadow-[0_16px_40px_rgba(13,31,78,0.07)] dark:shadow-black/20">
        <CardHeader className="border-b border-border bg-gradient-to-r from-white via-white to-[#f0f6ff] px-5 py-5 sm:px-7 dark:from-[#0f2137] dark:via-[#0f2137] dark:to-[#102a44]">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1c4a8b] text-white shadow-[0_8px_20px_rgba(28,74,139,0.24)]">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xl font-bold tracking-tight text-[#0d1f4e] dark:text-slate-100 sm:text-2xl">
                {texts.professionalInfo}
              </CardTitle>
              <CardDescription className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {texts.professionalInfoDesc}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="job_title" className="text-sm font-semibold text-slate-800 dark:text-slate-100">{texts.jobTitle}</Label>
              <div className="relative">
                <BriefcaseBusiness className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0f91e0]" />
                <Input
                  id="job_title"
                  value={profileData.job_title}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, job_title: e.target.value }))
                  }
                  placeholder={texts.jobTitlePlaceholder}
                  className="h-12 rounded-xl border-input bg-background pl-11 pr-4 shadow-sm transition-colors focus-visible:border-[#0f91e0] focus-visible:ring-[#0f91e0]/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organisation" className="text-sm font-semibold text-slate-800 dark:text-slate-100">{texts.organization}</Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0f91e0]" />
                <Input
                  id="organisation"
                  value={profileData.organization}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, organization: e.target.value }))
                  }
                  placeholder={texts.organizationPlaceholder}
                  className="h-12 rounded-xl border-input bg-background pl-11 pr-4 shadow-sm transition-colors focus-visible:border-[#0f91e0] focus-visible:ring-[#0f91e0]/20"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(13rem,0.55fr)]">
            <div className="space-y-2">
              <Label htmlFor="industry" className="text-sm font-semibold text-slate-800 dark:text-slate-100">{texts.industry}</Label>
              <div className="relative">
                <Layers3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0f91e0]" />
                <Input
                  id="industry"
                  value={profileData.industry}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, industry: e.target.value }))
                  }
                  placeholder={texts.industryPlaceholder}
                  className="h-12 rounded-xl border-input bg-background pl-11 pr-4 shadow-sm transition-colors focus-visible:border-[#0f91e0] focus-visible:ring-[#0f91e0]/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience_years" className="text-sm font-semibold text-slate-800 dark:text-slate-100">{texts.yearsExperience}</Label>
              <div className="relative">
                <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0f91e0]" />
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
                  className="h-12 rounded-xl border-input bg-background pl-11 pr-16 shadow-sm transition-colors focus-visible:border-[#0f91e0] focus-visible:ring-[#0f91e0]/20"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 dark:text-slate-300">{texts.yearsExperienceUnit}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button for All Profile Changes */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/60 px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{texts.saveHint}</p>
        <Button
          onClick={handleProfileSave}
          disabled={!profileChanged || updateProfile.isPending}
          size="lg"
          className="h-11 rounded-xl bg-[#0f91e0] px-6 font-semibold shadow-[0_8px_18px_rgba(15,145,224,0.24)] transition-all hover:bg-[#1c4a8b] active:scale-[0.98]"
        >
          {updateProfile.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {texts.saving}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
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
              <p className="text-xs text-muted-foreground">{texts.newPasswordNote}</p>
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
      <Card className="border-blue-200 bg-blue-50 dark:border-[#1c4a8b] dark:bg-[#102a44]">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800 dark:text-sky-100">
            <strong>{texts.securityNotice}</strong> {texts.securityNoticeText}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
