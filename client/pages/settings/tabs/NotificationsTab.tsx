/**
 * NotificationsTab Component
 * Manage notification preferences with toggle switches
 */

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '@/entities/settings/settings.hooks';
import { Bell, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function NotificationsTab() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { data: settings, isLoading } = useNotificationSettings(user?.id);
  const updateSettings = useUpdateNotificationSettings();

  const t = {
    en: {
      title: 'Notification Preferences',
      description: 'Choose which notifications you want to receive',
      failedToLoad: 'Failed to load notification settings.',
      note: 'Note:',
      noteText: 'These settings control email notifications. Changes are saved automatically when you toggle each option.',
      // Notification options
      membershipUpdates: 'Membership Updates',
      membershipUpdatesDesc: 'Notifications about membership renewals and status changes',
      certificationUpdates: 'Certification Updates',
      certificationUpdatesDesc: 'Notifications about certification applications and results',
      newResources: 'New Resources',
      newResourcesDesc: 'Notifications when new learning resources are added',
      examReminders: 'Exam Reminders',
      examRemindersDesc: 'Reminders for upcoming exams (48h and 24h before)',
      pdcReminders: 'PDC Reminders',
      pdcRemindersDesc: 'Reminders for PDC submissions and renewal deadlines',
      systemAlerts: 'System Alerts',
      systemAlertsDesc: 'Important system-wide alerts and announcements',
    },
    ar: {
      title: 'تفضيلات الإشعارات',
      description: 'اختر الإشعارات التي تريد تلقيها',
      failedToLoad: 'فشل في تحميل إعدادات الإشعارات.',
      note: 'ملاحظة:',
      noteText: 'تتحكم هذه الإعدادات في إشعارات البريد الإلكتروني. يتم حفظ التغييرات تلقائياً عند تبديل كل خيار.',
      // Notification options
      membershipUpdates: 'تحديثات العضوية',
      membershipUpdatesDesc: 'إشعارات حول تجديد العضوية وتغييرات الحالة',
      certificationUpdates: 'تحديثات الشهادات',
      certificationUpdatesDesc: 'إشعارات حول طلبات الشهادات والنتائج',
      newResources: 'موارد جديدة',
      newResourcesDesc: 'إشعارات عند إضافة موارد تعليمية جديدة',
      examReminders: 'تذكيرات الاختبارات',
      examRemindersDesc: 'تذكيرات للاختبارات القادمة (قبل 48 و24 ساعة)',
      pdcReminders: 'تذكيرات PDC',
      pdcRemindersDesc: 'تذكيرات لتقديم PDC ومواعيد التجديد',
      systemAlerts: 'تنبيهات النظام',
      systemAlertsDesc: 'تنبيهات وإعلانات هامة على مستوى النظام',
    }
  };

  const texts = t[language];

  const handleToggle = async (field: keyof typeof settings, value: boolean) => {
    if (!user?.id || !settings) return;

    await updateSettings.mutateAsync({
      userId: user.id,
      settings: {
        [field]: value,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-royal-600" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">{texts.failedToLoad}</p>
        </CardContent>
      </Card>
    );
  }

  const notificationOptions = [
    {
      id: 'membership_updates',
      label: texts.membershipUpdates,
      description: texts.membershipUpdatesDesc,
      value: settings.membership_updates,
    },
    {
      id: 'certification_updates',
      label: texts.certificationUpdates,
      description: texts.certificationUpdatesDesc,
      value: settings.certification_updates,
    },
    {
      id: 'new_resources',
      label: texts.newResources,
      description: texts.newResourcesDesc,
      value: settings.new_resources,
    },
    {
      id: 'exam_reminders',
      label: texts.examReminders,
      description: texts.examRemindersDesc,
      value: settings.exam_reminders,
    },
    {
      id: 'pdc_reminders',
      label: texts.pdcReminders,
      description: texts.pdcRemindersDesc,
      value: settings.pdc_reminders,
    },
    {
      id: 'system_alerts',
      label: texts.systemAlerts,
      description: texts.systemAlertsDesc,
      value: settings.system_alerts,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {texts.title}
          </CardTitle>
          <CardDescription>{texts.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationOptions.map((option, index) => (
            <div key={option.id}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor={option.id} className="text-base font-medium">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                <Switch
                  id={option.id}
                  checked={option.value}
                  onCheckedChange={(checked) =>
                    handleToggle(option.id as keyof typeof settings, checked)
                  }
                  disabled={updateSettings.isPending}
                />
              </div>
              {index < notificationOptions.length - 1 && <Separator className="mt-6" />}
            </div>
          ))}
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
