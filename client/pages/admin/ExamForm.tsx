import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, GraduationCap, Crown, Globe, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCreateExam,
  useUpdateExam,
  useExamAdmin,
} from '@/entities/mock-exam';
import type {
  CreateExamDTO,
  ExamCategory,
  ExamDifficulty,
  MockExamLanguage,
} from '@/entities/mock-exam/mock-exam.types';
import { useToast } from '@/components/ui/use-toast';

/**
 * ExamForm Page
 * Create or edit an exam
 */

export default function ExamForm() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditMode = !!examId;

  // Data fetching for edit mode
  const { data: exam, isLoading: isLoadingExam } = useExamAdmin(
    examId || '',
    isEditMode
  );

  // Mutations
  const createMutation = useCreateExam();
  const updateMutation = useUpdateExam();

  // Form state
  const [formData, setFormData] = useState<CreateExamDTO>({
    title: '',
    title_ar: '',
    description: '',
    description_ar: '',
    category: 'general',
    difficulty: 'medium',
    duration_minutes: 60,
    total_questions: 0,
    passing_score: 70,
    is_active: false,
    is_premium: false,
    is_sample_exam: false,
    language: 'en',
    woocommerce_product_id: undefined,
  });

  // Populate form when editing
  useEffect(() => {
    if (exam && isEditMode) {
      setFormData({
        title: exam.title,
        title_ar: exam.title_ar || '',
        description: exam.description,
        description_ar: exam.description_ar || '',
        category: exam.category,
        difficulty: exam.difficulty,
        duration_minutes: exam.duration_minutes,
        total_questions: exam.total_questions,
        passing_score: exam.passing_score,
        is_active: exam.is_active,
        is_premium: exam.is_premium,
        is_sample_exam: exam.is_sample_exam || false,
        language: exam.language,
        woocommerce_product_id: exam.woocommerce_product_id || undefined,
      });
    }
  }, [exam, isEditMode]);

  // Handlers
  const handleChange = (field: keyof CreateExamDTO, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - check based on selected language
    const titleField = formData.language === 'ar' ? formData.title_ar : formData.title;
    const descriptionField = formData.language === 'ar' ? formData.description_ar : formData.description;

    if (!titleField?.trim()) {
      toast({
        title: 'Validation Error',
        description: formData.language === 'ar' ? 'عنوان الامتحان مطلوب' : 'Exam title is required',
        variant: 'destructive',
      });
      return;
    }

    if (!descriptionField?.trim()) {
      toast({
        title: 'Validation Error',
        description: formData.language === 'ar' ? 'وصف الامتحان مطلوب' : 'Exam description is required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.duration_minutes < 1) {
      toast({
        title: 'Validation Error',
        description: 'Duration must be at least 1 minute',
        variant: 'destructive',
      });
      return;
    }

    if (formData.passing_score < 0 || formData.passing_score > 100) {
      toast({
        title: 'Validation Error',
        description: 'Passing score must be between 0 and 100',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isEditMode && examId) {
        // Update exam
        const { data, error } = await updateMutation.mutateAsync({
          id: examId,
          dto: formData,
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Exam updated successfully',
        });

        // Navigate to questions page
        navigate(`/admin/exams/${examId}/questions`);
      } else {
        // Create exam
        const { data, error } = await createMutation.mutateAsync(formData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Exam created successfully',
        });

        // Navigate to questions page
        if (data) {
          navigate(`/admin/exams/${data.id}/questions`);
        }
      }
    } catch (error) {
      console.error('Error saving exam:', error);
      toast({
        title: 'Error',
        description: 'Failed to save exam. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    navigate('/admin/exams');
  };

  if (isEditMode && isLoadingExam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="h-8 w-8" />
              {isEditMode ? 'Edit Exam' : 'Create New Exam'}
            </h1>
            <p className="mt-2 opacity-90">
              {isEditMode
                ? 'Update exam details and settings'
                : 'Fill in the exam details below'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Exam Language Selector - Prominent at top */}
            <div className={`p-4 rounded-lg border-2 ${
              formData.language === 'ar'
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-blue-50 border-blue-300'
            }`}>
              <Label className="flex items-center gap-2 text-base font-semibold mb-3">
                <Globe className="h-5 w-5" />
                Exam Language <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('language', 'en')}
                  disabled={isEditMode}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    formData.language === 'en'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-400'
                  } ${isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className="text-lg">🇬🇧</span>
                  English Exam
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('language', 'ar')}
                  disabled={isEditMode}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    formData.language === 'ar'
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-emerald-400'
                  } ${isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className="text-lg">🇸🇦</span>
                  امتحان عربي
                </button>
              </div>
              {isEditMode && (
                <p className="text-sm text-gray-600 mt-2">
                  Language cannot be changed after exam creation.
                </p>
              )}
              <p className={`text-sm mt-2 ${formData.language === 'ar' ? 'text-emerald-700' : 'text-blue-700'}`}>
                {formData.language === 'ar'
                  ? 'جميع الأسئلة والإجابات ستكون بالعربية فقط'
                  : 'All questions and answers will be in English only'
                }
              </p>
            </div>

            {/* Title - Based on selected language */}
            {formData.language === 'en' ? (
              <div className="space-y-2 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <Label htmlFor="title" className="text-blue-800 font-semibold">
                  Exam Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Enter exam title"
                  required
                  className="bg-white"
                />
              </div>
            ) : (
              <div className="space-y-2 p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <Label htmlFor="title_ar" className="text-emerald-800 font-semibold">
                  عنوان الامتحان <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title_ar"
                  value={formData.title_ar}
                  onChange={(e) => handleChange('title_ar', e.target.value)}
                  placeholder="أدخل عنوان الامتحان"
                  dir="rtl"
                  required
                  className="bg-white"
                />
              </div>
            )}

            {/* Description - Based on selected language */}
            {formData.language === 'en' ? (
              <div className="space-y-2 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                <Label htmlFor="description" className="text-blue-800 font-semibold">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Enter exam description"
                  rows={4}
                  required
                  className="bg-white"
                />
              </div>
            ) : (
              <div className="space-y-2 p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <Label htmlFor="description_ar" className="text-emerald-800 font-semibold">
                  وصف الامتحان <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description_ar"
                  value={formData.description_ar}
                  onChange={(e) => handleChange('description_ar', e.target.value)}
                  placeholder="أدخل وصف الامتحان"
                  rows={4}
                  dir="rtl"
                  required
                  className="bg-white"
                />
              </div>
            )}

            {/* Category and Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange('category', value as ExamCategory)}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cp">CP Exam</SelectItem>
                    <SelectItem value="scp">SCP Exam</SelectItem>
                    <SelectItem value="general">General Knowledge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">
                  Difficulty <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => handleChange('difficulty', value as ExamDifficulty)}
                >
                  <SelectTrigger id="difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* WooCommerce Product ID - for premium exams */}
            {formData.is_premium && (
              <div className="space-y-2">
                <Label htmlFor="woocommerce_product_id">
                  WooCommerce Product ID
                </Label>
                <Input
                  id="woocommerce_product_id"
                  type="number"
                  min="0"
                  value={formData.woocommerce_product_id || ''}
                  onChange={(e) => handleChange('woocommerce_product_id', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Optional - for premium exams"
                />
                <p className="text-xs text-gray-500">
                  Link to WooCommerce product for purchase verification
                </p>
              </div>
            )}

            {/* Duration and Passing Score */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">
                  Duration (minutes) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.duration_minutes}
                  onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passing_score">
                  Passing Score (%) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="passing_score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.passing_score}
                  onChange={(e) => handleChange('passing_score', parseInt(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            {/* Sample Exam (Free Sample - 1 per language) */}
            <div className={`flex items-center justify-between p-4 rounded-lg border ${
              formData.is_sample_exam
                ? 'bg-green-50 border-green-300'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div>
                <Label htmlFor="is_sample_exam" className="text-base font-semibold flex items-center gap-2">
                  <Gift className={`h-4 w-4 ${formData.is_sample_exam ? 'text-green-600' : 'text-gray-500'}`} />
                  Free Sample Exam
                </Label>
                <p className={`text-sm mt-1 ${formData.is_sample_exam ? 'text-green-700' : 'text-gray-600'}`}>
                  {formData.is_sample_exam
                    ? 'This is a FREE sample exam. One sample per language is recommended.'
                    : 'Mark as sample if this is a free trial exam for users to try before purchasing'}
                </p>
              </div>
              <Switch
                id="is_sample_exam"
                checked={formData.is_sample_exam}
                onCheckedChange={(checked) => {
                  handleChange('is_sample_exam', checked);
                  // If marking as sample, ensure it's not premium
                  if (checked) {
                    handleChange('is_premium', false);
                  }
                }}
              />
            </div>

            {/* Premium Status */}
            <div className={`flex items-center justify-between p-4 rounded-lg border ${
              formData.is_sample_exam
                ? 'bg-gray-100 border-gray-200 opacity-50'
                : formData.is_premium
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200'
            }`}>
              <div>
                <Label htmlFor="is_premium" className="text-base font-semibold flex items-center gap-2">
                  <Crown className={`h-4 w-4 ${formData.is_premium ? 'text-amber-600' : 'text-gray-500'}`} />
                  Premium Exam
                </Label>
                <p className={`text-sm mt-1 ${formData.is_premium ? 'text-amber-800' : 'text-gray-600'}`}>
                  {formData.is_sample_exam
                    ? 'Sample exams cannot be premium'
                    : formData.is_premium
                      ? 'Users must purchase access to take this exam'
                      : 'This is a free exam available to all users'}
                </p>
              </div>
              <Switch
                id="is_premium"
                checked={formData.is_premium}
                disabled={formData.is_sample_exam}
                onCheckedChange={(checked) => handleChange('is_premium', checked)}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="is_active" className="text-base font-semibold">
                  Active Status
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  {formData.is_active
                    ? 'This exam is visible to users'
                    : 'This exam is hidden from users'}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange('is_active', checked)}
              />
            </div>

            {/* Note */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> After saving, you'll be redirected to the Question Manager
                where you can add and manage questions for this exam.
                {isEditMode && ` Current question count: ${formData.total_questions}`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? 'Update Exam' : 'Create Exam'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

ExamForm.displayName = 'ExamForm';
