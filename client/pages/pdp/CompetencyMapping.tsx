import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Brain,
  Users,
  Target,
  Lightbulb,
  TrendingUp,
  MessageSquare,
  Shield,
  BarChart3,
  Workflow,
  Database,
  Layers,
  Settings,
  FileSearch,
} from "lucide-react";
import { useBockCompetencies } from "@/entities/pdp/pdp.hooks";
import { useLanguage } from "@/contexts/LanguageContext";

// =============================================================================
// Translations
// =============================================================================
const translations = {
  en: {
    pageTitle: "BDA Body of Competency & Knowledge (BoCK)",
    pageDescription: "Reference guide for mapping your programs to BDA competencies",
    behavioralCompetencies: "Behavioural Competencies",
    knowledgeCompetencies: "Knowledge-Based Competencies",
    behavioralFocus: "Focus on professional skills, mindset, and interpersonal capabilities",
    knowledgeFocus: "Focus on technical knowledge, methodologies, and domain expertise",
    mappingGuidelinesTitle: "Program Mapping Guidelines",
    mappingGuidelinesDesc: "How to align your programs with BoCK competencies",
    primary: "Primary",
    secondary: "Secondary",
    supporting: "Supporting",
    coreFocus: "Core Focus",
    coreFocusDesc: "The main competency area your program addresses. Most programs have 1-2 primary competencies.",
    supportingFocus: "Supporting Focus",
    supportingFocusDesc: "Additional competencies that your program develops. Programs typically have 2-3 secondary competencies.",
    relatedAreas: "Related Areas",
    relatedAreasDesc: "Competencies that are touched upon but not the main focus. Optional to specify.",
    bestPractices: "Best Practices for Mapping",
    practice1: "Review your program's learning objectives and match them to specific competencies",
    practice2: "Consider both behavioural and knowledge competencies - most programs span both domains",
    practice3: "Be realistic - don't claim competencies that aren't directly addressed in your content",
    practice4: "Document how each claimed competency is developed through specific program activities",
  },
  ar: {
    pageTitle: "إطار كفاءات ومعارف BDA (BoCK)",
    pageDescription: "دليل مرجعي لربط برامجك بكفاءات BDA",
    behavioralCompetencies: "الكفاءات السلوكية",
    knowledgeCompetencies: "الكفاءات المعرفية",
    behavioralFocus: "التركيز على المهارات المهنية والعقلية والقدرات الشخصية",
    knowledgeFocus: "التركيز على المعرفة التقنية والمنهجيات والخبرة في المجال",
    mappingGuidelinesTitle: "إرشادات ربط البرامج",
    mappingGuidelinesDesc: "كيفية مواءمة برامجك مع كفاءات BoCK",
    primary: "أساسي",
    secondary: "ثانوي",
    supporting: "داعم",
    coreFocus: "التركيز الأساسي",
    coreFocusDesc: "مجال الكفاءة الرئيسي الذي يتناوله برنامجك. معظم البرامج لديها 1-2 كفاءات أساسية.",
    supportingFocus: "التركيز الداعم",
    supportingFocusDesc: "كفاءات إضافية يطورها برنامجك. عادة ما تحتوي البرامج على 2-3 كفاءات ثانوية.",
    relatedAreas: "المجالات ذات الصلة",
    relatedAreasDesc: "الكفاءات التي يتم التطرق إليها ولكنها ليست المحور الرئيسي. اختيارية للتحديد.",
    bestPractices: "أفضل الممارسات للربط",
    practice1: "راجع أهداف التعلم لبرنامجك وطابقها مع كفاءات محددة",
    practice2: "ضع في اعتبارك كلاً من الكفاءات السلوكية والمعرفية - معظم البرامج تغطي كلا المجالين",
    practice3: "كن واقعياً - لا تدّعي كفاءات لا يتناولها محتواك مباشرة",
    practice4: "وثّق كيف يتم تطوير كل كفاءة مُدّعاة من خلال أنشطة برنامج محددة",
  },
};

const competencyIcons: Record<string, React.ElementType> = {
  BC01: Target, // Strategic Leadership
  BC02: MessageSquare, // Effective Communication
  BC03: Users, // Team Collaboration
  BC04: Brain, // Analytical Thinking
  BC05: Shield, // Ethical Conduct
  BC06: TrendingUp, // Continuous Improvement
  BC07: Lightbulb, // Innovation Mindset
  KC01: TrendingUp, // Growth & Expansion
  KC02: BarChart3, // Performance Measurement
  KC03: Workflow, // Process Optimization
  KC04: Database, // Data & Analytics
  KC05: Layers, // Enterprise Architecture
  KC06: Settings, // Technology Integration
  KC07: FileSearch, // Compliance & Governance
};

export default function CompetencyMapping() {
  const { data: competencies, isLoading } = useBockCompetencies();
  const { language } = useLanguage();
  const texts = translations[language];
  const isRTL = language === "ar";

  const behavioralCompetencies = competencies?.filter(c => c.domain === 'Behavioural') || [];
  const knowledgeCompetencies = competencies?.filter(c => c.domain === 'Knowledge') || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className={isRTL ? "text-right" : ""}>
        <h1 className="text-2xl font-bold text-gray-900">{texts.pageTitle}</h1>
        <p className="text-gray-600 mt-1">
          {texts.pageDescription}
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="p-3 bg-blue-600 rounded-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <h3 className="text-2xl font-bold text-blue-900">{behavioralCompetencies.length}</h3>
                <p className="text-blue-700">{texts.behavioralCompetencies}</p>
              </div>
            </div>
            <p className={`text-sm text-blue-600 mt-4 ${isRTL ? "text-right" : ""}`}>
              {texts.behavioralFocus}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="p-3 bg-green-600 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <h3 className="text-2xl font-bold text-green-900">{knowledgeCompetencies.length}</h3>
                <p className="text-green-700">{texts.knowledgeCompetencies}</p>
              </div>
            </div>
            <p className={`text-sm text-green-600 mt-4 ${isRTL ? "text-right" : ""}`}>
              {texts.knowledgeFocus}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Competencies Tabs */}
      <Tabs defaultValue="behavioural" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="behavioural" className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Brain className="h-4 w-4" />
            {texts.behavioralCompetencies}
          </TabsTrigger>
          <TabsTrigger value="knowledge" className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <BookOpen className="h-4 w-4" />
            {texts.knowledgeCompetencies}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="behavioural" className="mt-6">
          <div className="grid gap-4">
            {behavioralCompetencies.map(comp => {
              const Icon = competencyIcons[comp.code] || Target;
              return (
                <Card key={comp.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className={`flex-1 ${isRTL ? "text-right" : ""}`}>
                        <div className={`flex items-center gap-3 mb-2 ${isRTL ? "flex-row-reverse justify-end" : ""}`}>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {comp.code}
                          </Badge>
                          <h3 className="font-semibold text-gray-900">
                            {isRTL && comp.name_ar ? comp.name_ar : comp.name}
                          </h3>
                        </div>
                        <p className="text-gray-600">
                          {isRTL && comp.description_ar ? comp.description_ar : comp.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <div className="grid gap-4">
            {knowledgeCompetencies.map(comp => {
              const Icon = competencyIcons[comp.code] || BookOpen;
              return (
                <Card key={comp.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <div className="p-3 bg-green-100 rounded-lg flex-shrink-0">
                        <Icon className="h-6 w-6 text-green-600" />
                      </div>
                      <div className={`flex-1 ${isRTL ? "text-right" : ""}`}>
                        <div className={`flex items-center gap-3 mb-2 ${isRTL ? "flex-row-reverse justify-end" : ""}`}>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {comp.code}
                          </Badge>
                          <h3 className="font-semibold text-gray-900">
                            {isRTL && comp.name_ar ? comp.name_ar : comp.name}
                          </h3>
                        </div>
                        <p className="text-gray-600">
                          {isRTL && comp.description_ar ? comp.description_ar : comp.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Mapping Guide */}
      <Card className="mt-6">
        <CardHeader className={isRTL ? "text-right" : ""}>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
            <Target className="h-5 w-5" />
            {texts.mappingGuidelinesTitle}
          </CardTitle>
          <CardDescription>
            {texts.mappingGuidelinesDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className={`p-4 bg-blue-50 rounded-lg border border-blue-200 ${isRTL ? "text-right" : ""}`}>
              <Badge className="bg-blue-600 mb-2">{texts.primary}</Badge>
              <h4 className="font-medium text-blue-900">{texts.coreFocus}</h4>
              <p className="text-sm text-blue-700 mt-1">
                {texts.coreFocusDesc}
              </p>
            </div>
            <div className={`p-4 bg-amber-50 rounded-lg border border-amber-200 ${isRTL ? "text-right" : ""}`}>
              <Badge className="bg-amber-600 mb-2">{texts.secondary}</Badge>
              <h4 className="font-medium text-amber-900">{texts.supportingFocus}</h4>
              <p className="text-sm text-amber-700 mt-1">
                {texts.supportingFocusDesc}
              </p>
            </div>
            <div className={`p-4 bg-gray-50 rounded-lg border border-gray-200 ${isRTL ? "text-right" : ""}`}>
              <Badge variant="outline" className="mb-2">{texts.supporting}</Badge>
              <h4 className="font-medium text-gray-900">{texts.relatedAreas}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {texts.relatedAreasDesc}
              </p>
            </div>
          </div>

          <div className={`p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border ${isRTL ? "text-right" : ""}`}>
            <h4 className="font-medium text-gray-900 mb-2">{texts.bestPractices}</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className={`flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <span className="text-purple-600 font-bold">1.</span>
                {texts.practice1}
              </li>
              <li className={`flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <span className="text-purple-600 font-bold">2.</span>
                {texts.practice2}
              </li>
              <li className={`flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <span className="text-purple-600 font-bold">3.</span>
                {texts.practice3}
              </li>
              <li className={`flex items-start gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <span className="text-purple-600 font-bold">4.</span>
                {texts.practice4}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
