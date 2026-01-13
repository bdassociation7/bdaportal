import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Power,
  PowerOff,
  GraduationCap,
  Clock,
  Target,
  TrendingUp,
  Crown,
  Globe,
  LayoutList,
  Users,
  UserPlus,
  X,
  Loader2,
  Calendar,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useExamsAdmin,
  useDeleteExam,
  useToggleExamActive,
  useExamPremiumAccess,
  useGrantPremiumAccess,
  useRevokePremiumAccess,
} from '@/entities/mock-exam';
import {
  EXAM_CATEGORY_LABELS,
  EXAM_DIFFICULTY_LABELS,
  EXAM_LANGUAGE_LABELS,
  ExamCategory,
  ExamDifficulty,
} from '@/entities/mock-exam/mock-exam.types';
import { cn } from '@/shared/utils/cn';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '@/lib/supabase';

/**
 * ExamManagement Page
 * Admin page for managing mock exams (CRUD operations)
 */

// Selected user type
interface SelectedUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export default function ExamManagement() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // Filters state
  const [search, setSearch] = useState('');
  const [languageTab, setLanguageTab] = useState<'en' | 'ar'>('en');
  const [categoryFilter, setCategoryFilter] = useState<ExamCategory | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<ExamDifficulty | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'sample' | 'premium' | 'free'>('all');

  // Access Management Dialog State
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [selectedExamForAccess, setSelectedExamForAccess] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [accessDuration, setAccessDuration] = useState<'lifetime' | '3' | '6' | '12'>('12');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build filters object
  const filters = {
    search: search || undefined,
    language: languageTab,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    difficulty: difficultyFilter !== 'all' ? difficultyFilter : undefined,
    is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
    is_premium: typeFilter === 'premium' ? true : typeFilter === 'free' || typeFilter === 'sample' ? false : undefined,
    is_sample_exam: typeFilter === 'sample' ? true : undefined,
  };

  // Data fetching
  const { data: exams, isLoading } = useExamsAdmin(filters);
  const deleteExamMutation = useDeleteExam();
  const toggleActiveMutation = useToggleExamActive();

  // Access management hooks
  const { data: examPremiumAccess, isLoading: isLoadingAccess } = useExamPremiumAccess(
    selectedExamForAccess?.id || '',
    accessDialogOpen && !!selectedExamForAccess
  );
  const grantAccessMutation = useGrantPremiumAccess();
  const revokeAccessMutation = useRevokePremiumAccess();

  // Search users for granting access
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['users-search', userSearchQuery],
    queryFn: async () => {
      if (!userSearchQuery || userSearchQuery.length < 2) return [];
      const searchLower = userSearchQuery.toLowerCase();
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .or(`email.ilike.%${searchLower}%,first_name.ilike.%${searchLower}%,last_name.ilike.%${searchLower}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: userSearchQuery.length >= 2 && accessDialogOpen,
    staleTime: 30000,
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Add user to selection
  const addUser = useCallback((user: SelectedUser) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(prev => [...prev, user]);
    }
    setUserSearchQuery('');
    setShowUserDropdown(false);
    searchInputRef.current?.focus();
  }, [selectedUsers]);

  // Remove user from selection
  const removeUser = useCallback((userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  // Open access dialog
  const openAccessDialog = (exam: { id: string; title: string }) => {
    setSelectedExamForAccess(exam);
    setAccessDialogOpen(true);
    setSelectedUsers([]);
    setUserSearchQuery('');
    setAccessDuration('12'); // Default to 12 months per business rules
  };

  // Close access dialog
  const closeAccessDialog = () => {
    setAccessDialogOpen(false);
    setSelectedExamForAccess(null);
    setSelectedUsers([]);
    setUserSearchQuery('');
  };

  // Grant access to selected users
  const handleGrantAccess = async () => {
    if (!selectedExamForAccess || selectedUsers.length === 0) return;

    let expiresAt: string | undefined;
    if (accessDuration !== 'lifetime') {
      const months = parseInt(accessDuration);
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + months);
      expiresAt = expiry.toISOString();
    }

    let successCount = 0;
    let failCount = 0;

    for (const user of selectedUsers) {
      try {
        const result = await grantAccessMutation.mutateAsync({
          userId: user.id,
          examId: selectedExamForAccess.id,
          expiresAt,
        });
        if (result.error) {
          failCount++;
        } else {
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: t('common.success'),
        description: `Access granted to ${successCount} user(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
      setSelectedUsers([]);
    } else {
      toast({
        title: t('common.error'),
        description: 'Failed to grant access',
        variant: 'destructive',
      });
    }
  };

  // Revoke access
  const handleRevokeAccess = async (userId: string, userEmail: string) => {
    if (!selectedExamForAccess) return;

    const confirmed = await confirm({
      title: 'Revoke Access',
      description: `Are you sure you want to revoke access for ${userEmail}?`,
      confirmText: 'Revoke',
      variant: 'destructive',
    });

    if (!confirmed) return;

    const { error } = await revokeAccessMutation.mutateAsync({
      userId,
      examId: selectedExamForAccess.id,
    });

    if (error) {
      toast({
        title: t('common.error'),
        description: 'Failed to revoke access',
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('common.success'),
        description: 'Access revoked successfully',
      });
    }
  };

  // Calculate summary statistics
  const totalExams = exams?.length || 0;
  const activeExams = exams?.filter((e) => e.is_active).length || 0;
  const totalQuestions = exams?.reduce((sum, e) => sum + e.total_questions, 0) || 0;
  const avgPassRate =
    exams && exams.length > 0
      ? Math.round(exams.reduce((sum, e) => sum + e.pass_rate, 0) / exams.length)
      : 0;

  // Handlers
  const handleDelete = async (id: string, title: string) => {
    const confirmed = await confirm({
      title: t('examMgmt.deleteExam'),
      description: t('examMgmt.deleteConfirmDesc').replace('{title}', title),
      confirmText: t('common.delete'),
      variant: 'destructive',
    });

    if (!confirmed) return;

    const { error } = await deleteExamMutation.mutateAsync(id);

    if (error) {
      toast({
        title: t('common.error'),
        description: t('examMgmt.deleteError'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('common.success'),
        description: t('examMgmt.deleteSuccess'),
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean, title: string) => {
    const newStatus = !currentStatus;

    const confirmed = await confirm({
      title: newStatus ? t('examMgmt.activateExam') : t('examMgmt.deactivateExam'),
      description: (newStatus ? t('examMgmt.activateConfirmDesc') : t('examMgmt.deactivateConfirmDesc')).replace('{title}', title),
      confirmText: newStatus ? t('common.activate') : t('common.deactivate'),
    });

    if (!confirmed) return;

    const { error } = await toggleActiveMutation.mutateAsync({ id, isActive: newStatus });

    if (error) {
      toast({
        title: t('common.error'),
        description: newStatus ? t('examMgmt.activateError') : t('examMgmt.deactivateError'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('common.success'),
        description: newStatus ? t('examMgmt.activateSuccess') : t('examMgmt.deactivateSuccess'),
      });
    }
  };

  const getDifficultyColor = (difficulty: ExamDifficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'hard':
        return 'text-red-700 bg-red-100 border-red-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GraduationCap className="h-8 w-8" />
          {t('examMgmt.title')}
        </h1>
        <p className="mt-2 opacity-90">
          {t('examMgmt.subtitle')}
        </p>
        <div className="mt-4">
          <Button
            onClick={() => navigate('/admin/exams/new')}
            variant="secondary"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('examMgmt.createNewExam')}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{totalExams}</p>
                <p className="text-sm font-medium text-gray-600">{t('examMgmt.totalExams')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <Power className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{activeExams}</p>
                <p className="text-sm font-medium text-gray-600">{t('examMgmt.activeExams')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100">
                <Target className="h-6 w-6 text-royal-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
                <p className="text-sm font-medium text-gray-600">{t('examMgmt.totalQuestions')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-100">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{avgPassRate}%</p>
                <p className="text-sm font-medium text-gray-600">{t('examMgmt.avgPassRate')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Language Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-lg shadow-sm overflow-hidden">
        <button
          onClick={() => setLanguageTab('en')}
          className={cn(
            'flex-1 px-6 py-4 text-sm font-medium transition-colors',
            languageTab === 'en'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Globe className="h-4 w-4" />
            <span>{t('examMgmt.englishExams')}</span>
            <Badge variant="secondary" className="ml-1">
              {exams?.filter(e => e.language === 'en').length || 0}
            </Badge>
          </div>
        </button>
        <button
          onClick={() => setLanguageTab('ar')}
          className={cn(
            'flex-1 px-6 py-4 text-sm font-medium transition-colors',
            languageTab === 'ar'
              ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Globe className="h-4 w-4" />
            <span>{t('examMgmt.arabicExams')}</span>
            <Badge variant="secondary" className="ml-1">
              {exams?.filter(e => e.language === 'ar').length || 0}
            </Badge>
          </div>
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('examMgmt.searchExams')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as 'all' | 'sample' | 'premium' | 'free')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Exam Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sample">
                  <span className="flex items-center gap-2">
                    <Gift className="h-3 w-3 text-green-600" />
                    Free Samples
                  </span>
                </SelectItem>
                <SelectItem value="premium">
                  <span className="flex items-center gap-2">
                    <Crown className="h-3 w-3 text-amber-600" />
                    Premium
                  </span>
                </SelectItem>
                <SelectItem value="free">Free (Non-Sample)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter}
              onValueChange={(value) => setCategoryFilter(value as ExamCategory | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('examMgmt.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('examMgmt.allCategories')}</SelectItem>
                <SelectItem value="cp">{t('examMgmt.cpExam')}</SelectItem>
                <SelectItem value="scp">{t('examMgmt.scpExam')}</SelectItem>
                <SelectItem value="general">{t('examMgmt.generalKnowledge')}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={difficultyFilter}
              onValueChange={(value) => setDifficultyFilter(value as ExamDifficulty | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('examMgmt.difficulty')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('examMgmt.allDifficulties')}</SelectItem>
                <SelectItem value="easy">{t('examMgmt.easy')}</SelectItem>
                <SelectItem value="medium">{t('examMgmt.medium')}</SelectItem>
                <SelectItem value="hard">{t('examMgmt.hard')}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('examMgmt.allStatus')}</SelectItem>
                <SelectItem value="active">{t('common.active')}</SelectItem>
                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Exams Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('examMgmt.examsList')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-600">{t('examMgmt.loadingExams')}</p>
            </div>
          ) : !exams || exams.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">{t('examMgmt.noExamsFound')}</p>
              <Button onClick={() => navigate('/admin/exams/new')} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('examMgmt.createFirstExam')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      {t('examMgmt.tableTitle')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      {t('examMgmt.category')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      {t('examMgmt.difficulty')}
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('examMgmt.questions')}
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('examMgmt.duration')}
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('examMgmt.passRate')}
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      {t('common.status')}
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {exams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{exam.title}</p>
                            {exam.is_sample_exam && (
                              <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                                <Gift className="h-3 w-3 mr-1" />
                                Sample
                              </Badge>
                            )}
                            {exam.is_premium && (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                                <Crown className="h-3 w-3 mr-1" />
                                {t('examMgmt.premium')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {EXAM_LANGUAGE_LABELS[exam.language]}
                            </span>
                            <span>•</span>
                            <span>{exam.total_attempts} {t('examMgmt.attempts')}</span>
                            {exam.last_attempt_date && (
                              <>
                                <span>•</span>
                                <span>Last: {formatDistanceToNow(
                                  new Date(exam.last_attempt_date),
                                  { addSuffix: true }
                                )}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {EXAM_CATEGORY_LABELS[exam.category]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn('border', getDifficultyColor(exam.difficulty))}>
                          {EXAM_DIFFICULTY_LABELS[exam.difficulty]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium">{exam.total_questions}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{exam.duration_minutes}m</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'font-medium',
                            exam.pass_rate >= 70
                              ? 'text-green-600'
                              : exam.pass_rate >= 50
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          )}
                        >
                          {exam.pass_rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {exam.is_active ? (
                          <Badge className="bg-green-100 text-green-700 border-green-300">
                            <Power className="h-3 w-3 mr-1" />
                            {t('common.active')}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 border-gray-300">
                            <PowerOff className="h-3 w-3 mr-1" />
                            {t('common.inactive')}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/admin/exams/${exam.id}/questions`)}
                            title={t('examMgmt.manageQuestions')}
                          >
                            <LayoutList className="h-4 w-4" />
                          </Button>
                          {exam.is_premium && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openAccessDialog({ id: exam.id, title: exam.title })}
                              title="Manage Access"
                            >
                              <Users className="h-4 w-4 text-amber-600" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/admin/exams/${exam.id}/edit`)}
                            title={t('common.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(exam.id, exam.is_active, exam.title)}
                            title={exam.is_active ? t('common.deactivate') : t('common.activate')}
                          >
                            {exam.is_active ? (
                              <PowerOff className="h-4 w-4 text-orange-600" />
                            ) : (
                              <Power className="h-4 w-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(exam.id, exam.title)}
                            title={t('common.delete')}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Management Dialog */}
      <Dialog open={accessDialogOpen} onOpenChange={(open) => !open && closeAccessDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-600" />
              Manage Premium Access
            </DialogTitle>
            <DialogDescription>
              {selectedExamForAccess?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Grant Access Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Grant Access to Users
              </h3>

              {/* User Search */}
              <div className="space-y-2">
                <Label>Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      setShowUserDropdown(true);
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    className="pl-10"
                  />

                  {/* Search Results Dropdown */}
                  {showUserDropdown && userSearchQuery.length >= 2 && (
                    <div
                      ref={dropdownRef}
                      className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto"
                    >
                      {isSearching ? (
                        <div className="p-3 text-center text-gray-500">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Searching...
                        </div>
                      ) : searchResults && searchResults.length > 0 ? (
                        searchResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                            onClick={() => addUser(user)}
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                            <UserPlus className="h-4 w-4 text-gray-400" />
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-gray-500 text-sm">
                          No users found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Users ({selectedUsers.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <Badge
                        key={user.id}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <span>{user.first_name || user.email}</span>
                        <button
                          type="button"
                          onClick={() => removeUser(user.id)}
                          className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Access Duration */}
              <div className="space-y-2">
                <Label>Access Duration</Label>
                <Select
                  value={accessDuration}
                  onValueChange={(value) => setAccessDuration(value as typeof accessDuration)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 Months (Recommended)</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                    <SelectItem value="3">3 Months</SelectItem>
                    <SelectItem value="lifetime">Lifetime (no expiry)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Grant Button */}
              <Button
                onClick={handleGrantAccess}
                disabled={selectedUsers.length === 0 || grantAccessMutation.isPending}
                className="w-full"
              >
                {grantAccessMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Granting Access...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Grant Access to {selectedUsers.length} User(s)
                  </>
                )}
              </Button>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Current Access Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users with Access ({examPremiumAccess?.length || 0})
              </h3>

              {isLoadingAccess ? (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : examPremiumAccess && examPremiumAccess.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {examPremiumAccess.map((access) => (
                    <div
                      key={access.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {access.user?.first_name} {access.user?.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{access.user?.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Granted: {format(new Date(access.granted_at), 'MMM d, yyyy')}
                          </span>
                          {access.expires_at ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                new Date(access.expires_at) < new Date()
                                  ? 'border-red-300 text-red-600'
                                  : 'border-green-300 text-green-600'
                              )}
                            >
                              {new Date(access.expires_at) < new Date()
                                ? 'Expired'
                                : `Expires: ${format(new Date(access.expires_at), 'MMM d, yyyy')}`}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
                              Lifetime
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevokeAccess(access.user_id, access.user?.email || '')}
                        disabled={revokeAccessMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No users have access to this exam yet.
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAccessDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

ExamManagement.displayName = 'ExamManagement';
