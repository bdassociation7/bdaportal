/**
 * ECP Training Batches Management
 * Manage training batches/cohorts for the ECP partner
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Search,
  PlusCircle,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Play,
  CheckCircle,
  XCircle,
  MapPin,
  Monitor,
  Eye,
} from 'lucide-react';
import {
  useBatches,
  useUpdateBatch,
  useDeleteBatch,
} from '@/entities/ecp';
import type { TrainingBatch, BatchFilters, BatchStatus, TrainingMode } from '@/entities/ecp';
import { useCommonConfirms } from '@/hooks/use-confirm';
import { useLanguage } from '@/contexts/LanguageContext';

// ============================================================================
// Translations
// ============================================================================

const translations = {
  en: {
    // Header
    title: 'Training Batches',
    subtitle: 'Manage your training cohorts and schedule certification programs',
    createBatch: 'Create Batch',
    // Stats
    totalBatches: 'Total Batches',
    scheduled: 'Scheduled',
    inProgress: 'In Progress',
    completed: 'Completed',
    // Status labels
    statusDraft: 'Draft',
    statusScheduled: 'Scheduled',
    statusInProgress: 'In Progress',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    // Filters
    searchPlaceholder: 'Search batches...',
    allStatus: 'All Status',
    allTypes: 'All Types',
    // Training modes
    modeInPerson: 'In Person',
    modeOnline: 'Online',
    modeHybrid: 'Hybrid',
    // Table
    allBatches: 'All Batches',
    viewAndManage: 'View and manage training batches',
    batch: 'Batch',
    certification: 'Certification',
    dates: 'Dates',
    trainer: 'Trainer',
    enrollment: 'Enrolment',
    status: 'Status',
    actions: 'Actions',
    to: 'to',
    exam: 'Exam',
    notAssigned: 'Not assigned',
    // Actions
    viewDetails: 'View Details',
    edit: 'Edit',
    viewTrainees: 'View Trainees',
    schedule: 'Schedule',
    startTraining: 'Start Training',
    markCompleted: 'Mark Completed',
    cancelTraining: 'Cancel Training',
    cancel: 'Cancel',
    delete: 'Delete',
    // Confirm dialogs
    cancelInProgressTitle: 'Cancel In-Progress Training',
    cancelInProgressDesc: 'Are you sure you want to cancel this in-progress training? This action cannot be undone.',
    cancelTrainingBtn: 'Cancel Training',
    keepTrainingBtn: 'Keep Training',
    cancelBatchTitle: 'Cancel Training Batch',
    cancelBatchDesc: 'Are you sure you want to cancel this training batch?',
    cancelBatchBtn: 'Cancel Batch',
    keepBatchBtn: 'Keep Batch',
    // Empty state
    noBatchesFound: 'No training batches found',
    createFirstBatch: 'Create your first batch',
  },
  ar: {
    // Header
    title: 'دفعات التدريب',
    subtitle: 'إدارة مجموعات التدريب وجدولة برامج الشهادات',
    createBatch: 'إنشاء دفعة',
    // Stats
    totalBatches: 'إجمالي الدفعات',
    scheduled: 'مجدولة',
    inProgress: 'قيد التنفيذ',
    completed: 'مكتملة',
    // Status labels
    statusDraft: 'مسودة',
    statusScheduled: 'مجدولة',
    statusInProgress: 'قيد التنفيذ',
    statusCompleted: 'مكتملة',
    statusCancelled: 'ملغاة',
    // Filters
    searchPlaceholder: 'البحث في الدفعات...',
    allStatus: 'جميع الحالات',
    allTypes: 'جميع الأنواع',
    // Training modes
    modeInPerson: 'حضوري',
    modeOnline: 'عن بُعد',
    modeHybrid: 'هجين',
    // Table
    allBatches: 'جميع الدفعات',
    viewAndManage: 'عرض وإدارة دفعات التدريب',
    batch: 'الدفعة',
    certification: 'الشهادة',
    dates: 'التواريخ',
    trainer: 'المدرب',
    enrollment: 'التسجيل',
    status: 'الحالة',
    actions: 'الإجراءات',
    to: 'إلى',
    exam: 'الامتحان',
    notAssigned: 'غير معين',
    // Actions
    viewDetails: 'عرض التفاصيل',
    edit: 'تعديل',
    viewTrainees: 'عرض المتدربين',
    schedule: 'جدولة',
    startTraining: 'بدء التدريب',
    markCompleted: 'تحديد كمكتمل',
    cancelTraining: 'إلغاء التدريب',
    cancel: 'إلغاء',
    delete: 'حذف',
    // Confirm dialogs
    cancelInProgressTitle: 'إلغاء التدريب الجاري',
    cancelInProgressDesc: 'هل أنت متأكد من إلغاء هذا التدريب الجاري؟ لا يمكن التراجع عن هذا الإجراء.',
    cancelTrainingBtn: 'إلغاء التدريب',
    keepTrainingBtn: 'الإبقاء على التدريب',
    cancelBatchTitle: 'إلغاء دفعة التدريب',
    cancelBatchDesc: 'هل أنت متأكد من إلغاء دفعة التدريب هذه؟',
    cancelBatchBtn: 'إلغاء الدفعة',
    keepBatchBtn: 'الإبقاء على الدفعة',
    // Empty state
    noBatchesFound: 'لم يتم العثور على دفعات تدريب',
    createFirstBatch: 'أنشئ أول دفعة',
  },
};

const STATUS_COLORS: Record<BatchStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const MODE_ICONS: Record<TrainingMode, typeof Monitor> = {
  in_person: MapPin,
  online: Monitor,
  hybrid: Monitor,
};

export default function ECPTrainingBatches() {
  const navigate = useNavigate();
  const { confirmDelete, confirm } = useCommonConfirms();
  const { language } = useLanguage();
  const texts = translations[language];

  // Filters
  const [filters, setFilters] = useState<BatchFilters>({});
  const [search, setSearch] = useState('');

  // Queries
  const { data: batches, isLoading } = useBatches({ ...filters, search });

  // Mutations
  const updateMutation = useUpdateBatch();
  const deleteMutation = useDeleteBatch();

  // Status labels map
  const statusLabels: Record<BatchStatus, string> = {
    draft: texts.statusDraft,
    scheduled: texts.statusScheduled,
    in_progress: texts.statusInProgress,
    completed: texts.statusCompleted,
    cancelled: texts.statusCancelled,
  };

  // Training mode labels
  const modeLabels: Record<TrainingMode, string> = {
    in_person: texts.modeInPerson,
    online: texts.modeOnline,
    hybrid: texts.modeHybrid,
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDelete('this training batch');
    if (!confirmed) return;
    await deleteMutation.mutateAsync(id);
  };

  const handleStatusChange = async (batch: TrainingBatch, status: BatchStatus) => {
    await updateMutation.mutateAsync({
      id: batch.id,
      dto: { status },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={`bg-gradient-to-r ${language === 'ar' ? 'from-navy-800 via-royal-600 to-sky-500' : 'from-sky-500 via-royal-600 to-navy-800'} rounded-lg p-6 text-white`}>
        <div className={`flex items-center justify-between ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
          <div className={language === 'ar' ? 'text-right' : ''}>
            <h1 className={`text-3xl font-bold flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <Calendar className="h-8 w-8" />
              {texts.title}
            </h1>
            <p className="mt-2 opacity-90">
              {texts.subtitle}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/ecp/trainings/new')}
          >
            <PlusCircle className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
            {texts.createBatch}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className={`p-4 ${language === 'ar' ? 'text-right' : ''}`}>
            <div className="text-2xl font-bold">{batches?.length || 0}</div>
            <div className="text-sm text-gray-500">{texts.totalBatches}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={`p-4 ${language === 'ar' ? 'text-right' : ''}`}>
            <div className="text-2xl font-bold text-blue-600">
              {batches?.filter((b) => b.status === 'scheduled').length || 0}
            </div>
            <div className="text-sm text-gray-500">{texts.scheduled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={`p-4 ${language === 'ar' ? 'text-right' : ''}`}>
            <div className="text-2xl font-bold text-yellow-600">
              {batches?.filter((b) => b.status === 'in_progress').length || 0}
            </div>
            <div className="text-sm text-gray-500">{texts.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={`p-4 ${language === 'ar' ? 'text-right' : ''}`}>
            <div className="text-2xl font-bold text-green-600">
              {batches?.filter((b) => b.status === 'completed').length || 0}
            </div>
            <div className="text-sm text-gray-500">{texts.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={`flex flex-col md:flex-row gap-4 ${language === 'ar' ? 'md:flex-row-reverse' : ''}`}>
            <div className="flex-1">
              <div className="relative">
                <Search className={`absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
                <Input
                  placeholder={texts.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={language === 'ar' ? 'pr-10 text-right' : 'pl-10'}
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                />
              </div>
            </div>

            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value === 'all' ? undefined : (value as BatchStatus) })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={texts.allStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{texts.allStatus}</SelectItem>
                <SelectItem value="draft">{texts.statusDraft}</SelectItem>
                <SelectItem value="scheduled">{texts.statusScheduled}</SelectItem>
                <SelectItem value="in_progress">{texts.statusInProgress}</SelectItem>
                <SelectItem value="completed">{texts.statusCompleted}</SelectItem>
                <SelectItem value="cancelled">{texts.statusCancelled}</SelectItem>
              </SelectContent>
            </Select>

          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card>
        <CardHeader className={language === 'ar' ? 'text-right' : ''}>
          <CardTitle>{texts.allBatches}</CardTitle>
          <CardDescription>{texts.viewAndManage}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{texts.batch}</TableHead>
                <TableHead>{texts.dates}</TableHead>
                <TableHead>{texts.trainer}</TableHead>
                <TableHead>{texts.enrollment}</TableHead>
                <TableHead>{texts.status}</TableHead>
                <TableHead>{texts.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches && batches.length > 0 ? (
                batches.map((batch) => {
                  const ModeIcon = MODE_ICONS[batch.training_mode];
                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className={language === 'ar' ? 'text-right' : ''}>
                          <div className="font-medium">{batch.batch_name}</div>
                          <div className="text-sm text-gray-500 font-mono">{batch.batch_code}</div>
                          <div className={`flex items-center gap-1 mt-1 ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                            <ModeIcon className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {modeLabels[batch.training_mode]}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm ${language === 'ar' ? 'text-right' : ''}`}>
                          <div>{formatDate(batch.training_start_date)}</div>
                          <div className="text-gray-500">{texts.to} {formatDate(batch.training_end_date)}</div>
                          {batch.exam_date && (
                            <div className="text-xs text-blue-600 mt-1">
                              {texts.exam}: {formatDate(batch.exam_date)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {batch.trainer ? (
                          <div className={`text-sm ${language === 'ar' ? 'text-right' : ''}`}>
                            {batch.trainer.first_name} {batch.trainer.last_name}
                          </div>
                        ) : (
                          <span className="text-gray-400">{texts.notAssigned}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${language === 'ar' ? 'flex-row-reverse justify-end' : ''}`}>
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>
                            {batch.trainee_count || 0}/{batch.max_capacity}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[batch.status]}>{statusLabels[batch.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={language === 'ar' ? 'start' : 'end'}>
                            <DropdownMenuItem onClick={() => navigate(`/ecp/trainings/${batch.id}`)} className={language === 'ar' ? 'flex-row-reverse' : ''}>
                              <Eye className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                              {texts.viewDetails}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/ecp/trainings/${batch.id}/edit`)} className={language === 'ar' ? 'flex-row-reverse' : ''}>
                              <Edit className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                              {texts.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/ecp/candidates?batch_id=${batch.id}`)
                              }
                              className={language === 'ar' ? 'flex-row-reverse' : ''}
                            >
                              <Users className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                              {texts.viewTrainees}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {batch.status === 'draft' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(batch, 'scheduled')}
                                className={language === 'ar' ? 'flex-row-reverse' : ''}
                              >
                                <Play className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                                {texts.schedule}
                              </DropdownMenuItem>
                            )}
                            {batch.status === 'scheduled' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(batch, 'in_progress')}
                                className={language === 'ar' ? 'flex-row-reverse' : ''}
                              >
                                <Play className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                                {texts.startTraining}
                              </DropdownMenuItem>
                            )}
                            {batch.status === 'in_progress' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(batch, 'completed')}
                                  className={language === 'ar' ? 'flex-row-reverse' : ''}
                                >
                                  <CheckCircle className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                                  {texts.markCompleted}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className={`text-red-600 ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                                  onClick={async () => {
                                    const confirmed = await confirm({
                                      title: texts.cancelInProgressTitle,
                                      description: texts.cancelInProgressDesc,
                                      confirmText: texts.cancelTrainingBtn,
                                      cancelText: texts.keepTrainingBtn,
                                      variant: 'destructive',
                                    });
                                    if (confirmed) {
                                      handleStatusChange(batch, 'cancelled');
                                    }
                                  }}
                                >
                                  <XCircle className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                                  {texts.cancelTraining}
                                </DropdownMenuItem>
                              </>
                            )}
                            {(batch.status === 'draft' || batch.status === 'scheduled') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className={`text-red-600 ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                                  onClick={async () => {
                                    const confirmed = await confirm({
                                      title: texts.cancelBatchTitle,
                                      description: texts.cancelBatchDesc,
                                      confirmText: texts.cancelBatchBtn,
                                      cancelText: texts.keepBatchBtn,
                                      variant: 'destructive',
                                    });
                                    if (confirmed) {
                                      handleStatusChange(batch, 'cancelled');
                                    }
                                  }}
                                >
                                  <XCircle className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                                  {texts.cancel}
                                </DropdownMenuItem>
                              </>
                            )}
                            {batch.status === 'draft' && (
                              <DropdownMenuItem
                                className={`text-red-600 ${language === 'ar' ? 'flex-row-reverse' : ''}`}
                                onClick={() => handleDelete(batch.id)}
                              >
                                <Trash2 className={`h-4 w-4 ${language === 'ar' ? 'ml-2' : 'mr-2'}`} />
                                {texts.delete}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                    <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>{texts.noBatchesFound}</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => navigate('/ecp/trainings/new')}
                    >
                      {texts.createFirstBatch}
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
