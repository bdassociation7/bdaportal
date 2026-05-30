/**
 * Training Batch Management Page (US12-13)
 * Admin view for managing ECP training batches and creating trainee accounts
 */

import { useState } from 'react';
import {
  Users,
  GraduationCap,
  Calendar,
  Monitor,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  UserPlus,
  Building,
  RefreshCw,
  Eye,
  X,
  FileText,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { format } from 'date-fns';
import {
  useAdminBatches,
  useAdminBatch,
  useBatchTrainees,
  useAdminBatchStats,
  useECPPartners,
  useReviewBatch,
  useCreateTraineeAccounts,
  useCreateSingleTraineeAccount,
  BATCH_STATUS_INFO,
  ENROLLMENT_STATUS_INFO,
  TRAINING_MODE_INFO,
  type AdminTrainingBatch,
  type AdminTrainee,
  type AdminBatchFilters,
  type BatchStatus,
} from '@/entities/admin-training-batches';
import type { CertificationType } from '@/entities/ecp/ecp.types';

export default function TrainingBatchManagement() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  // Filters
  const [filters, setFilters] = useState<AdminBatchFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Selected batch for details
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showCreateAccountsModal, setShowCreateAccountsModal] = useState(false);

  // Queries
  const { data: batches, isLoading, refetch } = useAdminBatches({
    ...filters,
    search: searchQuery || undefined,
  });
  const { data: stats } = useAdminBatchStats();
  const { data: partners } = useECPPartners();
  const { data: selectedBatch } = useAdminBatch(selectedBatchId || undefined);
  const { data: batchTrainees } = useBatchTrainees(selectedBatchId || undefined);

  // Mutations
  const reviewBatch = useReviewBatch();
  const createAccounts = useCreateTraineeAccounts();
  const createSingleAccount = useCreateSingleTraineeAccount();

  // Create accounts form state
  const [accountOptions, setAccountOptions] = useState({
    send_welcome_email: true,
    activate_membership: false,
    membership_type: 'basic' as 'basic' | 'professional',
    grant_curriculum_access: true,
  });

  const handleApprove = async (batchId: string, createAccounts?: boolean) => {
    await reviewBatch.mutateAsync({
      batch_id: batchId,
      action: 'approve',
      create_trainee_accounts: createAccounts,
    });
    setShowBatchModal(false);
  };

  const handleReject = async (batchId: string, notes?: string) => {
    await reviewBatch.mutateAsync({
      batch_id: batchId,
      action: 'reject',
      notes,
    });
    setShowBatchModal(false);
  };

  const handleCreateAccounts = async () => {
    if (!selectedBatchId) return;
    await createAccounts.mutateAsync({
      batch_id: selectedBatchId,
      ...accountOptions,
    });
    setShowCreateAccountsModal(false);
  };

  const handleCreateSingleAccount = async (traineeId: string) => {
    await createSingleAccount.mutateAsync({
      traineeId,
      options: accountOptions,
    });
  };

  const getStatusIcon = (status: BatchStatus) => {
    switch (status) {
      case 'draft':
        return <FileText className="w-4 h-4" />;
      case 'scheduled':
        return <Calendar className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: BatchStatus) => {
    const info = BATCH_STATUS_INFO[status];
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return colorMap[info?.color] || colorMap.gray;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isRTL ? 'إدارة دفعات التدريب' : 'Training Batch Management'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {isRTL
                  ? 'إدارة دفعات تدريب شركاء الاعتماد الحصري وإنشاء حسابات المتدربين'
                  : 'Manage ECP training batches and create trainee accounts'}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {isRTL ? 'تحديث' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_batches}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'إجمالي الدفعات' : 'Total Batches'}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending_review}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'بانتظار المراجعة' : 'Pending Review'}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'مكتملة' : 'Completed'}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_trainees}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'إجمالي المتدربين' : 'Total Trainees'}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.accounts_created}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'حسابات منشأة' : 'Accounts Created'}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.average_pass_rate !== undefined ? `${stats.average_pass_rate}%` : '-'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{isRTL ? 'معدل النجاح' : 'Pass Rate'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRTL ? 'البحث عن اسم الدفعة أو الكود...' : 'Search by batch name or code...'}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  showFilters
                    ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Filter className="w-4 h-4" />
                {isRTL ? 'فلاتر' : 'Filters'}
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isRTL ? 'الحالة' : 'Status'}
                  </label>
                  <select
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as BatchStatus || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{isRTL ? 'الكل' : 'All'}</option>
                    {Object.entries(BATCH_STATUS_INFO).map(([key, info]) => (
                      <option key={key} value={key}>
                        {isRTL ? info.labelAr : info.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Certification Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isRTL ? 'نوع الشهادة' : 'Certification Type'}
                  </label>
                  <select
                    value={filters.certification_type || ''}
                    onChange={(e) => setFilters({ ...filters, certification_type: e.target.value as CertificationType || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{isRTL ? 'الكل' : 'All'}</option>
                    <option value="CP">BDA-CP</option>
                    <option value="SCP">BDA-SCP</option>
                  </select>
                </div>

                {/* Partner Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {isRTL ? 'الشريك' : 'Partner'}
                  </label>
                  <select
                    value={filters.partner_id || ''}
                    onChange={(e) => setFilters({ ...filters, partner_id: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{isRTL ? 'كل الشركاء' : 'All Partners'}</option>
                    {partners?.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.company || partner.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFilters({});
                      setSearchQuery('');
                    }}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Batches Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : !batches || batches.length === 0 ? (
            <div className="p-8 text-center">
              <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {isRTL ? 'لا توجد دفعات تدريب' : 'No training batches found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isRTL ? 'الدفعة' : 'Batch'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isRTL ? 'الشريك' : 'Partner'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isRTL ? 'الشهادة' : 'Cert'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isRTL ? 'التواريخ' : 'Dates'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isRTL ? 'المتدربون' : 'Trainees'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isRTL ? 'الحالة' : 'Status'}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isRTL ? 'الإجراءات' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {isRTL && batch.batch_name_ar ? batch.batch_name_ar : batch.batch_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{batch.batch_code}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {batch.partner?.company_name || `${batch.partner?.first_name} ${batch.partner?.last_name}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          batch.certification_type === 'SCP'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          BDA-{batch.certification_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(batch.training_start_date), 'MMM d')} - {format(new Date(batch.training_end_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 mt-1">
                          <Monitor className="w-4 h-4" />
                          <span>{TRAINING_MODE_INFO[batch.training_mode]?.[isRTL ? 'labelAr' : 'label']}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900 dark:text-white">{batch.trainee_count || 0}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-gray-500 dark:text-gray-400">{batch.max_capacity}</span>
                        </div>
                        {(batch.certified_count || 0) > 0 && (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm mt-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>{batch.certified_count} {isRTL ? 'معتمد' : 'certified'}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                          {getStatusIcon(batch.status)}
                          {BATCH_STATUS_INFO[batch.status]?.[isRTL ? 'labelAr' : 'label']}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedBatchId(batch.id);
                            setShowBatchModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          {isRTL ? 'عرض' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Batch Details Modal */}
      {showBatchModal && selectedBatch && (
        <div className="fixed inset-0 z-50 overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowBatchModal(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full mx-auto overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {isRTL && selectedBatch.batch_name_ar ? selectedBatch.batch_name_ar : selectedBatch.batch_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedBatch.batch_code}</p>
                  </div>
                  <button
                    onClick={() => setShowBatchModal(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                {/* Batch Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'الشريك' : 'Partner'}</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedBatch.partner?.company_name || `${selectedBatch.partner?.first_name} ${selectedBatch.partner?.last_name}`}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'الشهادة' : 'Certification'}</p>
                    <p className="font-medium text-gray-900 dark:text-white">BDA-{selectedBatch.certification_type}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'التواريخ' : 'Dates'}</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {format(new Date(selectedBatch.training_start_date), 'MMM d')} - {format(new Date(selectedBatch.training_end_date), 'MMM d')}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isRTL ? 'نوع التدريب' : 'Mode'}</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {TRAINING_MODE_INFO[selectedBatch.training_mode]?.[isRTL ? 'labelAr' : 'label']}
                    </p>
                  </div>
                </div>

                {/* Trainees List */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {isRTL ? 'المتدربون' : 'Trainees'} ({batchTrainees?.length || 0})
                    </h4>
                    {(batchTrainees?.filter(t => !t.user_id).length || 0) > 0 && (
                      <button
                        onClick={() => {
                          setShowBatchModal(false);
                          setShowCreateAccountsModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                        {isRTL ? 'إنشاء حسابات' : 'Create Accounts'}
                      </button>
                    )}
                  </div>

                  {batchTrainees && batchTrainees.length > 0 ? (
                    <div className="space-y-2">
                      {batchTrainees.map((trainee) => (
                        <div
                          key={trainee.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {trainee.first_name[0]}{trainee.last_name[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{trainee.full_name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{trainee.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              ENROLLMENT_STATUS_INFO[trainee.enrolment_status]?.color === 'green'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : ENROLLMENT_STATUS_INFO[trainee.enrolment_status]?.color === 'yellow'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : ENROLLMENT_STATUS_INFO[trainee.enrolment_status]?.color === 'blue'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : ENROLLMENT_STATUS_INFO[trainee.enrolment_status]?.color === 'red'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {ENROLLMENT_STATUS_INFO[trainee.enrollment_status]?.[isRTL ? 'labelAr' : 'label']}
                            </span>
                            {trainee.user_id ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="w-3 h-3" />
                                {isRTL ? 'حساب موجود' : 'Has Account'}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleCreateSingleAccount(trainee.id)}
                                disabled={createSingleAccount.isPending}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                              >
                                <UserPlus className="w-3 h-3" />
                                {isRTL ? 'إنشاء حساب' : 'Create Account'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                      {isRTL ? 'لا يوجد متدربون في هذه الدفعة' : 'No trainees in this batch'}
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(selectedBatch.status)}`}>
                    {getStatusIcon(selectedBatch.status)}
                    {BATCH_STATUS_INFO[selectedBatch.status]?.[isRTL ? 'labelAr' : 'label']}
                  </span>
                  <div className="flex gap-3">
                    {selectedBatch.status === 'draft' && (
                      <>
                        <button
                          onClick={() => handleReject(selectedBatch.id)}
                          disabled={reviewBatch.isPending}
                          className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          {isRTL ? 'رفض' : 'Reject'}
                        </button>
                        <button
                          onClick={() => handleApprove(selectedBatch.id, true)}
                          disabled={reviewBatch.isPending}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {isRTL ? 'موافقة وإنشاء حسابات' : 'Approve & Create Accounts'}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowBatchModal(false)}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {isRTL ? 'إغلاق' : 'Close'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Accounts Modal */}
      {showCreateAccountsModal && selectedBatchId && (
        <div className="fixed inset-0 z-50 overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => setShowCreateAccountsModal(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full mx-auto overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isRTL ? 'إنشاء حسابات المتدربين' : 'Create Trainee Accounts'}
                </h3>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {isRTL
                    ? 'سيتم إنشاء حسابات لجميع المتدربين الذين ليس لديهم حسابات بعد.'
                    : 'Accounts will be created for all trainees who don\'t have accounts yet.'}
                </p>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={accountOptions.send_welcome_email}
                      onChange={(e) => setAccountOptions({ ...accountOptions, send_welcome_email: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      {isRTL ? 'إرسال بريد ترحيبي' : 'Send welcome email'}
                    </span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={accountOptions.grant_curriculum_access}
                      onChange={(e) => setAccountOptions({ ...accountOptions, grant_curriculum_access: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      {isRTL ? 'منح الوصول للمحتوى التعليمي' : 'Grant curriculum access'}
                    </span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={accountOptions.activate_membership}
                      onChange={(e) => setAccountOptions({ ...accountOptions, activate_membership: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      {isRTL ? 'تفعيل العضوية' : 'Activate membership'}
                    </span>
                  </label>
                  {accountOptions.activate_membership && (
                    <div className="ml-7">
                      <select
                        value={accountOptions.membership_type}
                        onChange={(e) => setAccountOptions({ ...accountOptions, membership_type: e.target.value as 'basic' | 'professional' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="basic">{isRTL ? 'عضوية أساسية' : 'Basic Membership'}</option>
                        <option value="professional">{isRTL ? 'عضوية احترافية' : 'Professional Membership'}</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateAccountsModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={handleCreateAccounts}
                  disabled={createAccounts.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {createAccounts.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {isRTL ? 'جاري الإنشاء...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      {isRTL ? 'إنشاء الحسابات' : 'Create Accounts'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
