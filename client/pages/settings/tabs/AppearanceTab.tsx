/**
 * AppearanceTab Component
 * Theme, language, and timezone settings
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/shared/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useUserPreferences, useUpdatePreferences } from '@/entities/settings/settings.hooks';
import { Palette, Sun, Moon, Monitor, Globe, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function AppearanceTab() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { theme, setTheme, effectiveTheme } = useTheme(user?.id);
  const { data: preferences } = useUserPreferences(user?.id);
  const updatePreferences = useUpdatePreferences();

  const t = {
    en: {
      // Theme
      theme: 'Theme',
      themeDescription: 'Choose how the portal looks to you',
      light: 'Light',
      lightDesc: 'Classic light theme with bright backgrounds',
      dark: 'Dark',
      darkDesc: 'Easy on the eyes in low-light environments',
      system: 'System',
      systemDesc: 'Automatically match your device theme',
      currentTheme: 'Current Theme:',
      // Language
      languageTitle: 'Language',
      languageDescription: 'Choose your preferred language for the portal',
      preferredLanguage: 'Preferred Language',
      english: 'English',
      arabic: 'العربية (Arabic)',
      languageNote: 'Some sections of the portal are available in both English and Arabic',
      // Timezone
      timezone: 'Timezone',
      timezoneDescription: 'Set your timezone for accurate scheduling',
      yourTimezone: 'Your Timezone',
      timezoneNote: 'Used for exam scheduling and reminder notifications',
      // Info
      note: 'Note:',
      noteText: 'Appearance changes are applied immediately and saved to your account. Your preferences will be synced across all your devices.',
    },
    ar: {
      // Theme
      theme: 'المظهر',
      themeDescription: 'اختر كيف يبدو البوابة لك',
      light: 'فاتح',
      lightDesc: 'مظهر فاتح كلاسيكي مع خلفيات مشرقة',
      dark: 'داكن',
      darkDesc: 'مريح للعين في البيئات منخفضة الإضاءة',
      system: 'النظام',
      systemDesc: 'مطابقة تلقائية لمظهر جهازك',
      currentTheme: 'المظهر الحالي:',
      // Language
      languageTitle: 'اللغة',
      languageDescription: 'اختر لغتك المفضلة للبوابة',
      preferredLanguage: 'اللغة المفضلة',
      english: 'English',
      arabic: 'العربية',
      languageNote: 'بعض أقسام البوابة متاحة بالإنجليزية والعربية',
      // Timezone
      timezone: 'المنطقة الزمنية',
      timezoneDescription: 'اضبط منطقتك الزمنية للجدولة الدقيقة',
      yourTimezone: 'منطقتك الزمنية',
      timezoneNote: 'تُستخدم لجدولة الاختبارات وإشعارات التذكير',
      // Info
      note: 'ملاحظة:',
      noteText: 'يتم تطبيق تغييرات المظهر فوراً وحفظها في حسابك. ستتم مزامنة تفضيلاتك عبر جميع أجهزتك.',
    }
  };

  const texts = t[language];

  const handleLanguageChange = async (language: 'en' | 'ar') => {
    if (!user?.id) return;
    await updatePreferences.mutateAsync({
      userId: user.id,
      preferences: { language },
    });
  };

  const handleTimezoneChange = async (timezone: string) => {
    if (!user?.id) return;
    await updatePreferences.mutateAsync({
      userId: user.id,
      preferences: { timezone },
    });
  };

  const themeOptions = [
    {
      value: 'light' as const,
      label: texts.light,
      description: texts.lightDesc,
      icon: Sun,
    },
    {
      value: 'dark' as const,
      label: texts.dark,
      description: texts.darkDesc,
      icon: Moon,
    },
    {
      value: 'system' as const,
      label: texts.system,
      description: texts.systemDesc,
      icon: Monitor,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {texts.theme}
          </CardTitle>
          <CardDescription>{texts.themeDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={(value) => setTheme(value as any)}>
            <div className="space-y-4">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label
                      htmlFor={option.value}
                      className="flex items-start gap-3 flex-1 cursor-pointer"
                    >
                      <div className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </div>
          </RadioGroup>

          {/* Current Theme Preview */}
          <div className="mt-6 rounded-xl border border-border bg-muted/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{texts.currentTheme}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm capitalize text-muted-foreground">{effectiveTheme}</span>
                <div
                  className={`h-4 w-4 rounded-full ${
                    effectiveTheme === 'dark' ? 'bg-[#0f91e0]' : 'border-2 border-slate-300 bg-white'
                  }`}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {texts.languageTitle}
          </CardTitle>
          <CardDescription>{texts.languageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="language">{texts.preferredLanguage}</Label>
            <Select
              value={preferences?.language || 'en'}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{texts.english}</SelectItem>
                <SelectItem value="ar">{texts.arabic}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {texts.languageNote}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Timezone Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {texts.timezone}
          </CardTitle>
          <CardDescription>{texts.timezoneDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="timezone">{texts.yourTimezone}</Label>
            <Select
              value={preferences?.timezone || 'UTC'}
              onValueChange={handleTimezoneChange}
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                <SelectItem value="Asia/Riyadh">Riyadh (AST)</SelectItem>
                <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                <SelectItem value="Australia/Sydney">Sydney (AEDT/AEST)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {texts.timezoneNote}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-[#1c4a8b] dark:bg-[#102a44]">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800 dark:text-sky-100">
            <strong>{texts.note}</strong> {texts.noteText}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
