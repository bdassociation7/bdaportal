import { useState } from "react";
import { BookOpen, CheckCircle2, FileText, Loader2, Mail, ReceiptText, Send, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { CertificationType } from "@/entities/ecp/ecp.types";

const copy = {
  en: {
    eyebrow: "BDA PARTNER WORKSPACE",
    title: "Orders & Invoices",
    description: "Request BDA exam vouchers or Learning System seats. BDA manages candidate allocation and examination follow-up directly after payment is confirmed.",
    voucherLabel: "EXAMINATION",
    voucherTitle: "BDA Exam Vouchers",
    voucherDescription: "Request BDA-CP or BDA-SCP examination vouchers for your candidates.",
    learningLabel: "LEARNING",
    learningTitle: "Learning System Access",
    learningDescription: "Request Learning System seats for your trainees. One learning pathway covers both BDA-CP and BDA-SCP.",
    requestVouchers: "Request Exam Vouchers",
    requestLearning: "Request Learning System Access",
    processTitle: "How your request is managed",
    requestStep: "Submit your request",
    requestStepDesc: "Select the product and quantity required for your organisation.",
    invoiceStep: "Receive your invoice",
    invoiceStepDesc: "BDA Support reviews the request and sends the payment link or invoice by email.",
    fulfilmentStep: "BDA manages fulfilment",
    fulfilmentStepDesc: "After payment confirmation, BDA allocates examination vouchers and follows up with candidates directly.",
    noteTitle: "Candidate administration is managed by BDA",
    noteDescription: "Voucher codes, candidate assignment, scheduling, and examination status are administered directly by the Association. Your role is limited to submitting the order and completing payment.",
    voucherDialogTitle: "Request Exam Vouchers",
    voucherDialogDesc: "Submit the required quantity and BDA Support will send your invoice by email.",
    learningDialogTitle: "Request Learning System Access",
    learningDialogDesc: "Request the number of Learning System seats required for your trainees.",
    certificationType: "Certification Type",
    cp: "BDA-CP — Certified Professional",
    scp: "BDA-SCP — Senior Certified Professional",
    quantity: "Quantity",
    submit: "Submit Request",
    cancel: "Cancel",
    submitted: "Request submitted",
    submittedDescription: (reference: string) => `Request ${reference} has been sent to BDA Support for invoicing.`,
    requestError: "Unable to submit request",
    invoiceContact: "For an existing invoice or order enquiry, contact",
  },
  ar: {
    eyebrow: "مساحة عمل شريك BDA",
    title: "الطلبات والفواتير",
    description: "اطلب قسائم اختبارات BDA أو مقاعد نظام التعلم. تدير BDA توزيع القسائم ومتابعة المرشحين مباشرةً بعد تأكيد السداد.",
    voucherLabel: "الاختبارات",
    voucherTitle: "قسائم اختبارات BDA",
    voucherDescription: "اطلب قسائم اختبارات BDA-CP أو BDA-SCP للمرشحين.",
    learningLabel: "التعلّم",
    learningTitle: "مقاعد نظام التعلم",
    learningDescription: "اطلب مقاعد نظام التعلم للمتدربين. يغطي مسار التعلم الواحد BDA-CP وBDA-SCP.",
    requestVouchers: "طلب قسائم الاختبارات",
    requestLearning: "طلب مقاعد نظام التعلم",
    processTitle: "كيف يُعالج طلبك",
    requestStep: "أرسل طلبك",
    requestStepDesc: "اختر المنتج والكمية المطلوبة لمؤسستك.",
    invoiceStep: "استلم فاتورتك",
    invoiceStepDesc: "يراجع دعم BDA الطلب ويرسل رابط الدفع أو الفاتورة عبر البريد الإلكتروني.",
    fulfilmentStep: "تدير BDA التنفيذ",
    fulfilmentStepDesc: "بعد تأكيد السداد، توزع BDA قسائم الاختبارات وتتابع المرشحين مباشرةً.",
    noteTitle: "إدارة المرشحين تتم بواسطة BDA",
    noteDescription: "تدير الجمعية رموز القسائم وتعيين المرشحين والجدولة وحالة الاختبار مباشرةً. يقتصر دور الشريك على تقديم الطلب وإتمام السداد.",
    voucherDialogTitle: "طلب قسائم الاختبارات",
    voucherDialogDesc: "أرسل الكمية المطلوبة وسيرسل دعم BDA فاتورتك عبر البريد الإلكتروني.",
    learningDialogTitle: "طلب مقاعد نظام التعلم",
    learningDialogDesc: "اطلب عدد مقاعد نظام التعلم المطلوبة للمتدربين.",
    certificationType: "نوع الشهادة",
    cp: "BDA-CP — محترف معتمد",
    scp: "BDA-SCP — محترف معتمد أول",
    quantity: "الكمية",
    submit: "إرسال الطلب",
    cancel: "إلغاء",
    submitted: "تم إرسال الطلب",
    submittedDescription: (reference: string) => `تم إرسال الطلب ${reference} إلى دعم BDA لإصدار الفاتورة.`,
    requestError: "تعذر إرسال الطلب",
    invoiceContact: "للاستفسار عن فاتورة أو طلب قائم، تواصل مع",
  },
};

export default function ECPVouchers() {
  const { language } = useLanguage();
  const text = copy[language];
  const isRTL = language === "ar";
  const { toast } = useToast();

  const [showVoucherRequest, setShowVoucherRequest] = useState(false);
  const [showLearningRequest, setShowLearningRequest] = useState(false);
  const [requestQuantity, setRequestQuantity] = useState(10);
  const [learningQuantity, setLearningQuantity] = useState(10);
  const [certificationType, setCertificationType] = useState<CertificationType>("CP");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitRequest = async (requestType: "exam_vouchers" | "learning_system_access", quantity: number, type?: CertificationType) => {
    const { data, error } = await supabase.functions.invoke("submit-ecp-order-request", {
      body: {
        request_type: requestType,
        quantity,
        certification_type: type,
      },
    });

    if (error || !data?.success) {
      throw new Error(data?.error || error?.message || text.requestError);
    }

    toast({
      title: text.submitted,
      description: text.submittedDescription(data.request.request_number),
    });
  };

  const handleVoucherRequest = async () => {
    setIsSubmitting(true);
    try {
      await submitRequest("exam_vouchers", requestQuantity, certificationType);
      setShowVoucherRequest(false);
    } catch (error) {
      toast({
        title: text.requestError,
        description: error instanceof Error ? error.message : text.requestError,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLearningRequest = async () => {
    setIsSubmitting(true);
    try {
      await submitRequest("learning_system_access", learningQuantity);
      setShowLearningRequest(false);
    } catch (error) {
      toast({
        title: text.requestError,
        description: error instanceof Error ? error.message : text.requestError,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { icon: Send, title: text.requestStep, description: text.requestStepDesc },
    { icon: ReceiptText, title: text.invoiceStep, description: text.invoiceStepDesc },
    { icon: CheckCircle2, title: text.fulfilmentStep, description: text.fulfilmentStepDesc },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8" dir={isRTL ? "rtl" : "ltr"}>
      <section className={`rounded-2xl bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0] px-7 py-9 text-white shadow-sm sm:px-10 ${isRTL ? "text-right" : "text-left"}`}>
        <p className="text-xs font-bold tracking-[0.18em] text-blue-100">{text.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold">{text.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50 sm:text-base">{text.description}</p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden border-blue-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <CardContent className="p-7">
            <div className={`flex gap-4 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0d1f4e] text-white">
                <Ticket className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-[0.15em] text-[#0f91e0]">{text.voucherLabel}</p>
                <h2 className="mt-2 text-xl font-bold text-[#0d1f4e] dark:text-blue-200">{text.voucherTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text.voucherDescription}</p>
                <Button className="mt-6 bg-[#0d1f4e] hover:bg-[#1c4a8b]" onClick={() => setShowVoucherRequest(true)}>
                  <Ticket className={isRTL ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                  {text.requestVouchers}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-blue-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <CardContent className="p-7">
            <div className={`flex gap-4 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0f91e0] text-white">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-[0.15em] text-[#0f91e0]">{text.learningLabel}</p>
                <h2 className="mt-2 text-xl font-bold text-[#0d1f4e] dark:text-blue-200">{text.learningTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text.learningDescription}</p>
                <Button className="mt-6 bg-[#0f91e0] hover:bg-[#1c4a8b]" onClick={() => setShowLearningRequest(true)}>
                  <BookOpen className={isRTL ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
                  {text.requestLearning}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
        <h2 className={`text-xl font-bold text-[#0d1f4e] dark:text-blue-200 ${isRTL ? "text-right" : "text-left"}`}>{text.processTitle}</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className={`relative ${isRTL ? "text-right" : "text-left"}`}>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#0f91e0] dark:bg-blue-950/50 dark:text-blue-300">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#0d1f4e] dark:text-blue-100">{`${index + 1}. ${step.title}`}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className={`rounded-2xl border border-blue-100 bg-[#f0f6ff] px-6 py-5 dark:border-sky-900/60 dark:bg-slate-900 ${isRTL ? "text-right" : "text-left"}`}>
        <div className={`flex gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#0f91e0]" />
          <div>
            <h2 className="font-semibold text-[#0d1f4e] dark:text-blue-200">{text.noteTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{text.noteDescription}</p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {text.invoiceContact}{" "}
              <a className="font-semibold text-[#0f91e0] hover:underline" href="mailto:support@bda-global.org" dir="ltr">support@bda-global.org</a>
            </p>
          </div>
        </div>
      </section>

      <Dialog open={showVoucherRequest} onOpenChange={setShowVoucherRequest}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"} className="sm:max-w-lg">
          <DialogHeader className={isRTL ? "text-right" : "text-left"}>
            <DialogTitle className="text-[#0d1f4e] dark:text-blue-200">{text.voucherDialogTitle}</DialogTitle>
            <DialogDescription>{text.voucherDialogDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>{text.certificationType} *</Label>
              <Select value={certificationType} onValueChange={(value) => setCertificationType(value as CertificationType)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CP">{text.cp}</SelectItem>
                  <SelectItem value="SCP">{text.scp}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="voucher-quantity">{text.quantity} *</Label>
              <Input id="voucher-quantity" type="number" min={1} max={5000} value={requestQuantity} onChange={(event) => setRequestQuantity(Math.max(1, Number(event.target.value) || 1))} className="h-11" />
            </div>
          </div>
          <DialogFooter className={isRTL ? "flex-row-reverse" : ""}>
            <Button variant="outline" onClick={() => setShowVoucherRequest(false)} disabled={isSubmitting}>{text.cancel}</Button>
            <Button className="bg-[#0d1f4e] hover:bg-[#1c4a8b]" onClick={handleVoucherRequest} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className={isRTL ? "ml-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4 animate-spin"} /> : <Send className={isRTL ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />}
              {text.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLearningRequest} onOpenChange={setShowLearningRequest}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"} className="sm:max-w-lg">
          <DialogHeader className={isRTL ? "text-right" : "text-left"}>
            <DialogTitle className="text-[#0d1f4e] dark:text-blue-200">{text.learningDialogTitle}</DialogTitle>
            <DialogDescription>{text.learningDialogDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="learning-quantity">{text.quantity} *</Label>
              <Input id="learning-quantity" type="number" min={1} max={5000} value={learningQuantity} onChange={(event) => setLearningQuantity(Math.max(1, Number(event.target.value) || 1))} className="h-11" />
            </div>
          </div>
          <DialogFooter className={isRTL ? "flex-row-reverse" : ""}>
            <Button variant="outline" onClick={() => setShowLearningRequest(false)} disabled={isSubmitting}>{text.cancel}</Button>
            <Button className="bg-[#0f91e0] hover:bg-[#1c4a8b]" onClick={handleLearningRequest} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className={isRTL ? "ml-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4 animate-spin"} /> : <Send className={isRTL ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />}
              {text.submit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
