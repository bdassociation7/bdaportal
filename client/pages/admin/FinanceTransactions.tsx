/**
 * Finance & Transactions Admin Page
 *
 * Admin dashboard for managing WooCommerce orders, vouchers, and financial data
 * Requirements: Admin Panel - Finance Overview
 */

import { useState } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Ticket,
  TrendingUp,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  CreditCard,
  Calendar,
  User,
  Package,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWooCommerceOrders } from '@/entities/woocommerce';
import { useQuery } from '@tanstack/react-query';
import { VoucherService } from '@/entities/quiz/voucher.service';

// ============================================================================
// Types
// ============================================================================

type TabType = 'overview' | 'orders' | 'vouchers' | 'revenue';
type OrderStatus = 'all' | 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';

// ============================================================================
// Hooks
// ============================================================================

function useVoucherStats() {
  return useQuery({
    queryKey: ['admin', 'voucher-stats'],
    queryFn: async () => {
      const result = await VoucherService.getVoucherStats();
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ============================================================================
// Component
// ============================================================================

export default function FinanceTransactions() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  // State
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus>('completed'); // Default to completed
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // Data - Fetch orders based on filter (completed by default)
  const { data: orders, isLoading: ordersLoading, refetch: refetchOrders } = useWooCommerceOrders({
    status: orderStatusFilter === 'all' ? undefined : orderStatusFilter,
    limit: 50,
  });

  // Also fetch all completed orders separately for accurate revenue calculation
  const { data: completedOrders } = useWooCommerceOrders({
    status: 'completed',
    limit: 100,
  });

  const { data: voucherStats, isLoading: statsLoading } = useVoucherStats();

  // Computed stats - Revenue calculated ONLY from completed orders
  const orderStats = {
    total: orders?.length || 0,
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    processing: orders?.filter(o => o.status === 'processing').length || 0,
    completed: orders?.filter(o => o.status === 'completed').length || 0,
    cancelled: orders?.filter(o => o.status === 'cancelled' || o.status === 'refunded').length || 0,
    // Revenue is ONLY from completed orders
    totalRevenue: completedOrders?.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0) || 0,
    completedOrdersCount: completedOrders?.length || 0,
  };

  // Filter orders by search
  const filteredOrders = orders?.filter(order => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(search) ||
      order.customer?.email?.toLowerCase().includes(search) ||
      order.customer?.first_name?.toLowerCase().includes(search) ||
      order.customer?.last_name?.toLowerCase().includes(search)
    );
  });

  // Status labels for translation
  const statusLabels: Record<string, { en: string; ar: string }> = {
    pending: { en: 'Pending', ar: 'معلق' },
    processing: { en: 'Processing', ar: 'قيد المعالجة' },
    'on-hold': { en: 'On Hold', ar: 'في الانتظار' },
    completed: { en: 'Completed', ar: 'مكتمل' },
    cancelled: { en: 'Cancelled', ar: 'ملغي' },
    refunded: { en: 'Refunded', ar: 'مسترد' },
    failed: { en: 'Failed', ar: 'فشل' },
    unused: { en: 'Unused', ar: 'غير مستخدم' },
    used: { en: 'Used', ar: 'مستخدم' },
    expired: { en: 'Expired', ar: 'منتهي الصلاحية' },
    revoked: { en: 'Revoked', ar: 'ملغى' },
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      'on-hold': 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-purple-100 text-purple-800',
      failed: 'bg-gray-100 text-gray-800',
      unused: 'bg-green-100 text-green-800',
      used: 'bg-blue-100 text-blue-800',
      expired: 'bg-gray-100 text-gray-800',
      revoked: 'bg-red-100 text-red-800',
    };

    const label = statusLabels[status]?.[language] || status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {label}
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
              <p className="text-sm text-gray-500 mb-1">{isRTL ? 'إيرادات الطلبات المكتملة' : 'Completed Orders Revenue'}</p>
              <p className="text-2xl font-bold text-gray-900">
                ${orderStats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">{isRTL ? 'الطلبات المدفوعة فقط' : 'Paid orders only'}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{isRTL ? 'الطلبات المكتملة' : 'Completed Orders'}</p>
              <p className="text-2xl font-bold text-gray-900">{orderStats.completedOrdersCount}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-green-600">{orderStats.completed} {isRTL ? 'مكتمل' : 'completed'}</span>
            <span className="text-gray-400">|</span>
            <span className="text-yellow-600">{orderStats.pending} {isRTL ? 'معلق' : 'pending'}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{isRTL ? 'إجمالي القسائم' : 'Total Vouchers'}</p>
              <p className="text-2xl font-bold text-gray-900">{voucherStats?.total || 0}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Ticket className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-green-600">{voucherStats?.unused || 0} {isRTL ? 'متاح' : 'available'}</span>
            <span className="text-gray-400">|</span>
            <span className="text-blue-600">{voucherStats?.used || 0} {isRTL ? 'مستخدم' : 'used'}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{isRTL ? 'معدل الإتمام' : 'Completion Rate'}</p>
              <p className="text-2xl font-bold text-gray-900">
                {orderStats.total > 0 ? Math.round((orderStats.completed / orderStats.total) * 100) : 0}%
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-600">{orderStats.completed} / {orderStats.total} {isRTL ? 'طلبات' : 'orders'}</span>
          </div>
        </div>
      </div>

      {/* Order Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isRTL ? 'توزيع حالة الطلبات' : 'Order Status Distribution'}
          </h3>
          <div className="space-y-4">
            {[
              { status: 'completed', label: isRTL ? 'مكتمل' : 'Completed', count: orderStats.completed, color: 'bg-green-500' },
              { status: 'processing', label: isRTL ? 'قيد المعالجة' : 'Processing', count: orderStats.processing, color: 'bg-blue-500' },
              { status: 'pending', label: isRTL ? 'معلق' : 'Pending', count: orderStats.pending, color: 'bg-yellow-500' },
              { status: 'cancelled', label: isRTL ? 'ملغي/مسترد' : 'Cancelled/Refunded', count: orderStats.cancelled, color: 'bg-red-500' },
            ].map(item => (
              <div key={item.status} className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-600">{item.label}</div>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} transition-all duration-300`}
                    style={{ width: `${orderStats.total > 0 ? (item.count / orderStats.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="w-12 text-sm font-medium text-gray-900 text-right">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isRTL ? 'توزيع حالة القسائم' : 'Voucher Status Distribution'}
          </h3>
          <div className="space-y-4">
            {[
              { status: 'available', label: isRTL ? 'متاح' : 'Available', count: voucherStats?.available || 0, color: 'bg-green-500' },
              { status: 'assigned', label: isRTL ? 'مخصص' : 'Assigned', count: voucherStats?.assigned || 0, color: 'bg-yellow-500' },
              { status: 'used', label: isRTL ? 'مستخدم' : 'Used', count: voucherStats?.used || 0, color: 'bg-blue-500' },
              { status: 'expired', label: isRTL ? 'منتهي الصلاحية' : 'Expired', count: voucherStats?.expired || 0, color: 'bg-gray-500' },
              { status: 'cancelled', label: isRTL ? 'ملغي' : 'Cancelled', count: voucherStats?.cancelled || 0, color: 'bg-red-500' },
            ].map(item => (
              <div key={item.status} className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-600">{item.label}</div>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} transition-all duration-300`}
                    style={{ width: `${(voucherStats?.total || 0) > 0 ? (item.count / (voucherStats?.total || 1)) * 100 : 0}%` }}
                  />
                </div>
                <div className="w-12 text-sm font-medium text-gray-900 text-right">{item.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isRTL ? 'أحدث الطلبات' : 'Recent Orders'}
          </h3>
          <button
            onClick={() => setActiveTab('orders')}
            className="text-sm text-royal-600 hover:text-royal-700"
          >
            {isRTL ? 'عرض الكل' : 'View All'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  {isRTL ? 'رقم الطلب' : 'Order #'}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  {isRTL ? 'العميل' : 'Customer'}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  {isRTL ? 'المبلغ' : 'Amount'}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  {isRTL ? 'الحالة' : 'Status'}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  {isRTL ? 'التاريخ' : 'Date'}
                </th>
              </tr>
            </thead>
            <tbody>
              {orders?.slice(0, 5).map((order) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">#{order.order_number}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {order.customer?.first_name} {order.customer?.last_name}
                    <br />
                    <span className="text-xs text-gray-400">{order.customer?.email}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {order.currency} {parseFloat(order.total).toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-sm">
                    {new Date(order.date_created).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    {isRTL ? 'لا توجد طلبات' : 'No orders found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Render Orders Tab
  const renderOrders = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={isRTL ? 'بحث بالرقم أو البريد الإلكتروني...' : 'Search by order # or email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-royal-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value as OrderStatus)}
              className="border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-royal-500"
            >
              <option value="all">{isRTL ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="pending">{isRTL ? 'معلق' : 'Pending'}</option>
              <option value="processing">{isRTL ? 'قيد المعالجة' : 'Processing'}</option>
              <option value="completed">{isRTL ? 'مكتمل' : 'Completed'}</option>
              <option value="cancelled">{isRTL ? 'ملغي' : 'Cancelled'}</option>
              <option value="refunded">{isRTL ? 'مسترد' : 'Refunded'}</option>
            </select>
            <button
              onClick={() => refetchOrders()}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title={isRTL ? 'تحديث' : 'Refresh'}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {ordersLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-royal-600 mx-auto mb-2" />
            <p className="text-gray-500">{isRTL ? 'جاري التحميل...' : 'Loading orders...'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'رقم الطلب' : 'Order #'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'العميل' : 'Customer'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'المنتجات' : 'Products'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'المبلغ' : 'Amount'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'الحالة' : 'Status'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'القسائم' : 'Vouchers'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'التاريخ' : 'Date'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    {isRTL ? 'إجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders?.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">#{order.order_number}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {order.customer?.first_name} {order.customer?.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{order.customer?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{order.items?.length || 0} {isRTL ? 'منتج' : 'items'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900">
                        {order.currency} {parseFloat(order.total).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4">
                      {order.vouchers_generated ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs">{isRTL ? 'تم الإنشاء' : 'Generated'}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">{isRTL ? 'معلق' : 'Pending'}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(order.date_created).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-gray-600 hover:text-royal-600 hover:bg-royal-50 rounded-lg"
                        title={isRTL ? 'عرض التفاصيل' : 'View Details'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!filteredOrders || filteredOrders.length === 0) && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>{isRTL ? 'لا توجد طلبات' : 'No orders found'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isRTL ? 'تفاصيل الطلب' : 'Order Details'} #{selectedOrder.order_number}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">
                  {isRTL ? 'معلومات العميل' : 'Customer Information'}
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-900">
                    {selectedOrder.customer?.first_name} {selectedOrder.customer?.last_name}
                  </p>
                  <p className="text-sm text-gray-600">{selectedOrder.customer?.email}</p>
                  {selectedOrder.customer?.phone && (
                    <p className="text-sm text-gray-600">{selectedOrder.customer.phone}</p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">
                  {isRTL ? 'المنتجات' : 'Order Items'}
                </h4>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">
                          {isRTL ? 'المنتج' : 'Product'}
                        </th>
                        <th className="text-left py-2 px-4 text-xs font-medium text-gray-500">SKU</th>
                        <th className="text-center py-2 px-4 text-xs font-medium text-gray-500">
                          {isRTL ? 'الكمية' : 'Qty'}
                        </th>
                        <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">
                          {isRTL ? 'المبلغ' : 'Total'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item: any, index: number) => (
                        <tr key={index} className="border-t border-gray-50">
                          <td className="py-2 px-4 text-sm text-gray-900">{item.product_name}</td>
                          <td className="py-2 px-4 text-sm text-gray-600">{item.sku}</td>
                          <td className="py-2 px-4 text-sm text-gray-600 text-center">{item.quantity}</td>
                          <td className="py-2 px-4 text-sm font-medium text-gray-900 text-right">
                            {selectedOrder.currency} {parseFloat(item.total).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 text-sm font-medium text-gray-900 text-right">
                          {isRTL ? 'الإجمالي' : 'Total'}
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-gray-900 text-right">
                          {selectedOrder.currency} {parseFloat(selectedOrder.total).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Order Status */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-sm text-gray-500">{isRTL ? 'الحالة' : 'Status'}</p>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{isRTL ? 'تاريخ الإنشاء' : 'Created'}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(selectedOrder.date_created).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{isRTL ? 'القسائم' : 'Vouchers'}</p>
                  <p className="text-sm font-medium">
                    {selectedOrder.vouchers_generated ? (
                      <span className="text-green-600">{isRTL ? 'تم الإنشاء' : 'Generated'}</span>
                    ) : (
                      <span className="text-yellow-600">{isRTL ? 'معلق' : 'Pending'}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isRTL ? 'المالية والمعاملات' : 'Finance & Transactions'}
        </h1>
        <p className="text-gray-600">
          {isRTL
            ? 'إدارة الطلبات والقسائم والتقارير المالية'
            : 'Manage orders, vouchers, and financial reports'}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-8">
          {[
            { id: 'overview', label: isRTL ? 'نظرة عامة' : 'Overview', icon: TrendingUp },
            { id: 'orders', label: isRTL ? 'الطلبات' : 'Orders', icon: ShoppingCart },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-royal-600 text-royal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'orders' && renderOrders()}
    </div>
  );
}
