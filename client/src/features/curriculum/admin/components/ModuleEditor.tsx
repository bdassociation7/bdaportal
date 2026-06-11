import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, X, BookOpen, Settings, GraduationCap, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { CurriculumService, curriculumKeys } from '@/entities/curriculum';
import { RichTextEditor } from './RichTextEditor';
import { useToast } from '@/components/ui/use-toast';
import type { CurriculumModule, RichContent, SectionType, ExamLanguage } from '@/entities/curriculum';

interface ModuleEditorProps {
  moduleId?: string;
  defaultLanguage?: ExamLanguage;
  onClose: () => void;
}

export function ModuleEditor({ moduleId, defaultLanguage, onClose }: ModuleEditorProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEditing = !!moduleId;

  // Module language (set once, cannot be changed after creation)
  const [examLanguage, setExamLanguage] = useState<ExamLanguage>(defaultLanguage || 'en');

  // Form state
  const [competencyName, setCompetencyName] = useState('');
  const [competencyNameAr, setCompetencyNameAr] = useState('');
  const [sectionType, setSectionType] = useState<SectionType>('knowledge_based');
  const [orderIndex, setOrderIndex] = useState<number>(1);
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [content, setContent] = useState<RichContent | null>(null);
  const [contentAr, setContentAr] = useState<RichContent | null>(null);
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [learningObjectives, setLearningObjectives] = useState<string[]>(['']);
  const [learningObjectivesAr, setLearningObjectivesAr] = useState<string[]>(['']);
  const [quizId, setQuizId] = useState<string>('');
  const [prerequisiteModuleId, setPrerequisiteModuleId] = useState<string>('');
  const [quizPassingScore, setQuizPassingScore] = useState(70);
  const [isPublished, setIsPublished] = useState(false);

  // Fetch existing module if editing
  const { data: module, isLoading: isLoadingModule } = useQuery({
    queryKey: curriculumKeys.moduleDetail(moduleId || ''),
    queryFn: async () => {
      if (!moduleId) return null;
      const result = await CurriculumService.getModuleById(moduleId);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!moduleId,
  });

  // Fetch all modules for prerequisite dropdown
  const { data: allModules } = useQuery({
    queryKey: curriculumKeys.modulesList({}),
    queryFn: async () => {
      const result = await CurriculumService.getModules({});
      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  // Fetch all quizzes for linking
  const { data: quizzes } = useQuery({
    queryKey: ['quizzes', 'all'],
    queryFn: async () => {
      const { QuizService } = await import('@/entities/quiz');
      const result = await QuizService.getAllQuizzes({ exclude_certification: true });
      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  // Populate form when module data loads
  useEffect(() => {
    if (module) {
      setCompetencyName(module.competency_name);
      setCompetencyNameAr(module.competency_name_ar || '');
      setSectionType(module.section_type as SectionType);
      setExamLanguage((module as any).exam_language || 'en');
      setOrderIndex(module.order_index);
      setEstimatedMinutes(module.estimated_minutes || 30);
      setContent(module.content as RichContent | null);
      setContentAr(module.content_ar as RichContent | null);
      setDescription(module.description || '');
      setDescriptionAr(module.description_ar || '');
      setLearningObjectives(module.learning_objectives?.length ? module.learning_objectives : ['']);
      setLearningObjectivesAr(module.learning_objectives_ar?.length ? module.learning_objectives_ar : ['']);
      setQuizId(module.quiz_id || '');
      setPrerequisiteModuleId(module.prerequisite_module_id || '');
      setQuizPassingScore(module.quiz_passing_score || 70);
      setIsPublished(module.is_published);
    }
  }, [module]);

  // Auto-suggest next available order_index for new modules
  useEffect(() => {
    if (!isEditing && allModules) {
      const sameLanguageModules = allModules.filter(m => (m as any).exam_language === examLanguage);
      const maxOrder = sameLanguageModules.reduce((max, m) => Math.max(max, m.order_index), 0);
      setOrderIndex(maxOrder + 1);
    }
  }, [isEditing, allModules, examLanguage]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const moduleData = {
        competency_name: competencyName,
        competency_name_ar: competencyNameAr || null,
        section_type: sectionType,
        certification_type: 'CP' as any, // unified curriculum - kept for DB compatibility
        exam_language: examLanguage,
        order_index: orderIndex,
        estimated_minutes: estimatedMinutes,
        content: content || {},
        content_ar: contentAr || null,
        description: description || null,
        description_ar: descriptionAr || null,
        learning_objectives: learningObjectives.filter((obj) => obj.trim() !== ''),
        learning_objectives_ar: learningObjectivesAr.filter((obj) => obj.trim() !== ''),
        quiz_id: quizId || null,
        prerequisite_module_id: prerequisiteModuleId || null,
        quiz_passing_score: quizPassingScore,
        is_published: isPublished,
      };

      if (isEditing) {
        return await CurriculumService.updateModule(moduleId, moduleData);
      } else {
        return await CurriculumService.createModule(moduleData);
      }
    },
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: curriculumKeys.all });
        toast({
          title: isEditing ? 'Module updated' : 'Module created',
          description: `${competencyName || competencyNameAr} has been ${isEditing ? 'updated' : 'created'} successfully.`,
        });
        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.error.message || 'Failed to save module. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save module. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Learning objectives handlers
  const handleAddObjective = () => setLearningObjectives([...learningObjectives, '']);
  const handleUpdateObjective = (index: number, value: string) => {
    const updated = [...learningObjectives];
    updated[index] = value;
    setLearningObjectives(updated);
  };
  const handleRemoveObjective = (index: number) => setLearningObjectives(learningObjectives.filter((_, i) => i !== index));

  const handleAddObjectiveAr = () => setLearningObjectivesAr([...learningObjectivesAr, '']);
  const handleUpdateObjectiveAr = (index: number, value: string) => {
    const updated = [...learningObjectivesAr];
    updated[index] = value;
    setLearningObjectivesAr(updated);
  };
  const handleRemoveObjectiveAr = (index: number) => setLearningObjectivesAr(learningObjectivesAr.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  // Separate modules by language for clean dropdowns
  const enModules = allModules?.filter(m => (m as any).exam_language === 'en' && m.id !== moduleId)
    .sort((a, b) => a.order_index - b.order_index) || [];
  const arModules = allModules?.filter(m => (m as any).exam_language === 'ar' && m.id !== moduleId)
    .sort((a, b) => a.order_index - b.order_index) || [];

  const isEN = examLanguage === 'en';
  const accentColor = isEN ? 'blue' : 'emerald';

  if (isLoadingModule) {
    return (
      <div className="p-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Loading module...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Module' : 'New Module'}
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
              isEN ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isEN ? '🇬🇧 English' : '🇸🇦 Arabic'}
            </span>
            {isPublished ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <Eye className="w-3 h-3" /> Published
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                <EyeOff className="w-3 h-3" /> Draft
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {isEditing ? 'Update module settings and content' : 'Add a new module to the curriculum'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Section 1: Module Settings ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="p-2 bg-white rounded-lg border border-gray-200">
              <Settings className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Module Settings</h2>
              <p className="text-xs text-gray-500">Language, section type, order and duration</p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Language — only for new modules */}
            {!isEditing && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Module Language *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['en', 'ar'] as ExamLanguage[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setExamLanguage(lang)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        examLanguage === lang
                          ? lang === 'en'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <span className="text-2xl">{lang === 'en' ? '🇬🇧' : '🇸🇦'}</span>
                      <div>
                        <p className={`font-semibold text-sm ${
                          examLanguage === lang
                            ? lang === 'en' ? 'text-blue-700' : 'text-emerald-700'
                            : 'text-gray-700'
                        }`}>
                          {lang === 'en' ? 'English' : 'Arabic'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {lang === 'en' ? 'EN curriculum module' : 'وحدة المنهج العربي'}
                        </p>
                      </div>
                      {examLanguage === lang && (
                        <div className={`ml-auto w-5 h-5 rounded-full flex items-center justify-center ${
                          lang === 'en' ? 'bg-blue-500' : 'bg-emerald-500'
                        }`}>
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Section Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Section Type *
              </label>
              <select
                value={sectionType}
                onChange={(e) => setSectionType(e.target.value as SectionType)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                required
              >
                <option value="intro">Intro</option>
                <option value="behavioural">Behavioural Domain</option>
                <option value="knowledge_based">Knowledge-Based Domain</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            {/* Order Index */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Order Index *
              </label>
              <input
                type="number"
                min="0"
                value={orderIndex}
                onChange={(e) => setOrderIndex(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              />
              {!isEditing && allModules && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Next suggested: {(allModules.filter(m => (m as any).exam_language === examLanguage).reduce((max, m) => Math.max(max, m.order_index), 0) + 1)}
                </p>
              )}
            </div>

            {/* Estimated Minutes */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Estimated Reading Time (minutes)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(parseInt(e.target.value))}
                  className="w-32 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <span className="text-sm text-gray-400">minutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Module Content ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className={`p-2 bg-white rounded-lg border border-gray-200`}>
              <BookOpen className={`w-4 h-4 ${isEN ? 'text-blue-600' : 'text-emerald-600'}`} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Module Content</h2>
              <p className="text-xs text-gray-500">
                {isEN ? 'English content — name, description, objectives, and body' : 'المحتوى العربي — الاسم والوصف والأهداف والمحتوى'}
              </p>
            </div>
          </div>

          <div className="p-6">
            {/* ── ENGLISH ── */}
            {isEN && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Competency Name (English) *
                  </label>
                  <input
                    type="text"
                    value={competencyName}
                    onChange={(e) => setCompetencyName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="e.g., Strategic Leadership"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Description (English)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    placeholder="Brief description of this module..."
                    rows={3}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Learning Objectives (English)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddObjective}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      + Add Objective
                    </button>
                  </div>
                  <div className="space-y-2">
                    {learningObjectives.map((objective, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5 text-right shrink-0">{index + 1}.</span>
                        <input
                          type="text"
                          value={objective}
                          onChange={(e) => handleUpdateObjective(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder={`Objective ${index + 1}`}
                        />
                        {learningObjectives.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveObjective(index)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Module Content (English)
                  </label>
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Write the module content here..."
                  />
                </div>
              </div>
            )}

            {/* ── ARABIC ── */}
            {!isEN && (
              <div className="space-y-5" dir="rtl">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    اسم الكفاءة *
                  </label>
                  <input
                    type="text"
                    value={competencyNameAr}
                    onChange={(e) => {
                      setCompetencyNameAr(e.target.value);
                      setCompetencyName(e.target.value); // mirror for DB NOT NULL
                    }}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                    placeholder="مثال: القيادة الاستراتيجية"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    الوصف
                  </label>
                  <textarea
                    value={descriptionAr}
                    onChange={(e) => setDescriptionAr(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-none"
                    placeholder="وصف مختصر لهذه الوحدة..."
                    rows={3}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      أهداف التعلم
                    </label>
                    <button
                      type="button"
                      onClick={handleAddObjectiveAr}
                      className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                    >
                      + إضافة هدف
                    </button>
                  </div>
                  <div className="space-y-2">
                    {learningObjectivesAr.map((objective, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5 text-right shrink-0">{index + 1}.</span>
                        <input
                          type="text"
                          value={objective}
                          onChange={(e) => handleUpdateObjectiveAr(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                          placeholder={`هدف ${index + 1}`}
                        />
                        {learningObjectivesAr.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveObjectiveAr(index)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    محتوى الوحدة
                  </label>
                  <RichTextEditor
                    content={contentAr}
                    onChange={setContentAr}
                    placeholder="اكتب محتوى الوحدة هنا..."
                    dir="rtl"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: Quiz & Prerequisites ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="p-2 bg-white rounded-lg border border-gray-200">
              <GraduationCap className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Quiz & Prerequisites</h2>
              <p className="text-xs text-gray-500">Module completion quiz and unlock conditions</p>
            </div>
          </div>

          <div className="p-6 space-y-5">

            {/* Linked Quiz */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Linked Module Quiz
              </label>
              <select
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-sm"
              >
                <option value="">— No quiz linked —</option>
                {quizzes && quizzes.length > 0 && (
                  <optgroup label="🇬🇧 English Quizzes">
                    {quizzes
                      .filter(q => (q as any).exam_language !== 'ar')
                      .map((quiz) => (
                        <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
                      ))}
                  </optgroup>
                )}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                This quiz must be passed before the module is marked as complete.
              </p>
            </div>

            {/* Quiz Passing Score — only show if quiz is linked */}
            {quizId && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Quiz Passing Score (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={quizPassingScore}
                    onChange={(e) => setQuizPassingScore(parseInt(e.target.value))}
                    className="w-28 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                  <span className="text-sm text-gray-400">% required to pass</span>
                </div>
              </div>
            )}

            {/* Prerequisite Module */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Prerequisite Module
              </label>
              <select
                value={prerequisiteModuleId}
                onChange={(e) => setPrerequisiteModuleId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-sm"
              >
                <option value="">— None (first module, always unlocked) —</option>

                {/* English modules group */}
                {enModules.length > 0 && (
                  <optgroup label="🇬🇧 English Modules">
                    {enModules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.order_index}. {m.competency_name}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* Arabic modules group */}
                {arModules.length > 0 && (
                  <optgroup label="🇸🇦 Arabic Modules">
                    {arModules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.order_index}. {m.competency_name_ar || m.competency_name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <p className="text-xs text-gray-400 mt-1.5">
                The user must complete the prerequisite module before this one is unlocked.
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 4: Publishing ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6">
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className={`relative w-11 h-6 rounded-full transition-colors ${isPublished ? 'bg-green-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPublished ? 'translate-x-5' : 'translate-x-0'}`} />
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="sr-only"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {isPublished ? 'Published' : 'Draft'}
                </p>
                <p className="text-xs text-gray-500">
                  {isPublished
                    ? 'This module is visible to enrolled users.'
                    : 'Only admins can see this module. Toggle to publish.'}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isEN
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Module' : 'Create Module'}
          </button>
        </div>

        {saveMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            Failed to save module. Please check your inputs and try again.
          </div>
        )}

      </form>
    </div>
  );
}
