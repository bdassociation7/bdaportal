/**
 * Exam Attempts Admin Page
 *
 * Admin interface for viewing exam attempts
 * Shows all certification exam attempts by users
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/shared/config/supabase.config';
import {
  GraduationCap,
  Clock,
  Users,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
  FileText,
  Award,
  FlaskConical,
  Play,
  Trash2,
  BarChart3,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ExamAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  passed: boolean | null;
  total_points_earned: number | null;
  total_points_possible: number | null;
  users: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string | null;
  } | null;
  quizzes: {
    id: string;
    title: string;
    certification_type: 'CP' | 'SCP';
    quiz_type: string | null;
  } | null;
}

// ============================================================================
// Main Component
// ============================================================================

export default function ExamSchedulingAdmin() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [certFilter, setCertFilter] = useState<'all' | 'CP' | 'SCP'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch exam attempts
  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['admin', 'exam-attempts', statusFilter, certFilter],
    queryFn: async () => {
      let query = supabase
        .from('quiz_attempts')
        .select(`
          id,
          user_id,
          quiz_id,
          started_at,
          completed_at,
          score,
          passed,
          total_points_earned,
          total_points_possible,
          users!quiz_attempts_user_id_fkey(
            id,
            email,
            first_name,
            last_name,
            role
          ),
          quizzes!quiz_attempts_quiz_id_fkey(
            id,
            title,
            certification_type,
            quiz_type
          )
        `)
        .order('started_at', { ascending: false });

      // Apply filters
      if (statusFilter === 'completed') {
        query = query.not('completed_at', 'is', null);
      } else if (statusFilter === 'in_progress') {
        query = query.is('completed_at', null);
      }

      if (certFilter !== 'all') {
        // Filter at application level since nested filter not supported
      }

      const { data, error } = await query;
      if (error) throw error;

      let result = (data || []) as ExamAttempt[];

      // Show only certification exams — exclude lesson practice quizzes
      result = result.filter(a => a.quizzes?.quiz_type !== 'lesson');

      // Apply cert filter at application level
      if (certFilter !== 'all') {
        result = result.filter(a => a.quizzes?.certification_type === certFilter);
      }

      return result;
    },
  });

  // Filtered attempts
  const filteredAttempts = useMemo(() => {
    return attempts.filter((attempt: ExamAttempt) => {
      const matchesSearch = searchTerm === '' ||
        attempt.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attempt.users?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attempt.users?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attempt.quizzes?.title?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [attempts, searchTerm]);

  // Discard a test attempt
  const handleDiscard = async (attempt: ExamAttempt) => {
    if (!window.confirm(`Delete test attempt for ${attempt.users?.first_name} ${attempt.users?.last_name}?\n\nThis will permanently remove the attempt and all its data.`)) return;
    setDeletingId(attempt.id);
    try {
      const { error } = await supabase.rpc('discard_test_exam_attempt', { p_attempt_id: attempt.id });
      if (error) throw error;
      toast({ title: 'Test attempt deleted' });
      queryClient.invalidateQueries({ queryKey: ['admin', 'exam-attempts'] });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = attempts.length;
    const completed = attempts.filter(a => a.completed_at).length;
    const inProgress = total - completed;
    const passed = attempts.filter(a => a.passed === true).length;
    const failed = attempts.filter(a => a.completed_at && a.passed === false).length;

    return { total, completed, inProgress, passed, failed };
  }, [attempts]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <GraduationCap className="h-8 w-8" />
              {isRTL ? 'محاولات الامتحانات' : 'Exam Attempts'}
            </h1>
            <p className="mt-2 opacity-90">
              {isRTL ? 'عرض جميع محاولات الامتحانات' : 'View all certification exam attempts'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{isRTL ? 'إجمالي المحاولات' : 'Total Attempts'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{isRTL ? 'مكتملة' : 'Completed'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{isRTL ? 'قيد التقدم' : 'In Progress'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Award className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{isRTL ? 'ناجح' : 'Passed'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.passed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{isRTL ? 'راسب' : 'Failed'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={isRTL ? 'البحث...' : 'Search by user or exam...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'completed' | 'in_progress')}
              className="appearance-none pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">{isRTL ? 'جميع الحالات' : 'All Status'}</option>
              <option value="completed">{isRTL ? 'مكتملة' : 'Completed'}</option>
              <option value="in_progress">{isRTL ? 'قيد التقدم' : 'In Progress'}</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={certFilter}
              onChange={(e) => setCertFilter(e.target.value as 'all' | 'CP' | 'SCP')}
              className="appearance-none pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">{isRTL ? 'جميع الشهادات' : 'All Certifications'}</option>
              <option value="CP">BDA-CP</option>
              <option value="SCP">BDA-SCP</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Attempts Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          {filteredAttempts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>{isRTL ? 'لا توجد محاولات' : 'No attempts found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      {isRTL ? 'المستخدم' : 'User'}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      {isRTL ? 'الامتحان' : 'Exam'}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      {isRTL ? 'بدأ في' : 'Started At'}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      {isRTL ? 'الحالة' : 'Status'}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      {isRTL ? 'النتيجة' : 'Result'}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttempts.map((attempt: ExamAttempt) => {
                    const startedDate = new Date(attempt.started_at);
                    const isCompleted = !!attempt.completed_at;
                    const hasResult = attempt.score !== null;
                    const isTestAttempt = ['admin', 'super_admin'].includes(attempt.users?.role || '');

                    return (
                      <tr
                        key={attempt.id}
                        className={`border-b hover:bg-gray-50 ${isTestAttempt ? 'bg-amber-50/40' : ''}`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">
                              {attempt.users?.first_name} {attempt.users?.last_name}
                            </div>
                            {isTestAttempt && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-700 font-medium">
                                <FlaskConical className="h-3 w-3" />
                                Test
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {attempt.users?.email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{attempt.quizzes?.title}</div>
                          <div className="text-sm text-gray-500">
                            BDA-{attempt.quizzes?.certification_type}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            {startedDate.toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {startedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isCompleted ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {isRTL ? 'مكتمل' : 'Completed'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">
                              <Clock className="h-3 w-3 mr-1" />
                              {isRTL ? 'قيد التقدم' : 'In Progress'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {hasResult ? (
                            <div className="flex items-center gap-2">
                              {attempt.passed ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700">
                                  <Award className="h-3 w-3 mr-1" />
                                  {isRTL ? 'ناجح' : 'Passed'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 text-xs rounded bg-red-100 text-red-700">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  {isRTL ? 'راسب' : 'Failed'}
                                </span>
                              )}
                              <span className="text-sm font-medium">
                                {attempt.score}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {isCompleted && (
                              <button
                                onClick={() => navigate(`/admin/exam-report/${attempt.id}`)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium transition-colors"
                              >
                                <BarChart3 className="h-3 w-3" />
                                View Report
                              </button>
                            )}
                          </div>
                          {isTestAttempt && (
                            <div className="flex items-center gap-2">
                              {!isCompleted && (
                                <button
                                  onClick={() => navigate(
                                    `/certification/exam/${attempt.quiz_id}/attempt/${attempt.id}`,
                                    { state: { adminReturnPath: '/admin/exam-scheduling' } }
                                  )}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium transition-colors"
                                >
                                  <Play className="h-3 w-3" />
                                  Continue
                                </button>
                              )}
                              {!isCompleted && (
                                <button
                                  onClick={() => handleDiscard(attempt)}
                                  disabled={deletingId === attempt.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 font-medium transition-colors disabled:opacity-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  {deletingId === attempt.id ? '…' : 'Delete'}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
