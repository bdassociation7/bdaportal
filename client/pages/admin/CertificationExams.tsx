import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CertificationExamService, type CertificationExam } from '@/entities/certification-exam';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { Plus, Edit, Trash2, Eye, EyeOff, BarChart3, ListChecks, Globe, BookOpen } from 'lucide-react';
import type { ExamLanguage } from '@/entities/certification-exam';
import CertificationExamForm from './components/CertificationExamForm';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CertificationExamsAdmin() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState<CertificationExam | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'CP' | 'SCP'>('all');
  const [langFilter, setLangFilter] = useState<'all' | ExamLanguage>('all');

  // Fetch exams
  const { data: exams, isLoading, refetch } = useQuery({
    queryKey: ['certification-exams'],
    queryFn: async () => {
      const result = await CertificationExamService.getAllCertificationExams();
      if (result.error) throw result.error;
      return result.data || [];
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      CertificationExamService.toggleExamActive(id, isActive),
    onSuccess: () => {
      toast({
        title: t('certificationExams.statusUpdated'),
        description: t('certificationExams.statusUpdatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['certification-exams'] });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('certificationExams.statusUpdateError'),
        variant: 'destructive',
      });
    },
  });

  // Handle delete with force option
  const handleDelete = async (exam: CertificationExam) => {
    // First confirmation
    const confirmed = await confirm({
      title: t('certificationExams.deleteExamTitle'),
      description: t('certificationExams.deleteConfirm'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });

    if (!confirmed) return;

    // Try to delete
    const result = await CertificationExamService.deleteCertificationExam(exam.id);

    if (result.error) {
      // Check if error is due to existing attempts
      if (result.error.type === 'HAS_ATTEMPTS') {
        const attemptCount = result.error.attemptCount;

        // Show force delete confirmation with appropriate message
        const forceMessage = exam.is_active
          ? t('certificationExams.forceDeleteActiveWarning').replace('{{count}}', String(attemptCount))
          : t('certificationExams.forceDeleteInactiveWarning').replace('{{count}}', String(attemptCount));

        const forceConfirmed = await confirm({
          title: t('certificationExams.forceDeleteTitle'),
          description: forceMessage,
          confirmText: t('certificationExams.forceDeleteConfirm'),
          cancelText: t('common.cancel'),
          variant: 'destructive',
        });

        if (forceConfirmed) {
          // Force delete
          const forceResult = await CertificationExamService.deleteCertificationExam(exam.id, true);

          if (forceResult.error) {
            toast({
              title: t('common.error'),
              description: forceResult.error.message || t('certificationExams.deleteError'),
              variant: 'destructive',
            });
          } else {
            toast({
              title: t('certificationExams.examDeleted'),
              description: t('certificationExams.examDeletedDesc'),
            });
            queryClient.invalidateQueries({ queryKey: ['certification-exams'] });
          }
        }
      } else {
        // Other error
        toast({
          title: t('common.error'),
          description: result.error.message || t('certificationExams.deleteError'),
          variant: 'destructive',
        });
      }
    } else {
      // Success
      toast({
        title: t('certificationExams.examDeleted'),
        description: t('certificationExams.examDeletedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['certification-exams'] });
    }
  };

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !currentStatus });
  };

  const filteredExams = exams?.filter((exam) => {
    const typeMatch = typeFilter === 'all' || exam.certification_type === typeFilter;
    const langMatch = langFilter === 'all' || exam.exam_language === langFilter;
    return typeMatch && langMatch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ListChecks className="h-8 w-8" />
              {t('certificationExams.title')}
            </h1>
            <p className="mt-2 opacity-90">{t('certificationExams.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/exam-question-bank')}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white border border-white/30 rounded-lg hover:bg-white/30 transition font-medium"
            >
              <BookOpen size={20} />
              Manage Question Bank
            </button>
            <button
              onClick={() => {
                setSelectedExam(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
            >
              <Plus size={20} />
              {t('certificationExams.createNew')}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Type Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              typeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('certificationExams.allExams')} ({exams?.length || 0})
          </button>
          <button
            onClick={() => setTypeFilter('CP')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              typeFilter === 'CP'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            CP™ ({exams?.filter(e => e.certification_type === 'CP').length || 0})
          </button>
          <button
            onClick={() => setTypeFilter('SCP')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              typeFilter === 'SCP'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            SCP™ ({exams?.filter(e => e.certification_type === 'SCP').length || 0})
          </button>
        </div>

        {/* Language Filters */}
        <div className="flex gap-2 items-center">
          <Globe className="h-4 w-4 text-gray-500" />
          <button
            onClick={() => setLangFilter('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              langFilter === 'all'
                ? 'bg-slate-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Languages
          </button>
          <button
            onClick={() => setLangFilter('en')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              langFilter === 'en'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🇬🇧 English ({exams?.filter(e => e.exam_language === 'en').length || 0})
          </button>
          <button
            onClick={() => setLangFilter('ar')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              langFilter === 'ar'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🇸🇦 العربية ({exams?.filter(e => e.exam_language === 'ar').length || 0})
          </button>
        </div>
      </div>

      {/* Exams List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExams?.map((exam) => (
          <div
            key={exam.id}
            className={`bg-white rounded-lg shadow-md p-6 border-l-4 transition hover:shadow-lg ${
              exam.certification_type === 'CP'
                ? 'border-green-500'
                : 'border-purple-500'
            }`}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      exam.certification_type === 'CP'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    BDA-{exam.certification_type}™
                  </span>
                  {/* Language Badge */}
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      exam.exam_language === 'ar'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {exam.exam_language === 'ar' ? '🇸🇦 AR' : '🇬🇧 EN'}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      exam.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {exam.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </div>
                <h3 className={`text-lg font-bold text-gray-900 ${exam.exam_language === 'ar' ? 'text-right' : ''}`} dir={exam.exam_language === 'ar' ? 'rtl' : 'ltr'}>
                  {exam.exam_language === 'ar' && exam.title_ar ? exam.title_ar : exam.title}
                </h3>
              </div>
            </div>

            {/* Description */}
            {(exam.description || exam.description_ar) && (
              <p
                className={`text-sm text-gray-600 mb-4 line-clamp-2 ${exam.exam_language === 'ar' ? 'text-right' : ''}`}
                dir={exam.exam_language === 'ar' ? 'rtl' : 'ltr'}
              >
                {exam.exam_language === 'ar' && exam.description_ar ? exam.description_ar : exam.description}
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-gray-500">{t('certificationExams.questions')}</p>
                <p className="font-semibold text-gray-900">{exam.question_count || 0}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('certificationExams.duration')}</p>
                <p className="font-semibold text-gray-900">{exam.time_limit_minutes} {t('common.min')}</p>
              </div>
              <div>
                <p className="text-gray-500">{t('certificationExams.passScore')}</p>
                <p className="font-semibold text-gray-900">{exam.passing_score_percentage}%</p>
              </div>
              <div>
                <p className="text-gray-500">{t('certificationExams.difficulty')}</p>
                <p className="font-semibold text-gray-900">
                  {exam.difficulty_level === 'easy'
                    ? t('certificationExams.difficultyEasy')
                    : exam.difficulty_level === 'medium'
                    ? t('certificationExams.difficultyMedium')
                    : t('certificationExams.difficultyHard')}
                </p>
              </div>
            </div>

            {/* Questions Info - managed from Exam Question Bank page */}
            <div
              className={`w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                exam.certification_type === 'CP'
                  ? 'bg-green-50 text-green-600 border border-green-100'
                  : 'bg-purple-50 text-purple-600 border border-purple-100'
              }`}
            >
              <ListChecks size={16} />
              <span>{exam.question_count || 0} Questions in Bank</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleToggleActive(exam.id, exam.is_active)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  exam.is_active
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
                title={exam.is_active ? t('common.deactivate') : t('common.activate')}
              >
                {exam.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => {
                  setSelectedExam(exam);
                  setShowForm(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium transition"
                title={t('common.edit')}
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => handleDelete(exam)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium transition"
                title={t('common.delete')}
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => {
                  // TODO: Navigate to stats page
                  toast({
                    title: t('common.comingSoon'),
                    description: t('certificationExams.statsComingSoon'),
                  });
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm font-medium transition"
                title={t('common.statistics')}
              >
                <BarChart3 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredExams?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">{t('certificationExams.noExamsFound')}</p>
          <button
            onClick={() => {
              setSelectedExam(null);
              setShowForm(true);
            }}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {t('certificationExams.createFirst')}
          </button>
        </div>
      )}

      {/* Exam Form Modal */}
      {showForm && (
        <CertificationExamForm
          exam={selectedExam}
          onClose={() => {
            setShowForm(false);
            setSelectedExam(null);
          }}
        />
      )}
    </div>
  );
}
