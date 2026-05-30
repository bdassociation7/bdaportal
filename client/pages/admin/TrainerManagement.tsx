/**
 * Trainer Management Admin Page
 *
 * Admin dashboard for managing ECP trainers across all partners
 * Requirements: Admin Panel - Trainer Management
 */

import { useState } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Award,
  GraduationCap,
  Mail,
  Phone,
  Linkedin,
  Calendar,
  Building,
  TrendingUp,
  X,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/config/supabase.config';
import type {
  Trainer,
  TrainerStatus,
  CertificationType,
} from '@/entities/ecp/ecp.types';

// ============================================================================
// Types
// ============================================================================

type TabType = 'overview' | 'trainers' | 'pending';

interface TrainerWithPartner extends Trainer {
  partner?: {
    id: string;
    organization_name?: string;
    email?: string;
  };
}

// ============================================================================
// Hooks
// ============================================================================

function useAllTrainers(filters?: { status?: TrainerStatus; certification?: CertificationType; search?: string }) {
  return useQuery({
    queryKey: ['admin', 'trainers', filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('ecp_trainers')
        .select(`
          *,
          partner:partner_id(id, organisation_name:raw_user_meta_data->organisation_name, email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.certification) {
        query = query.contains('certifications', [filters.certification]);
      }
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Add full_name to each trainer
      return (data || []).map((t: any) => ({
        ...t,
        full_name: `${t.first_name} ${t.last_name}`,
      })) as TrainerWithPartner[];
    },
    staleTime: 30 * 1000,
  });
}

function useTrainerStats() {
  return useQuery({
    queryKey: ['admin', 'trainer-stats'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ecp_trainers')
        .select('status, certifications');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        approved: data?.filter((t: any) => t.status === 'approved').length || 0,
        pending: data?.filter((t: any) => t.status === 'pending').length || 0,
        suspended: data?.filter((t: any) => t.status === 'suspended').length || 0,
        inactive: data?.filter((t: any) => t.status === 'inactive').length || 0,
        cp_certified: data?.filter((t: any) => t.certifications?.includes('CP')).length || 0,
        scp_certified: data?.filter((t: any) => t.certifications?.includes('SCP')).length || 0,
      };

      return stats;
    },
    staleTime: 60 * 1000,
  });
}

// ============================================================================
// Component
// ============================================================================

export default function TrainerManagement() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [statusFilter, setStatusFilter] = useState<TrainerStatus | 'all'>('all');
  const [certificationFilter, setCertificationFilter] = useState<CertificationType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerWithPartner | null>(null);

  // Data
  const { data: trainers, isLoading: trainersLoading } = useAllTrainers({
    status: statusFilter === 'all' ? undefined : statusFilter,
    certification: certificationFilter === 'all' ? undefined : certificationFilter,
    search: searchQuery || undefined,
  });
  const { data: stats, isLoading: statsLoading } = useTrainerStats();

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TrainerStatus }) => {
      const { error } = await (supabase as any)
        .from('ecp_trainers')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trainers'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'trainer-stats'] });
      setSelectedTrainer(null);
    },
  });

  // Filter trainers by search
  const filteredTrainers = trainers?.filter(trainer => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      trainer.first_name?.toLowerCase().includes(search) ||
      trainer.last_name?.toLowerCase().includes(search) ||
      trainer.email?.toLowerCase().includes(search) ||
      trainer.partner?.organization_name?.toLowerCase().includes(search)
    );
  });

  // Pending trainers
  const pendingTrainers = trainers?.filter(t => t.status === 'pending') || [];

  // Status badge component
  const StatusBadge = ({ status }: { status: TrainerStatus }) => {
    const styles: Record<TrainerStatus, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      suspended: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', icon: UserX },
    };

    const style = styles[status] || styles.pending;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Certification badge
  const CertificationBadge = ({ type }: { type: CertificationType }) => {
    const styles = {
      CP: 'bg-blue-100 text-blue-800',
      SCP: 'bg-purple-100 text-purple-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type]}`}>
        {type}
      </span>
    );
  };

  // Render Overview Tab
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{isRTL ? 'إجمالي المدربين' : 'Total Trainers'}</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{isRTL ? 'معتمد' : 'Approved'}</p>
              <p className="text-2xl font-bold text-green-600">{stats?.approved || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{isRTL ? 'قيد الانتظار' : 'Pending'}</p>
              <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{isRTL ? 'موقوف' : 'Suspended'}</p>
              <p className="text-2xl font-bold text-red-600">{stats?.suspended || 0}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Certification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-4">{isRTL ? 'حسب الشهادة' : 'By Certification'}</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-blue-600" />
                <span className="font-medium">{isRTL ? 'مهني معتمد (CP)' : 'Certified Professional (CP)'}</span>
              </div>
              <span className="text-xl font-bold text-blue-600">{stats?.cp_certified || 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-purple-600" />
                <span className="font-medium">{isRTL ? 'كبير المهنيين المعتمدين (SCP)' : 'Senior Certified Professional (SCP)'}</span>
              </div>
              <span className="text-xl font-bold text-purple-600">{stats?.scp_certified || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-4">{isRTL ? 'إجراءات سريعة' : 'Quick Actions'}</h3>
          <div className="space-y-3">
            {pendingTrainers.length > 0 && (
              <button
                onClick={() => setActiveTab('pending')}
                className="w-full flex items-center justify-between p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    {isRTL ? `${pendingTrainers.length} مدرب بحاجة للموافقة` : `${pendingTrainers.length} trainers awaiting approval`}
                  </span>
                </div>
                <span className="text-yellow-600">&rarr;</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('trainers')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="font-medium">{isRTL ? 'عرض جميع المدربين' : 'View All Trainers'}</span>
              </div>
              <span className="text-gray-600">&rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Trainers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold mb-4">{isRTL ? 'المدربين الجدد' : 'Recent Trainers'}</h3>
        {trainersLoading ? (
          <div className="text-center py-8 text-gray-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className={`py-3 ${isRTL ? 'text-right' : 'text-left'} text-sm font-medium text-gray-500`}>
                    {isRTL ? 'المدرب' : 'Trainer'}
                  </th>
                  <th className={`py-3 ${isRTL ? 'text-right' : 'text-left'} text-sm font-medium text-gray-500`}>
                    {isRTL ? 'الشريك' : 'Partner'}
                  </th>
                  <th className={`py-3 ${isRTL ? 'text-right' : 'text-left'} text-sm font-medium text-gray-500`}>
                    {isRTL ? 'الشهادات' : 'Certifications'}
                  </th>
                  <th className={`py-3 ${isRTL ? 'text-right' : 'text-left'} text-sm font-medium text-gray-500`}>
                    {isRTL ? 'الحالة' : 'Status'}
                  </th>
                  <th className={`py-3 ${isRTL ? 'text-right' : 'text-left'} text-sm font-medium text-gray-500`}>
                    {isRTL ? 'التاريخ' : 'Date'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {trainers?.slice(0, 5).map((trainer) => (
                  <tr key={trainer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3">
                      <div>
                        <p className="font-medium">{trainer.full_name}</p>
                        <p className="text-sm text-gray-500">{trainer.email}</p>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-sm text-gray-600">
                        {trainer.partner?.organization_name || '-'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {trainer.certifications?.map((cert) => (
                          <CertificationBadge key={cert} type={cert} />
                        ))}
                      </div>
                    </td>
                    <td className="py-3">
                      <StatusBadge status={trainer.status} />
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(trainer.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // Render Trainers Tab
  const renderTrainers = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5`} />
              <input
                type="text"
                placeholder={isRTL ? 'بحث عن مدرب...' : 'Search trainers...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TrainerStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{isRTL ? 'جميع الحالات' : 'All Status'}</option>
              <option value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
              <option value="approved">{isRTL ? 'معتمد' : 'Approved'}</option>
              <option value="suspended">{isRTL ? 'موقوف' : 'Suspended'}</option>
              <option value="inactive">{isRTL ? 'غير نشط' : 'Inactive'}</option>
            </select>

            <select
              value={certificationFilter}
              onChange={(e) => setCertificationFilter(e.target.value as CertificationType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{isRTL ? 'جميع الشهادات' : 'All Certifications'}</option>
              <option value="CP">CP</option>
              <option value="SCP">SCP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trainers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {trainersLoading ? (
          <div className="text-center py-12 text-gray-500">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>
        ) : filteredTrainers?.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{isRTL ? 'لا يوجد مدربين' : 'No trainers found'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {isRTL ? 'المدرب' : 'Trainer'}
                  </th>
                  <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {isRTL ? 'الشريك' : 'Partner'}
                  </th>
                  <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {isRTL ? 'الشهادات' : 'Certifications'}
                  </th>
                  <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {isRTL ? 'الحالة' : 'Status'}
                  </th>
                  <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {isRTL ? 'تاريخ الإنشاء' : 'Created'}
                  </th>
                  <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                    {isRTL ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTrainers?.map((trainer) => (
                  <tr key={trainer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          {trainer.photo_url ? (
                            <img
                              src={trainer.photo_url}
                              alt={trainer.full_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-blue-600 font-medium">
                              {trainer.first_name?.[0]}{trainer.last_name?.[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{trainer.full_name}</p>
                          <p className="text-sm text-gray-500">{trainer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900">{trainer.partner?.organization_name || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {trainer.certifications?.map((cert) => (
                          <CertificationBadge key={cert} type={cert} />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={trainer.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(trainer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTrainer(trainer)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title={isRTL ? 'عرض' : 'View'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // Render Pending Tab
  const renderPending = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
        <p className="text-yellow-800">
          {isRTL
            ? `يوجد ${pendingTrainers.length} مدرب بانتظار الموافقة`
            : `${pendingTrainers.length} trainer(s) awaiting approval`}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {pendingTrainers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p>{isRTL ? 'لا يوجد مدربين بانتظار الموافقة' : 'No pending trainers'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pendingTrainers.map((trainer) => (
              <div key={trainer.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                      <span className="text-yellow-600 font-medium text-lg">
                        {trainer.first_name?.[0]}{trainer.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{trainer.full_name}</h3>
                      <p className="text-gray-500">{trainer.email}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {isRTL ? 'الشريك: ' : 'Partner: '}
                        {trainer.partner?.organization_name || '-'}
                      </p>
                      <div className="flex gap-1 mt-2">
                        {trainer.certifications?.map((cert) => (
                          <CertificationBadge key={cert} type={cert} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: trainer.id, status: 'approved' })}
                      disabled={updateStatusMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isRTL ? 'موافقة' : 'Approve'}
                    </button>
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: trainer.id, status: 'suspended' })}
                      disabled={updateStatusMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      {isRTL ? 'رفض' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Trainer Detail Modal
  const TrainerDetailModal = () => {
    if (!selectedTrainer) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">{isRTL ? 'تفاصيل المدرب' : 'Trainer Details'}</h2>
            <button
              onClick={() => setSelectedTrainer(null)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                {selectedTrainer.photo_url ? (
                  <img
                    src={selectedTrainer.photo_url}
                    alt={selectedTrainer.full_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-blue-600 font-medium text-2xl">
                    {selectedTrainer.first_name?.[0]}{selectedTrainer.last_name?.[0]}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{selectedTrainer.full_name}</h3>
                <p className="text-gray-500">{selectedTrainer.trainer_code || 'No code assigned'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={selectedTrainer.status} />
                  {selectedTrainer.certifications?.map((cert) => (
                    <CertificationBadge key={cert} type={cert} />
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'البريد الإلكتروني' : 'Email'}</p>
                  <p className="font-medium">{selectedTrainer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'الهاتف' : 'Phone'}</p>
                  <p className="font-medium">{selectedTrainer.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Building className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">{isRTL ? 'الشريك' : 'Partner'}</p>
                  <p className="font-medium">{selectedTrainer.partner?.organization_name || '-'}</p>
                </div>
              </div>
              {selectedTrainer.linkedin_url && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Linkedin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">LinkedIn</p>
                    <a
                      href={selectedTrainer.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {isRTL ? 'عرض الملف الشخصي' : 'View Profile'}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Certification Dates */}
            {(selectedTrainer.trainer_certification_date || selectedTrainer.trainer_certification_expiry) && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium mb-3">{isRTL ? 'تواريخ الشهادة' : 'Certification Dates'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTrainer.trainer_certification_date && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-green-600">{isRTL ? 'تاريخ الإصدار' : 'Issued Date'}</p>
                        <p className="font-medium">{new Date(selectedTrainer.trainer_certification_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  {selectedTrainer.trainer_certification_expiry && (
                    <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="text-xs text-orange-600">{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</p>
                        <p className="font-medium">{new Date(selectedTrainer.trainer_certification_expiry).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bio */}
            {selectedTrainer.bio && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium mb-2">{isRTL ? 'نبذة' : 'Bio'}</h4>
                <p className="text-gray-600">{selectedTrainer.bio}</p>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-gray-200 pt-4 flex gap-3">
              {selectedTrainer.status === 'pending' && (
                <>
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: selectedTrainer.id, status: 'approved' })}
                    disabled={updateStatusMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isRTL ? 'موافقة' : 'Approve'}
                  </button>
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: selectedTrainer.id, status: 'suspended' })}
                    disabled={updateStatusMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    {isRTL ? 'رفض' : 'Reject'}
                  </button>
                </>
              )}
              {selectedTrainer.status === 'approved' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: selectedTrainer.id, status: 'suspended' })}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  {isRTL ? 'إيقاف' : 'Suspend'}
                </button>
              )}
              {selectedTrainer.status === 'suspended' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: selectedTrainer.id, status: 'approved' })}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isRTL ? 'إعادة التفعيل' : 'Reactivate'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {isRTL ? 'إدارة المدربين' : 'Trainer Management'}
          </h1>
          <p className="mt-1 text-gray-500">
            {isRTL ? 'عرض وإدارة مدربي الشركاء' : 'View and manage partner trainers'}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-4">
            {[
              { key: 'overview' as TabType, label: isRTL ? 'نظرة عامة' : 'Overview', icon: TrendingUp },
              { key: 'trainers' as TabType, label: isRTL ? 'المدربين' : 'Trainers', icon: Users },
              { key: 'pending' as TabType, label: isRTL ? 'قيد الانتظار' : 'Pending', icon: Clock, badge: pendingTrainers.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'trainers' && renderTrainers()}
        {activeTab === 'pending' && renderPending()}

        {/* Trainer Detail Modal */}
        <TrainerDetailModal />
      </div>
    </div>
  );
}
