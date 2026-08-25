import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const copy = {
  en: {
    eyebrow: "BDA PARTNER SUPPORT",
    title: "Support Center",
    description: "For partnership, programme, accreditation, or account enquiries, contact the BDA support team by email.",
    emailLabel: "Official support email",
    email: "support@bda-global.org",
    action: "Email BDA Support",
    assuranceTitle: "A single point of contact",
    assurance: "Please include your organisation name, registered partnership email, and a concise description of your request so the support team can assist you efficiently.",
  },
  ar: {
    eyebrow: "دعم شركاء BDA",
    title: "مركز الدعم",
    description: "للاستفسارات المتعلقة بالشراكة أو البرامج أو الاعتماد أو الحساب، تواصل مع فريق دعم BDA عبر البريد الإلكتروني.",
    emailLabel: "البريد الإلكتروني الرسمي للدعم",
    email: "support@bda-global.org",
    action: "مراسلة دعم BDA",
    assuranceTitle: "نقطة تواصل موحّدة",
    assurance: "يرجى تضمين اسم مؤسستك وبريد الشراكة المسجل ووصف مختصر لطلبك حتى يتمكن فريق الدعم من مساعدتك بكفاءة.",
  },
};

export default function SupportCenter() {
  const { language } = useLanguage();
  const text = copy[language];
  const isRTL = language === "ar";

  return (
    <div className="mx-auto max-w-4xl space-y-8" dir={isRTL ? "rtl" : "ltr"}>
      <section className={`rounded-2xl bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0] px-8 py-10 text-white shadow-sm ${isRTL ? "text-right" : "text-left"}`}>
        <p className="text-xs font-bold tracking-[0.18em] text-blue-100">{text.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold">{text.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">{text.description}</p>
      </section>

      <Card className="border-blue-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <CardContent className="p-8 sm:p-10">
          <div className={`flex flex-col items-center gap-6 sm:flex-row ${isRTL ? "sm:flex-row-reverse" : ""}`}>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#0f91e0] dark:bg-blue-950/50 dark:text-blue-300">
              <Mail className="h-8 w-8" />
            </div>
            <div className={`flex-1 ${isRTL ? "text-right" : "text-left"}`}>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{text.emailLabel}</p>
              <a
                href="mailto:support@bda-global.org"
                className="mt-1 inline-block text-xl font-bold text-[#0d1f4e] transition-colors hover:text-[#0f91e0] dark:text-blue-300 dark:hover:text-blue-200"
                dir="ltr"
              >
                {text.email}
              </a>
            </div>
            <Button
              className="w-full bg-[#0f91e0] hover:bg-[#0d7fc5] sm:w-auto"
              onClick={() => window.open("mailto:support@bda-global.org", "_blank")}
            >
              <Mail className={isRTL ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} />
              {text.action}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className={`rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-700 dark:bg-slate-800/60 ${isRTL ? "text-right" : "text-left"}`}>
        <div className={`flex gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0f91e0]" />
          <div>
            <h2 className="font-semibold text-[#0d1f4e] dark:text-blue-200">{text.assuranceTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{text.assurance}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
