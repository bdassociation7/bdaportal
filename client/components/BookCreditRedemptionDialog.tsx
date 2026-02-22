import { useState } from 'react';
import { BookOpen, Check, Loader2, Languages } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useBookOptions, useRedeemBookCredit } from '@/entities/books';
import type { BookCredit } from '@/entities/books';
import { useLanguage } from '@/contexts/LanguageContext';

interface BookCreditRedemptionDialogProps {
  credit: BookCredit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BookCreditRedemptionDialog({
  credit,
  open,
  onOpenChange,
  onSuccess,
}: BookCreditRedemptionDialogProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  // Fetch book options for this credit
  const { data: bookOptions, isLoading: isLoadingOptions } = useBookOptions(
    credit.book_product_group
  );

  // Redeem mutation
  const redeemMutation = useRedeemBookCredit();

  const t = {
    en: {
      title: 'Choose Book Language',
      description: 'Select which language version you would like to access. You can only choose one language per book credit.',
      selectLanguage: 'Select Language Version',
      english: 'English',
      arabic: 'Arabic',
      pages: 'pages',
      redeem: 'Redeem Book',
      redeeming: 'Redeeming...',
      cancel: 'Cancel',
      creditFrom: 'Credit from',
      membership: 'Membership',
      validUntil: 'Valid until',
      unlimited: 'Unlimited',
      // Toasts
      redeemSuccess: 'Book Redeemed',
      redeemSuccessDesc: 'You now have access to this book',
      redeemError: 'Redemption Failed',
    },
    ar: {
      title: 'اختر لغة الكتاب',
      description: 'حدد إصدار اللغة الذي ترغب في الوصول إليه. يمكنك اختيار لغة واحدة فقط لكل رصيد كتاب.',
      selectLanguage: 'اختر إصدار اللغة',
      english: 'الإنجليزية',
      arabic: 'العربية',
      pages: 'صفحة',
      redeem: 'استرداد الكتاب',
      redeeming: 'جارٍ الاسترداد...',
      cancel: 'إلغاء',
      creditFrom: 'رصيد من',
      membership: 'العضوية',
      validUntil: 'صالح حتى',
      unlimited: 'غير محدود',
      // Toasts
      redeemSuccess: 'تم استرداد الكتاب',
      redeemSuccessDesc: 'لديك الآن حق الوصول إلى هذا الكتاب',
      redeemError: 'فشل الاسترداد',
    },
  };

  const texts = t[language];

  const getLanguageLabel = (lang: string) => {
    if (lang === 'en') return texts.english;
    if (lang === 'ar') return texts.arabic;
    return lang.toUpperCase();
  };

  const handleRedeem = async () => {
    if (!selectedLanguage) return;

    try {
      await redeemMutation.mutateAsync({
        credit_id: credit.id,
        language: selectedLanguage,
      });

      toast({
        title: texts.redeemSuccess,
        description: texts.redeemSuccessDesc,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: texts.redeemError,
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return texts.unlimited;
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className={language === 'ar' ? 'text-right' : ''}>
            {texts.title}
          </DialogTitle>
          <DialogDescription className={language === 'ar' ? 'text-right' : ''}>
            {texts.description}
          </DialogDescription>
        </DialogHeader>

        {/* Credit Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <BookOpen className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className={`flex-1 ${language === 'ar' ? 'text-right' : ''}`}>
                <p className="font-semibold text-blue-900">{credit.book_product_group_name}</p>
                <div className={`flex items-center gap-2 text-sm text-blue-700 mt-1 ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                  <span>{texts.creditFrom}: {texts.membership}</span>
                  {credit.valid_until && (
                    <>
                      <span>•</span>
                      <span>{texts.validUntil}: {formatDate(credit.valid_until)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Selection */}
        <div className="space-y-3">
          <h4 className={`font-semibold flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <Languages className="h-4 w-4" />
            {texts.selectLanguage}
          </h4>

          {isLoadingOptions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid gap-3">
              {bookOptions?.map((option) => (
                <Card
                  key={option.language}
                  className={`cursor-pointer transition-all ${
                    selectedLanguage === option.language
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedLanguage(option.language)}
                >
                  <CardContent className="p-4">
                    <div className={`flex items-start gap-3 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          selectedLanguage === option.language
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedLanguage === option.language && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>

                      <div className={`flex-1 ${language === 'ar' ? 'text-right' : ''}`}>
                        <div className={`flex items-center gap-2 mb-1 ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                          <h5 className="font-semibold">{option.product_name}</h5>
                          <Badge variant="outline">
                            {getLanguageLabel(option.language)}
                          </Badge>
                        </div>
                        {option.description && (
                          <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                        )}
                        {option.pages && (
                          <p className="text-xs text-gray-500">
                            {option.pages} {texts.pages}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={`flex gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <Button
            onClick={handleRedeem}
            disabled={!selectedLanguage || redeemMutation.isPending}
            className="flex-1"
          >
            {redeemMutation.isPending ? (
              <>
                <Loader2 className={`h-4 w-4 animate-spin ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {texts.redeeming}
              </>
            ) : (
              <>
                <Check className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                {texts.redeem}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={redeemMutation.isPending}
          >
            {texts.cancel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
