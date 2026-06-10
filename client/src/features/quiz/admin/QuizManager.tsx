import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Power,
  PowerOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  BarChart3,
} from 'lucide-react';
import { useAllQuizzes, useDeleteQuiz, useToggleQuizActive } from '@/entities/quiz';
import type { QuizWithStats, QuizFilters, QueryOptions, CertificationType, DifficultyLevel } from '@/entities/quiz';
import { StatusBadge } from '@/shared/ui';
import { cn } from '@/shared/utils/cn';
import {
  CERTIFICATION_TYPE_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  QUIZ_MESSAGES,
  QUIZ_MESSAGES_AR,
} from '@/shared/constants/quiz.constants';
import { ROUTES } from '@/shared/constants/routes';

/**
 * QuizManager Component
 *
 * Admin dashboard for managing all quizzes with CRUD operations
 */

export interface QuizManagerProps {
  /**
   * Show in Arabic
   */
  isArabic?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const QuizManager = ({ isArabic = false, className }: QuizManagerProps) => {
  const navigate = useNavigate();

  // Filters and sorting
  // exclude_certification=true ensures formal certification exams (BDA-CP, BDA-SCP)
  // are never shown in the Learning System quiz manager
  const [filters, setFilters] = useState<QuizFilters>({
    certification_type: undefined,
    difficulty_level: undefined,
    is_active: undefined,
    search: undefined,
    exclude_certification: true,
  });

  const [sortOptions, setSortOptions] = useState<QueryOptions>({
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  // Local search
  const [searchTerm, setSearchTerm] = useState('');

  // Selected quizzes for bulk actions
  const [selectedQuizIds, setSelectedQuizIds] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Fetch quizzes
  const { data: quizzes, isLoading, isError, error, refetch } = useAllQuizzes(filters, sortOptions);
  const deleteQuiz = useDeleteQuiz();
  const toggleQuizActive = useToggleQuizActive();

  const messages = isArabic ? QUIZ_MESSAGES_AR : QUIZ_MESSAGES;

  // Client-side search filter
  const filteredQuizzes = useMemo(() => {
    if (!quizzes) return [];
    if (!searchTerm.trim()) return quizzes;

    const term = searchTerm.toLowerCase();
    return quizzes.filter(
      (quiz) =>
        quiz.title.toLowerCase().includes(term) ||
        quiz.title_ar?.toLowerCase().includes(term) ||
        quiz.description?.toLowerCase().includes(term)
    );
  }, [quizzes, searchTerm]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!quizzes) return { total: 0, active: 0, draft: 0 };

    return {
      total: quizzes.length,
      active: quizzes.filter((q) => q.is_active).length,
      draft: quizzes.filter((q) => !q.is_active).length,
    };
  }, [quizzes]);

  // Handle create quiz
  const handleCreateQuiz = () => {
    navigate(ROUTES.ADMIN.QUIZ_EDIT);
  };

  // Handle edit quiz
  const handleEditQuiz = (quizId: string) => {
    navigate(ROUTES.ADMIN.QUIZ_EDIT.replace(':id', quizId));
  };

  // Handle delete quiz
  const handleDeleteQuiz = async (quizId: string) => {
    try {
      await deleteQuiz.mutateAsync(quizId);
      setQuizToDelete(null);
      setSelectedQuizIds((prev) => {
        const next = new Set(prev);
        next.delete(quizId);
        return next;
      });
    } catch (error) {
      console.error('Error deleting quiz:', error);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedQuizIds).map((id) => deleteQuiz.mutateAsync(id))
      );
      setSelectedQuizIds(new Set());
      setShowBulkDeleteConfirm(false);
    } catch (error) {
      console.error('Error bulk deleting quizzes:', error);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (quizId: string, currentState: boolean) => {
    try {
      await toggleQuizActive.mutateAsync({ id: quizId, isActive: !currentState });
    } catch (error) {
      console.error('Error toggling quiz active status:', error);
    }
  };

  // Handle bulk toggle active
  const handleBulkToggleActive = async (activate: boolean) => {
    try {
      await Promise.all(
        Array.from(selectedQuizIds).map((id) =>
          toggleQuizActive.mutateAsync({ id, isActive: activate })
        )
      );
      setSelectedQuizIds(new Set());
    } catch (error) {
      console.error('Error bulk toggling quiz active status:', error);
    }
  };

  // Handle select/deselect quiz
  const handleSelectQuiz = (quizId: string) => {
    setSelectedQuizIds((prev) => {
      const next = new Set(prev);
      if (next.has(quizId)) {
        next.delete(quizId);
      } else {
        next.add(quizId);
      }
      return next;
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedQuizIds.size === filteredQuizzes.length) {
      setSelectedQuizIds(new Set());
    } else {
      setSelectedQuizIds(new Set(filteredQuizzes.map((q) => q.id)));
    }
  };

  // Handle filter change
  const handleCertTypeFilter = (type: CertificationType | undefined) => {
    setFilters((prev) => ({ ...prev, certification_type: type }));
  };

  const handleDifficultyFilter = (level: DifficultyLevel | undefined) => {
    setFilters((prev) => ({ ...prev, difficulty_level: level }));
  };

  const handleStatusFilter = (active: boolean | undefined) => {
    setFilters((prev) => ({ ...prev, is_active: active }));
  };

  const clearFilters = () => {
    setFilters({
      certification_type: undefined,
      difficulty_level: undefined,
      is_active: undefined,
      search: undefined,
      exclude_certification: true, // always keep certification exams excluded
    });
    setSearchTerm('');
  };

  const hasActiveFilters = Boolean(
    filters.certification_type ||
      filters.difficulty_level ||
      filters.is_active !== undefined ||
      searchTerm
  );

  const isAllSelected =
    filteredQuizzes.length > 0 && selectedQuizIds.size === filteredQuizzes.length;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Back to Assessment Bank */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate('/admin/question-bank')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assessment Bank
        </button>
      </div>

      {/* Statistics Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Quizzes */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {isArabic ? 'إجمالي الاختبارات' : 'Total Quizzes'}
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Active Quizzes */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {isArabic ? 'الاختبارات النشطة' : 'Active Quizzes'}
              </p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Draft Quizzes */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {isArabic ? 'المسودات' : 'Draft Quizzes'}
              </p>
              <p className="text-3xl font-bold text-gray-600 mt-1">{stats.draft}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="space-y-4">
        {/* Search and Create */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isArabic
                  ? 'ابحث عن الاختبارات...'
                  : 'Search quizzes by title or description...'
              }
              className={cn(
                'w-full rounded-lg border border-gray-300 bg-white py-2.5 text-gray-900',
                'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                'transition-all placeholder:text-gray-400',
                {
                  'pl-10 pr-4': !isArabic,
                  'pr-10 pl-4': isArabic,
                }
              )}
              dir={isArabic ? 'rtl' : 'ltr'}
            />
          </div>

          {/* New Quiz Button */}
          <button
            onClick={handleCreateQuiz}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            <span>{isArabic ? 'اختبار جديد' : 'New Quiz'}</span>
          </button>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="h-4 w-4" />
            <span>{isArabic ? 'تصفية' : 'Filter'}:</span>
          </div>

          {/* Certification Type Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => handleCertTypeFilter(undefined)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all border',
                {
                  'bg-blue-600 text-white border-blue-600':
                    filters.certification_type === undefined,
                  'bg-white text-gray-700 border-gray-300 hover:border-blue-500':
                    filters.certification_type !== undefined,
                }
              )}
            >
              {isArabic ? 'الكل' : 'All Types'}
            </button>
            <button
              onClick={() => handleCertTypeFilter('CP')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all border',
                {
                  'bg-blue-600 text-white border-blue-600':
                    filters.certification_type === 'CP',
                  'bg-white text-gray-700 border-gray-300 hover:border-blue-500':
                    filters.certification_type !== 'CP',
                }
              )}
            >
              {CERTIFICATION_TYPE_LABELS['CP']}
            </button>
            <button
              onClick={() => handleCertTypeFilter('SCP')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all border',
                {
                  'bg-blue-600 text-white border-blue-600':
                    filters.certification_type === 'SCP',
                  'bg-white text-gray-700 border-gray-300 hover:border-blue-500':
                    filters.certification_type !== 'SCP',
                }
              )}
            >
              {CERTIFICATION_TYPE_LABELS['SCP']}
            </button>
          </div>

          {/* Difficulty Filter */}
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => {
              const isActive = filters.difficulty_level === level;
              return (
                <button
                  key={level}
                  onClick={() =>
                    handleDifficultyFilter(isActive ? undefined : level)
                  }
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-all border',
                    {
                      'bg-blue-600 text-white border-blue-600': isActive,
                      'bg-white text-gray-700 border-gray-300 hover:border-blue-500': !isActive,
                    }
                  )}
                >
                  {DIFFICULTY_LABELS[level]}
                </button>
              );
            })}
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusFilter(undefined)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all border',
                {
                  'bg-blue-600 text-white border-blue-600':
                    filters.is_active === undefined,
                  'bg-white text-gray-700 border-gray-300 hover:border-blue-500':
                    filters.is_active !== undefined,
                }
              )}
            >
              {isArabic ? 'الكل' : 'All'}
            </button>
            <button
              onClick={() => handleStatusFilter(true)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all border',
                {
                  'bg-green-600 text-white border-green-600':
                    filters.is_active === true,
                  'bg-white text-gray-700 border-gray-300 hover:border-green-500':
                    filters.is_active !== true,
                }
              )}
            >
              {isArabic ? 'نشط' : 'Active'}
            </button>
            <button
              onClick={() => handleStatusFilter(false)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all border',
                {
                  'bg-gray-600 text-white border-gray-600':
                    filters.is_active === false,
                  'bg-white text-gray-700 border-gray-300 hover:border-gray-500':
                    filters.is_active !== false,
                }
              )}
            >
              {isArabic ? 'غير نشط' : 'Inactive'}
            </button>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              <X className="h-3 w-3" />
              {isArabic ? 'مسح الفلاتر' : 'Clear filters'}
            </button>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedQuizIds.size > 0 && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedQuizIds.size}{' '}
              {isArabic ? 'اختبار محدد' : 'quiz(zes) selected'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkToggleActive(true)}
                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                <Power className="h-4 w-4" />
                {isArabic ? 'تنشيط' : 'Activate'}
              </button>
              <button
                onClick={() => handleBulkToggleActive(false)}
                className="flex items-center gap-1 rounded-lg bg-gray-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
              >
                <PowerOff className="h-4 w-4" />
                {isArabic ? 'إلغاء التنشيط' : 'Deactivate'}
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                {isArabic ? 'حذف' : 'Delete'}
              </button>
              <button
                onClick={() => setSelectedQuizIds(new Set())}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Results Count */}
        {!isLoading && filteredQuizzes && (
          <p className="text-sm text-gray-600">
            {isArabic
              ? `${filteredQuizzes.length} اختبار`
              : `${filteredQuizzes.length} quiz${filteredQuizzes.length !== 1 ? 'zes' : ''} found`}
          </p>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-lg border bg-white p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {isArabic ? 'جاري تحميل الاختبارات...' : 'Loading quizzes...'}
          </p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">
                {isArabic ? 'خطأ في تحميل الاختبارات' : 'Error loading quizzes'}
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {error instanceof Error ? error.message : messages.ERROR.NETWORK_ERROR}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
              >
                {isArabic ? 'إعادة المحاولة' : 'Try again'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredQuizzes && filteredQuizzes.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasActiveFilters
              ? isArabic
                ? 'لم يتم العثور على اختبارات'
                : 'No quizzes found'
              : isArabic
              ? 'لا توجد اختبارات'
              : 'No quizzes yet'}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {hasActiveFilters
              ? isArabic
                ? 'حاول تعديل معايير البحث أو الفلتر'
                : 'Try adjusting your search or filter criteria'
              : isArabic
              ? 'ابدأ بإنشاء اختبار جديد'
              : 'Get started by creating a new quiz'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              {isArabic ? 'مسح البحث والفلاتر' : 'Clear search and filters'}
            </button>
          ) : (
            <button
              onClick={handleCreateQuiz}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {isArabic ? 'إنشاء اختبار جديد' : 'Create your first quiz'}
            </button>
          )}
        </div>
      )}

      {/* Quizzes Table */}
      {!isLoading && !isError && filteredQuizzes && filteredQuizzes.length > 0 && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {/* Checkbox */}
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  {/* Title */}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    {isArabic ? 'العنوان' : 'Title'}
                  </th>
                  {/* Certification Type */}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    {isArabic ? 'النوع' : 'Certification'}
                  </th>
                  {/* Difficulty */}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    {isArabic ? 'الصعوبة' : 'Difficulty'}
                  </th>
                  {/* Questions */}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    {isArabic ? 'الأسئلة' : 'Questions'}
                  </th>
                  {/* Status */}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    {isArabic ? 'الحالة' : 'Status'}
                  </th>
                  {/* Actions */}
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    {isArabic ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredQuizzes.map((quiz) => {
                  const isSelected = selectedQuizIds.has(quiz.id);
                  return (
                    <tr
                      key={quiz.id}
                      className={cn('hover:bg-gray-50 transition-colors', {
                        'bg-blue-50': isSelected,
                      })}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectQuiz(quiz.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Title */}
                      <td className="px-4 py-3">
                        <div className="max-w-sm">
                          <p className="font-medium text-gray-900 truncate">
                            {isArabic && quiz.title_ar ? quiz.title_ar : quiz.title}
                          </p>
                          {quiz.description && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {isArabic && quiz.description_ar
                                ? quiz.description_ar
                                : quiz.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Certification Type */}
                      <td className="px-4 py-3">
                        <StatusBadge
                          variant={quiz.certification_type}
                          size="sm"
                        >
                          {CERTIFICATION_TYPE_LABELS[quiz.certification_type]}
                        </StatusBadge>
                      </td>

                      {/* Difficulty */}
                      <td className="px-4 py-3">
                        <StatusBadge
                          variant={quiz.difficulty_level}
                          size="sm"
                        >
                          {DIFFICULTY_LABELS[quiz.difficulty_level]}
                        </StatusBadge>
                      </td>

                      {/* Questions */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">
                          {quiz.question_count || 0}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(quiz.id, quiz.is_active)}
                          disabled={toggleQuizActive.isPending}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                            {
                              'bg-green-100 text-green-700 hover:bg-green-200':
                                quiz.is_active,
                              'bg-gray-100 text-gray-700 hover:bg-gray-200':
                                !quiz.is_active,
                              'opacity-50 cursor-not-allowed': toggleQuizActive.isPending,
                            }
                          )}
                        >
                          {quiz.is_active ? (
                            <>
                              <Power className="h-3 w-3" />
                              {isArabic ? 'نشط' : 'Active'}
                            </>
                          ) : (
                            <>
                              <PowerOff className="h-3 w-3" />
                              {isArabic ? 'غير نشط' : 'Inactive'}
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditQuiz(quiz.id)}
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50 transition-colors"
                            title={isArabic ? 'تعديل' : 'Edit'}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setQuizToDelete(quiz.id)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50 transition-colors"
                            title={isArabic ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {isArabic ? 'تأكيد الحذف' : 'Confirm Delete'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {isArabic
                ? 'هل أنت متأكد من حذف هذا الاختبار؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this quiz? This action cannot be undone.'}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setQuizToDelete(null)}
                disabled={deleteQuiz.isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDeleteQuiz(quizToDelete)}
                disabled={deleteQuiz.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteQuiz.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isArabic ? 'جاري الحذف...' : 'Deleting...'}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    {isArabic ? 'حذف' : 'Delete'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {isArabic ? 'تأكيد الحذف الجماعي' : 'Confirm Bulk Delete'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {isArabic
                ? `هل أنت متأكد من حذف ${selectedQuizIds.size} اختبار؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete ${selectedQuizIds.size} quiz${selectedQuizIds.size !== 1 ? 'zes' : ''}? This action cannot be undone.`}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                disabled={deleteQuiz.isPending}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleteQuiz.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteQuiz.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isArabic ? 'جاري الحذف...' : 'Deleting...'}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    {isArabic ? 'حذف الكل' : 'Delete All'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

QuizManager.displayName = 'QuizManager';
