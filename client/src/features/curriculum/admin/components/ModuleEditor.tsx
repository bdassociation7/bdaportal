import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, X, Trash2 } from 'lucide-react';
import { CurriculumService, curriculumKeys } from '@/entities/curriculum';
import { RichTextEditor } from './RichTextEditor';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CurriculumModule, RichContent, CertificationType, SectionType, ExamLanguage } from '@/entities/curriculum';

interface ModuleEditorProps {
  moduleId?: string;
  defaultLanguage?: ExamLanguage;
  onClose: () => void;
}

/**
 * Module Editor Component
 * Form for creating/editing curriculum modules
 */
export function ModuleEditor({ moduleId, defaultLanguage, onClose }: ModuleEditorProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEditing = !!moduleId;

  // Module language (set once, cannot be changed after creation)
  const [examLanguage, setExamLanguage] = useState<ExamLanguage>(defaultLanguage || 'en');

  // Language tab for content editing
  const [activeLanguageTab, setActiveLanguageTab] = useState<'en' | 'ar'>('en');

  // Form state
  const [competencyName, setCompetencyName] = useState('');
  const [competencyNameAr, setCompetencyNameAr] = useState('');
  const [sectionType, setSectionType] = useState<SectionType>('knowledge_based');
  const [certificationType, setCertificationType] = useState<CertificationType>('CP');
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
      // Import quiz service dynamically to avoid circular dependencies
      const { QuizService } = await import('@/entities/quiz');
      const result = await QuizService.getAllQuizzes();
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
      setCertificationType(module.certification_type);
      setExamLanguage((module as any).exam_language || 'en');
      setOrderIndex(module.order_index);
      setEstimatedMinutes(module.estimated_minutes || 30);
      setContent(module.content as RichContent | null);
      setContentAr(module.content_ar as RichContent | null);
      setDescription(module.description || '');
      setDescriptionAr(module.description_ar || '');
      setLearningObjectives(module.learning_objectives || ['']);
      setLearningObjectivesAr(module.learning_objectives_ar || ['']);
      setQuizId(module.quiz_id || '');
      setPrerequisiteModuleId(module.prerequisite_module_id || '');
      setQuizPassingScore(module.quiz_passing_score);
      setIsPublished(module.is_published);
    }
  }, [module]);

  // Auto-suggest next available order_index for new modules
  useEffect(() => {
    if (!isEditing && allModules) {
      // Find highest order_index for current certification type
      const maxOrder = allModules
        .filter(m => m.certification_type === certificationType)
        .reduce((max, m) => Math.max(max, m.order_index), 0);

      setOrderIndex(maxOrder + 1);
    }
  }, [isEditing, allModules, certificationType]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const moduleData = {
        competency_name: competencyName,
        competency_name_ar: competencyNameAr || null,
        section_type: sectionType,
        certification_type: certificationType,
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
          description: `${competencyName} has been ${isEditing ? 'updated' : 'created'} successfully.`,
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

  // English learning objectives handlers
  const handleAddObjective = () => {
    setLearningObjectives([...learningObjectives, '']);
  };

  const handleUpdateObjective = (index: number, value: string) => {
    const updated = [...learningObjectives];
    updated[index] = value;
    setLearningObjectives(updated);
  };

  const handleRemoveObjective = (index: number) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
  };

  // Arabic learning objectives handlers
  const handleAddObjectiveAr = () => {
    setLearningObjectivesAr([...learningObjectivesAr, '']);
  };

  const handleUpdateObjectiveAr = (index: number, value: string) => {
    const updated = [...learningObjectivesAr];
    updated[index] = value;
    setLearningObjectivesAr(updated);
  };

  const handleRemoveObjectiveAr = (index: number) => {
    setLearningObjectivesAr(learningObjectivesAr.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  if (isLoadingModule) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading module...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditing ? 'Edit Module' : 'Create New Module'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditing ? 'Update module content and settings' : 'Add a new curriculum module'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Settings (Non-language specific) */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Settings</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Section Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section Type *
              </label>
              <select
                value={sectionType}
                onChange={(e) => setSectionType(e.target.value as SectionType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="knowledge_based">Knowledge-Based</option>
                <option value="behavioural">Behavioural</option>
              </select>
            </div>

            {/* Certification Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certification Type *
              </label>
              <select
                value={certificationType}
                onChange={(e) => setCertificationType(e.target.value as CertificationType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="CP">CP - Certified Professional</option>
                <option value="SCP">SCP - Senior Certified Professional</option>
              </select>
            </div>

            {/* Order Index */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Index *
              </label>
              <input
                type="number"
                min="1"
                value={orderIndex}
                onChange={(e) => setOrderIndex(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              {!isEditing && allModules && (
                <p className="text-xs text-gray-500 mt-1">
                  Next available: {allModules.filter(m => m.certification_type === certificationType).reduce((max, m) => Math.max(max, m.order_index), 0) + 1}
                </p>
              )}
            </div>

            {/* Estimated Minutes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Reading Time (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Language-Specific Content with EN/AR Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Module Content</h2>

          <Tabs value={activeLanguageTab} onValueChange={(v) => setActiveLanguageTab(v as 'en' | 'ar')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger
                value="en"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                English Version
              </TabsTrigger>
              <TabsTrigger
                value="ar"
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
              >
                Arabic Version
              </TabsTrigger>
            </TabsList>

            {/* English Content Tab */}
            <TabsContent value="en" className="space-y-6">
              {/* Competency Name (English) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Competency Name (English) *
                </label>
                <input
                  type="text"
                  value={competencyName}
                  onChange={(e) => setCompetencyName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Business Analysis Planning and Monitoring"
                  required
                />
              </div>

              {/* Description (English) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (English)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this module..."
                  rows={3}
                />
              </div>

              {/* Learning Objectives (English) */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Learning Objectives (English)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddObjective}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Add Objective
                  </button>
                </div>
                <div className="space-y-3">
                  {learningObjectives.map((objective, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={objective}
                        onChange={(e) => handleUpdateObjective(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Learning objective ${index + 1}`}
                      />
                      {learningObjectives.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveObjective(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Remove"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Editor (English) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Module Content (English)
                </label>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Write the module content here. Use the toolbar to format text, add headings, lists, images, etc."
                />
              </div>
            </TabsContent>

            {/* Arabic Content Tab */}
            <TabsContent value="ar" className="space-y-6">
              {/* Competency Name (Arabic) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Competency Name (Arabic)
                </label>
                <input
                  type="text"
                  value={competencyNameAr}
                  onChange={(e) => setCompetencyNameAr(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="اسم الكفاءة بالعربية"
                  dir="rtl"
                />
              </div>

              {/* Description (Arabic) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Arabic)
                </label>
                <textarea
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="وصف مختصر لهذه الوحدة..."
                  rows={3}
                  dir="rtl"
                />
              </div>

              {/* Learning Objectives (Arabic) */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Learning Objectives (Arabic)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddObjectiveAr}
                    className="px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                  >
                    Add Objective
                  </button>
                </div>
                <div className="space-y-3">
                  {learningObjectivesAr.map((objective, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={objective}
                        onChange={(e) => handleUpdateObjectiveAr(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder={`هدف التعلم ${index + 1}`}
                        dir="rtl"
                      />
                      {learningObjectivesAr.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveObjectiveAr(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Remove"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Editor (Arabic) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Module Content (Arabic)
                </label>
                <RichTextEditor
                  content={contentAr}
                  onChange={setContentAr}
                  placeholder="اكتب محتوى الوحدة هنا..."
                  dir="rtl"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Quiz & Prerequisites */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quiz & Prerequisites</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quiz Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linked Quiz
              </label>
              <select
                value={quizId}
                onChange={(e) => setQuizId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">No quiz linked</option>
                {quizzes?.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                    {(quiz as any).title_ar && ` | ${(quiz as any).title_ar}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Quiz Passing Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quiz Passing Score (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={quizPassingScore}
                onChange={(e) => setQuizPassingScore(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Prerequisite Module */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prerequisite Module
              </label>
              <select
                value={prerequisiteModuleId}
                onChange={(e) => setPrerequisiteModuleId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">None (First module)</option>
                {allModules
                  ?.filter((m) => m.id !== moduleId)
                  ?.sort((a, b) => a.order_index - b.order_index)
                  ?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.order_index}. {m.competency_name}
                      {m.competency_name_ar && ` | ${m.competency_name_ar}`}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Publishing */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Publishing</h2>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPublished"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
              Publish this module (make it visible to users)
            </label>
          </div>

          {!isPublished && (
            <p className="mt-2 text-sm text-gray-600">
              Draft modules are only visible to administrators and will not appear in the user curriculum.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-6">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Module' : 'Create Module'}
          </button>
        </div>

        {saveMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              Failed to save module. Please try again.
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
