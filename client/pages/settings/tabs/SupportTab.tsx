/**
 * SupportTab Component
 * Help & Support with quick ticket submission
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/shared/hooks/useAuth';
import { useCreateTicket } from '@/entities/support/ticket.hooks';
import { useToast } from '@/hooks/use-toast';
import { HelpCircle, Mail, BookOpen, MessageSquare, ExternalLink, Send, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function SupportTab() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const createTicket = useCreateTicket();

  const t = {
    en: {
      // Contact Support Card
      contactSupport: 'Contact Support',
      contactSupportDesc: 'Get help from our support team',
      emailSupport: 'Email Support',
      knowledgeBase: 'Knowledge Base',
      faqs: 'FAQs',
      viewMyTickets: 'View My Support Tickets',
      // Submit Ticket Card
      submitTicket: 'Submit a Support Ticket',
      submitTicketDesc: 'Describe your issue and our team will assist you',
      category: 'Category',
      subject: 'Subject',
      subjectPlaceholder: 'Brief summary of your issue',
      description: 'Description',
      descriptionPlaceholder: 'Describe your issue in detail...',
      descriptionNote: 'Minimum 20 characters. Be as specific as possible.',
      forAttachments: 'For attachments, use',
      fullTicketForm: 'full ticket form',
      submitting: 'Submitting...',
      submitTicketBtn: 'Submit Ticket',
      // Categories
      catCertification: 'Certification',
      catExam: 'Exam',
      catPdc: 'PDC (Professional Development Credits)',
      catAccount: 'Account & Profile',
      catPartnership: 'Partnership',
      catTechnical: 'Technical Issue',
      catOther: 'Other',
      // Validation
      validationError: 'Validation Error',
      subjectMinLength: 'Subject must be at least 5 characters.',
      descriptionMinLength: 'Description must be at least 20 characters.',
      // Success/Error
      ticketSubmitted: 'Ticket Submitted',
      ticketSubmittedDesc: 'Your support ticket has been created successfully. We will respond shortly.',
      error: 'Error',
      failedToCreate: 'Failed to create ticket. Please try again.',
    },
    ar: {
      // Contact Support Card
      contactSupport: 'تواصل مع الدعم',
      contactSupportDesc: 'احصل على المساعدة من فريق الدعم',
      emailSupport: 'دعم البريد الإلكتروني',
      knowledgeBase: 'قاعدة المعرفة',
      faqs: 'الأسئلة الشائعة',
      viewMyTickets: 'عرض تذاكر الدعم الخاصة بي',
      // Submit Ticket Card
      submitTicket: 'إرسال تذكرة دعم',
      submitTicketDesc: 'اوصف مشكلتك وسيساعدك فريقنا',
      category: 'الفئة',
      subject: 'الموضوع',
      subjectPlaceholder: 'ملخص موجز لمشكلتك',
      description: 'الوصف',
      descriptionPlaceholder: 'اوصف مشكلتك بالتفصيل...',
      descriptionNote: 'الحد الأدنى 20 حرفاً. كن محدداً قدر الإمكان.',
      forAttachments: 'للمرفقات، استخدم',
      fullTicketForm: 'نموذج التذكرة الكامل',
      submitting: 'جارٍ الإرسال...',
      submitTicketBtn: 'إرسال التذكرة',
      // Categories
      catCertification: 'الشهادات',
      catExam: 'الاختبار',
      catPdc: 'PDC (نقاط التطوير المهني)',
      catAccount: 'الحساب والملف الشخصي',
      catPartnership: 'الشراكة',
      catTechnical: 'مشكلة تقنية',
      catOther: 'أخرى',
      // Validation
      validationError: 'خطأ في التحقق',
      subjectMinLength: 'يجب أن يتكون الموضوع من 5 أحرف على الأقل.',
      descriptionMinLength: 'يجب أن يتكون الوصف من 20 حرفاً على الأقل.',
      // Success/Error
      ticketSubmitted: 'تم إرسال التذكرة',
      ticketSubmittedDesc: 'تم إنشاء تذكرة الدعم بنجاح. سنرد عليك قريباً.',
      error: 'خطأ',
      failedToCreate: 'فشل في إنشاء التذكرة. يرجى المحاولة مرة أخرى.',
    }
  };

  const texts = t[language];

  const [ticketData, setTicketData] = useState({
    category: 'account',
    subject: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation with toast notifications
    if (!ticketData.subject || ticketData.subject.length < 5) {
      toast({
        title: texts.validationError,
        description: texts.subjectMinLength,
        variant: 'destructive',
      });
      return;
    }

    if (!ticketData.description || ticketData.description.length < 20) {
      toast({
        title: texts.validationError,
        description: texts.descriptionMinLength,
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTicket.mutateAsync({
        category: ticketData.category as any,
        subject: ticketData.subject,
        description: ticketData.description,
        priority: 'normal',
        attachments: [],
      });

      // Show success toast
      toast({
        title: texts.ticketSubmitted,
        description: texts.ticketSubmittedDesc,
      });

      // Clear form on success
      setTicketData({
        category: 'account',
        subject: '',
        description: '',
      });
    } catch (error) {
      // Show error toast
      toast({
        title: texts.error,
        description: error instanceof Error ? error.message : texts.failedToCreate,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {texts.contactSupport}
          </CardTitle>
          <CardDescription>{texts.contactSupportDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-[#1c4a8b] dark:bg-[#102a44]">
            <Mail className="h-5 w-5 text-blue-600 dark:text-sky-300" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-sky-100">{texts.emailSupport}</p>
              <a
                href="mailto:support@bda-global.org"
                className="text-sm text-blue-600 hover:underline dark:text-sky-300"
              >
                support@bda-global.org
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" asChild>
              <a href="https://bda-global.org/knowledge-base" target="_blank" rel="noopener noreferrer">
                <BookOpen className="h-4 w-4 mr-2" />
                {texts.knowledgeBase}
                <ExternalLink className="h-3 w-3 ml-2" />
              </a>
            </Button>

            <Button variant="outline" asChild>
              <a href="https://bda-global.org/faqs" target="_blank" rel="noopener noreferrer">
                <MessageSquare className="h-4 w-4 mr-2" />
                {texts.faqs}
                <ExternalLink className="h-3 w-3 ml-2" />
              </a>
            </Button>
          </div>

          <Button
            onClick={() => navigate('/support/my-tickets')}
            variant="outline"
            className="w-full"
          >
            {texts.viewMyTickets}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Ticket Submission */}
      <Card>
        <CardHeader>
          <CardTitle>{texts.submitTicket}</CardTitle>
          <CardDescription>{texts.submitTicketDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">{texts.category} *</Label>
              <Select
                value={ticketData.category}
                onValueChange={(value) =>
                  setTicketData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="certification">{texts.catCertification}</SelectItem>
                  <SelectItem value="exam">{texts.catExam}</SelectItem>
                  <SelectItem value="pdc">{texts.catPdc}</SelectItem>
                  <SelectItem value="account">{texts.catAccount}</SelectItem>
                  <SelectItem value="partnership">{texts.catPartnership}</SelectItem>
                  <SelectItem value="technical">{texts.catTechnical}</SelectItem>
                  <SelectItem value="other">{texts.catOther}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">{texts.subject} *</Label>
              <Input
                id="subject"
                value={ticketData.subject}
                onChange={(e) =>
                  setTicketData((prev) => ({ ...prev, subject: e.target.value }))
                }
                placeholder={texts.subjectPlaceholder}
                required
                minLength={5}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{texts.description} *</Label>
              <Textarea
                id="description"
                value={ticketData.description}
                onChange={(e) =>
                  setTicketData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder={texts.descriptionPlaceholder}
                required
                minLength={20}
                maxLength={5000}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                {texts.descriptionNote}
              </p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <p className="text-sm text-muted-foreground">
                {texts.forAttachments}{' '}
                <button
                  type="button"
                  onClick={() => navigate('/support/new')}
                  className="text-blue-600 hover:underline dark:text-sky-300"
                >
                  {texts.fullTicketForm}
                </button>
              </p>
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {texts.submitting}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {texts.submitTicketBtn}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
