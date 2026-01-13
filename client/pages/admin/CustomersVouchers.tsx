import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  RefreshCw,
  Ticket,
  CheckCircle,
  AlertCircle,
  XCircle,
  Package,
  Mail,
  Filter,
  TrendingUp,
  Plus,
  X,
  Loader2,
  Search,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { useWooCommerceOrders } from '@/entities/woocommerce';
import {
  useAllCertificationProducts,
  useCreateVoucher,
  useCreateVouchersBulk,
  useAllVouchers,
  type CertificationProduct,
} from '@/entities/quiz';
import { cn } from '@/shared/utils/cn';
import { UserLookupService } from '@/entities/auth/user-lookup.service';

interface CustomerOrder {
  orderId: number;
  orderNumber: string;
  orderDate: string;
  status: string;
  items: {
    productId: number;
    productName: string;
    quantity: number;
    certProduct: CertificationProduct;
  }[];
  expectedVouchers: number;
  generatedVouchers: number;
}

interface CustomerData {
  email: string;
  firstName: string;
  lastName: string;
  orders: CustomerOrder[];
  totalExpected: number;
  totalGenerated: number;
  hasMissing: boolean;
}

interface SelectedUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

type FilterStatus = 'all' | 'complete' | 'pending' | 'missing';

export default function CustomersVouchers() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { language } = useLanguage();

  const t = {
    en: {
      title: 'Customers & Vouchers',
      description: 'Manage certification vouchers for customers who purchased exam products',
      bulkIssueVouchers: 'Bulk Issue Vouchers',
      smartVoucherTitle: 'Smart Voucher Generation',
      smartVoucherDescription: 'The system automatically calculates how many vouchers each customer should receive based on their purchases and product configuration. Click "Generate Missing Vouchers" to create only what\'s needed.',
      totalCustomers: 'Total Customers',
      complete: 'Complete',
      pending: 'Pending',
      missing: 'Missing',
      filterByStatus: 'Filter by Status',
      allCustomers: 'All Customers',
      completeOnly: 'Complete Only',
      pendingOnly: 'Pending Only',
      missingVouchers: 'Missing Vouchers',
      refreshData: 'Refresh Data',
      loading: 'Loading customers...',
      noCustomers: 'No customers found',
      noCustomersDescription: 'Customers who purchased certification products will appear here',
      order: 'Order',
      orders: 'orders',
      vouchers: 'Vouchers',
      noVouchers: 'No Vouchers',
      voucher: 'voucher',
      generateMissingVouchers: 'Generate Missing Vouchers',
      generateMissingTitle: 'Generate Missing Vouchers',
      generateMissingDescription: 'Generate {count} missing voucher(s) for {name} ({email})?',
      generateButton: 'Generate {count} Voucher(s)',
      cancel: 'Cancel',
      success: 'Success',
      error: 'Error',
      vouchersGenerated: '{count} voucher(s) generated successfully for {email}',
      customerNotFound: 'Customer Account Not Found',
      customerNotFoundDescription: '{email} must create a BDA Portal account first before vouchers can be generated. Ask them to sign up at the portal.',
      failedToGenerate: 'Failed to generate vouchers',
      refreshed: 'Refreshed',
      dataUpdated: 'Customer data updated',
      bulkModalTitle: 'Bulk Issue Vouchers',
      bulkModalDescription: 'Issue exam vouchers to multiple users at once',
      searchUsers: 'Search Users',
      searchUsersPlaceholder: 'Search by name or email...',
      selectedUsers: 'Selected Users',
      noUsersSelected: 'No users selected. Search and select users above.',
      searching: 'Searching...',
      noUsersFound: 'No users found',
      selectAtLeastOneUser: 'Please select at least one user',
      certificationType: 'Certification Type',
      cpLabel: 'Certified Professional (CP)',
      scpLabel: 'Senior Certified Professional (SCP)',
      examLanguage: 'Exam Language',
      englishLabel: 'English',
      arabicLabel: 'Arabic',
      expiresAt: 'Expires At',
      adminNotes: 'Admin Notes (Optional)',
      adminNotesPlaceholder: 'Add internal notes about this batch of vouchers...',
      creatingVouchers: 'Creating Vouchers...',
      issueVouchers: 'Issue Vouchers',
      selectExpiration: 'Please select an expiration date',
      vouchersCreated: '{count} voucher(s) created successfully',
      failedEmails: '{count} failed: {emails}',
      failed: 'Failed',
      failedToCreate: 'Failed to create vouchers',
    },
    ar: {
      title: 'العملاء والقسائم',
      description: 'إدارة قسائم الشهادات للعملاء الذين اشتروا منتجات الامتحان',
      bulkIssueVouchers: 'إصدار قسائم جماعي',
      smartVoucherTitle: 'إنشاء القسائم الذكي',
      smartVoucherDescription: 'يحسب النظام تلقائياً عدد القسائم التي يجب أن يحصل عليها كل عميل بناءً على مشترياته وتكوين المنتج. انقر على "إنشاء القسائم المفقودة" لإنشاء ما هو مطلوب فقط.',
      totalCustomers: 'إجمالي العملاء',
      complete: 'مكتمل',
      pending: 'قيد الانتظار',
      missing: 'مفقود',
      filterByStatus: 'تصفية حسب الحالة',
      allCustomers: 'جميع العملاء',
      completeOnly: 'المكتمل فقط',
      pendingOnly: 'قيد الانتظار فقط',
      missingVouchers: 'القسائم المفقودة',
      refreshData: 'تحديث البيانات',
      loading: 'جارٍ تحميل العملاء...',
      noCustomers: 'لم يتم العثور على عملاء',
      noCustomersDescription: 'سيظهر هنا العملاء الذين اشتروا منتجات الشهادات',
      order: 'طلب',
      orders: 'طلبات',
      vouchers: 'القسائم',
      noVouchers: 'لا توجد قسائم',
      voucher: 'قسيمة',
      generateMissingVouchers: 'إنشاء القسائم المفقودة',
      generateMissingTitle: 'إنشاء القسائم المفقودة',
      generateMissingDescription: 'إنشاء {count} قسيمة/قسائم مفقودة لـ {name} ({email})؟',
      generateButton: 'إنشاء {count} قسيمة/قسائم',
      cancel: 'إلغاء',
      success: 'نجاح',
      error: 'خطأ',
      vouchersGenerated: 'تم إنشاء {count} قسيمة/قسائم بنجاح لـ {email}',
      customerNotFound: 'لم يتم العثور على حساب العميل',
      customerNotFoundDescription: 'يجب على {email} إنشاء حساب في بوابة BDA أولاً قبل إنشاء القسائم. اطلب منهم التسجيل في البوابة.',
      failedToGenerate: 'فشل في إنشاء القسائم',
      refreshed: 'تم التحديث',
      dataUpdated: 'تم تحديث بيانات العملاء',
      bulkModalTitle: 'إصدار قسائم جماعي',
      bulkModalDescription: 'إصدار قسائم الامتحان لعدة مستخدمين دفعة واحدة',
      searchUsers: 'البحث عن المستخدمين',
      searchUsersPlaceholder: 'البحث بالاسم أو البريد الإلكتروني...',
      selectedUsers: 'المستخدمون المحددون',
      noUsersSelected: 'لم يتم تحديد مستخدمين. ابحث وحدد المستخدمين أعلاه.',
      searching: 'جارٍ البحث...',
      noUsersFound: 'لم يتم العثور على مستخدمين',
      selectAtLeastOneUser: 'يرجى تحديد مستخدم واحد على الأقل',
      certificationType: 'نوع الشهادة',
      cpLabel: 'محترف معتمد (CP)',
      scpLabel: 'محترف معتمد أول (SCP)',
      examLanguage: 'لغة الامتحان',
      englishLabel: 'الإنجليزية',
      arabicLabel: 'العربية',
      expiresAt: 'تاريخ الانتهاء',
      adminNotes: 'ملاحظات المسؤول (اختياري)',
      adminNotesPlaceholder: 'أضف ملاحظات داخلية حول هذه الدفعة من القسائم...',
      creatingVouchers: 'جارٍ إنشاء القسائم...',
      issueVouchers: 'إصدار القسائم',
      selectExpiration: 'يرجى تحديد تاريخ انتهاء الصلاحية',
      vouchersCreated: 'تم إنشاء {count} قسيمة/قسائم بنجاح',
      failedEmails: 'فشل {count}: {emails}',
      failed: 'فشل',
      failedToCreate: 'فشل في إنشاء القسائم',
    }
  };

  const texts = t[language];

  // Fetch data
  const { data: orders, isLoading: isLoadingOrders, refetch: refetchOrders } = useWooCommerceOrders({ status: 'completed' });
  const { data: certProducts } = useAllCertificationProducts();
  const { data: allVouchers, refetch: refetchVouchers } = useAllVouchers();
  const createVoucherMutation = useCreateVoucher();
  const createVouchersBulkMutation = useCreateVouchersBulk();

  // Filters
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Bulk issuance modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [bulkCertType, setBulkCertType] = useState<'CP' | 'SCP'>('CP');
  const [bulkExamLanguage, setBulkExamLanguage] = useState<'en' | 'ar'>('en');
  const [bulkExpiresAt, setBulkExpiresAt] = useState('');
  const [bulkAdminNotes, setBulkAdminNotes] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // User search query
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['users-search-vouchers', userSearchQuery],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase');
      const searchLower = userSearchQuery.toLowerCase().trim();
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .or(`email.ilike.%${searchLower}%,first_name.ilike.%${searchLower}%,last_name.ilike.%${searchLower}%`)
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: userSearchQuery.length >= 2 && showBulkModal,
  });

  // Filter out already selected users from search results
  const filteredSearchResults = useMemo(() => {
    if (!searchResults) return [];
    const selectedIds = new Set(selectedUsers.map(u => u.id));
    return searchResults.filter(u => !selectedIds.has(u.id));
  }, [searchResults, selectedUsers]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // User selection handlers
  const handleSelectUser = (user: { id: string; email: string; first_name: string | null; last_name: string | null }) => {
    setSelectedUsers(prev => [...prev, {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    }]);
    setUserSearchQuery('');
    setShowSearchDropdown(false);
    searchInputRef.current?.focus();
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Process customer data
  const customersData = useMemo(() => {
    if (!orders || !certProducts) return [];

    const certProductIds = certProducts.map((cp) => cp.woocommerce_product_id);

    // Filter orders with certification products
    const certOrders = orders.filter((order) =>
      order.items.some((item) => certProductIds.includes(item.product_id))
    );

    // Group by customer email
    const customerMap = new Map<string, CustomerData>();

    certOrders.forEach((order) => {
      const email = order.customer.email;

      if (!customerMap.has(email)) {
        customerMap.set(email, {
          email,
          firstName: order.customer.first_name,
          lastName: order.customer.last_name,
          orders: [],
          totalExpected: 0,
          totalGenerated: 0,
          hasMissing: false,
        });
      }

      const customer = customerMap.get(email)!;

      // Process order items
      const orderItems = order.items
        .map((item) => {
          const certProduct = certProducts.find(
            (cp) => cp.woocommerce_product_id === item.product_id
          );
          if (!certProduct) return null;

          return {
            productId: item.product_id,
            productName: item.product_name,
            quantity: item.quantity,
            certProduct,
          };
        })
        .filter(Boolean) as CustomerOrder['items'];

      if (orderItems.length === 0) return;

      // Calculate expected vouchers for this order
      const expectedVouchers = orderItems.reduce(
        (sum, item) => sum + item.quantity * item.certProduct.vouchers_per_purchase,
        0
      );

      // Count generated vouchers for this order
      const generatedVouchers =
        allVouchers?.filter((v) => v.woocommerce_order_id === order.id).length || 0;

      customer.orders.push({
        orderId: order.id,
        orderNumber: order.order_number,
        orderDate: order.date_created,
        status: order.status,
        items: orderItems,
        expectedVouchers,
        generatedVouchers,
      });

      customer.totalExpected += expectedVouchers;
      customer.totalGenerated += generatedVouchers;
    });

    // Calculate hasMissing
    customerMap.forEach((customer) => {
      customer.hasMissing = customer.totalGenerated < customer.totalExpected;
    });

    return Array.from(customerMap.values()).sort((a, b) => {
      // Sort by missing vouchers first, then by email
      if (a.hasMissing && !b.hasMissing) return -1;
      if (!a.hasMissing && b.hasMissing) return 1;
      return a.email.localeCompare(b.email);
    });
  }, [orders, certProducts, allVouchers]);

  // Apply filters
  const filteredCustomers = customersData.filter((customer) => {
    if (filterStatus === 'complete') return !customer.hasMissing;
    if (filterStatus === 'pending') return customer.hasMissing && customer.totalGenerated > 0;
    if (filterStatus === 'missing') return customer.totalGenerated === 0 && customer.totalExpected > 0;
    return true;
  });

  const handleGenerateMissingVouchers = async (customer: CustomerData) => {
    const missingCount = customer.totalExpected - customer.totalGenerated;

    const confirmed = await confirm({
      title: texts.generateMissingTitle,
      description: texts.generateMissingDescription
        .replace('{count}', String(missingCount))
        .replace('{name}', `${customer.firstName} ${customer.lastName}`)
        .replace('{email}', customer.email),
      confirmText: texts.generateButton.replace('{count}', String(missingCount)),
      cancelText: texts.cancel,
    });

    if (!confirmed) return;

    try {
      // First, resolve customer email to user_id
      const userLookup = await UserLookupService.findUserByEmailForVoucher(
        customer.email
      );

      if (!userLookup) {
        toast({
          title: texts.customerNotFound,
          description: texts.customerNotFoundDescription.replace('{email}', customer.email),
          variant: 'destructive',
        });
        return;
      }

      let generatedCount = 0;

      // Process each order
      for (const order of customer.orders) {
        const missingForOrder = order.expectedVouchers - order.generatedVouchers;
        if (missingForOrder <= 0) continue;

        // Generate vouchers for each item in the order
        for (const item of order.items) {
          const vouchersPerItem = item.quantity * item.certProduct.vouchers_per_purchase;
          const existingForItem = allVouchers?.filter(
            (v) =>
              v.woocommerce_order_id === order.orderId &&
              v.certification_product_id === item.certProduct.id
          ).length || 0;

          const toGenerate = vouchersPerItem - existingForItem;
          if (toGenerate <= 0) continue;

          // Calculate expiration
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + item.certProduct.voucher_validity_months);

          // Generate vouchers
          for (let i = 0; i < toGenerate; i++) {
            await createVoucherMutation.mutateAsync({
              user_id: userLookup.user_id, // Real user_id from lookup/create
              certification_type: item.certProduct.certification_type,
              quiz_id: item.certProduct.quiz_id || undefined,
              expires_at: expiresAt.toISOString(),
              woocommerce_order_id: order.orderId,
              certification_product_id: item.certProduct.id,
              admin_notes: `Auto-generated for ${customer.firstName} ${customer.lastName} from order #${order.orderNumber}`,
            });
            generatedCount++;
          }
        }
      }

      toast({
        title: texts.success,
        description: texts.vouchersGenerated
          .replace('{count}', String(generatedCount))
          .replace('{email}', customer.email),
      });

      // Refresh data
      await Promise.all([refetchOrders(), refetchVouchers()]);
    } catch (error: any) {
      console.error('Error generating vouchers:', error);
      toast({
        title: texts.error,
        description: error.message || texts.failedToGenerate,
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchOrders(), refetchVouchers()]);
    toast({ title: texts.refreshed, description: texts.dataUpdated });
  };

  const handleBulkIssuance = async () => {
    if (selectedUsers.length === 0) {
      toast({
        title: texts.error,
        description: texts.selectAtLeastOneUser,
        variant: 'destructive',
      });
      return;
    }

    if (!bulkExpiresAt) {
      toast({
        title: texts.error,
        description: texts.selectExpiration,
        variant: 'destructive',
      });
      return;
    }

    try {
      // Convert selected users to comma-separated emails
      const emailsString = selectedUsers.map(u => u.email).join(',');

      const result = await createVouchersBulkMutation.mutateAsync({
        emails: emailsString,
        certification_type: bulkCertType,
        exam_language: bulkExamLanguage,
        expires_at: bulkExpiresAt,
        admin_notes: bulkAdminNotes || null,
        quiz_id: null,
        certification_product_id: null,
      });

      // Show success/failure summary
      const successMsg = texts.vouchersCreated.replace('{count}', String(result.created));
      const failMsg = result.failed.length > 0
        ? texts.failedEmails
            .replace('{count}', String(result.failed.length))
            .replace('{emails}', result.failed.map((f) => f.email).join(', '))
        : '';

      toast({
        title: result.created > 0 ? texts.success : texts.failed,
        description: failMsg ? `${successMsg}. ${failMsg}` : successMsg,
        variant: result.created > 0 ? 'default' : 'destructive',
      });

      // Reset form and close modal if any succeeded
      if (result.created > 0) {
        setUserSearchQuery('');
        setSelectedUsers([]);
        setBulkCertType('CP');
        setBulkExamLanguage('en');
        setBulkExpiresAt('');
        setBulkAdminNotes('');
        setShowBulkModal(false);
        await refetchVouchers();
      }
    } catch (error: any) {
      console.error('Error creating bulk vouchers:', error);
      toast({
        title: texts.error,
        description: error.message || texts.failedToCreate,
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (customer: CustomerData) => {
    if (!customer.hasMissing) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          {texts.complete}
        </Badge>
      );
    }
    if (customer.totalGenerated === 0) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300">
          <XCircle className="h-3 w-3 mr-1" />
          {texts.noVouchers}
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
        <AlertCircle className="h-3 w-3 mr-1" />
        {texts.pending}
      </Badge>
    );
  };

  const stats = {
    totalCustomers: customersData.length,
    complete: customersData.filter((c) => !c.hasMissing).length,
    pending: customersData.filter((c) => c.hasMissing && c.totalGenerated > 0).length,
    missing: customersData.filter((c) => c.totalGenerated === 0 && c.totalExpected > 0).length,
  };

  const isLoading = isLoadingOrders;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              {texts.title}
            </h1>
            <p className="mt-2 opacity-90">
              {texts.description}
            </p>
          </div>
          <Button
            onClick={() => setShowBulkModal(true)}
            className="bg-white text-royal-600 hover:bg-gray-100"
          >
            <Plus className="h-4 w-4 mr-2" />
            {texts.bulkIssueVouchers}
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Ticket className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">{texts.smartVoucherTitle}</h3>
              <p className="text-sm text-blue-800">
                {texts.smartVoucherDescription}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600 mb-1">{texts.totalCustomers}</div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</div>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-700 mb-1">{texts.complete}</div>
                <div className="text-2xl font-bold text-green-800">{stats.complete}</div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-yellow-700 mb-1">{texts.pending}</div>
                <div className="text-2xl font-bold text-yellow-800">{stats.pending}</div>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-red-700 mb-1">{texts.missing}</div>
                <div className="text-2xl font-bold text-red-800">{stats.missing}</div>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{texts.filterByStatus}</Label>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{texts.allCustomers}</SelectItem>
                    <SelectItem value="complete">{texts.completeOnly}</SelectItem>
                    <SelectItem value="pending">{texts.pendingOnly}</SelectItem>
                    <SelectItem value="missing">{texts.missingVouchers}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleRefresh} disabled={isLoading} variant="outline" className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {texts.refreshData}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{texts.loading}</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">{texts.noCustomers}</p>
            <p className="text-sm text-gray-500">
              {texts.noCustomersDescription}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.email}
              className={cn(
                'hover:shadow-md transition-shadow',
                customer.hasMissing ? 'border-yellow-200' : 'border-green-200'
              )}
            >
              <CardContent className="p-6">
                {/* Customer Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-indigo-100">
                      <Users className="h-6 w-6 text-royal-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {customer.firstName} {customer.lastName}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Mail className="h-4 w-4" />
                        {customer.email}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(customer)}
                        <Badge variant="outline">
                          {customer.orders.length} {customer.orders.length > 1 ? texts.orders : texts.order}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Voucher Summary */}
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">{texts.vouchers}</div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-green-700">
                        {customer.totalGenerated}
                      </div>
                      <div className="text-gray-400">/</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {customer.totalExpected}
                      </div>
                    </div>
                    {customer.hasMissing && (
                      <div className="text-xs text-red-600 font-semibold mt-1">
                        {customer.totalExpected - customer.totalGenerated} {texts.missing}
                      </div>
                    )}
                  </div>
                </div>

                {/* Orders */}
                <div className="space-y-3">
                  {customer.orders.map((order) => (
                    <div
                      key={order.orderId}
                      className={cn(
                        'p-4 rounded-lg border',
                        order.generatedVouchers < order.expectedVouchers
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-green-50 border-green-200'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-600" />
                          <span className="font-semibold text-gray-900">
                            {texts.order} #{order.orderNumber}
                          </span>
                          <span className="text-sm text-gray-600">
                            {formatDate(order.orderDate)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <span
                            className={cn(
                              'font-semibold',
                              order.generatedVouchers >= order.expectedVouchers
                                ? 'text-green-700'
                                : 'text-yellow-700'
                            )}
                          >
                            {order.generatedVouchers}/{order.expectedVouchers} {texts.vouchers.toLowerCase()}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => {
                          const voucherCount = item.quantity * item.certProduct.vouchers_per_purchase;
                          return (
                            <div key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                              <TrendingUp className="h-3 w-3" />
                              {item.quantity}× {item.productName}
                              <span className="text-xs text-gray-500">
                                ({voucherCount} {voucherCount > 1 ? texts.vouchers.toLowerCase() : texts.voucher})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {customer.hasMissing && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      onClick={() => handleGenerateMissingVouchers(customer)}
                      disabled={createVoucherMutation.isPending}
                      className="w-full"
                    >
                      <Ticket className="h-4 w-4 mr-2" />
                      {texts.generateMissingVouchers} ({customer.totalExpected - customer.totalGenerated})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Bulk Issue Vouchers Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{texts.bulkModalTitle}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {texts.bulkModalDescription}
                  </p>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* User Search */}
                <div>
                  <Label>{texts.searchUsers} <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        ref={searchInputRef}
                        type="text"
                        placeholder={texts.searchUsersPlaceholder}
                        value={userSearchQuery}
                        onChange={(e) => {
                          setUserSearchQuery(e.target.value);
                          setShowSearchDropdown(true);
                        }}
                        onFocus={() => setShowSearchDropdown(true)}
                        className="pl-10"
                      />
                    </div>

                    {/* Search Results Dropdown */}
                    {showSearchDropdown && userSearchQuery.length >= 2 && (
                      <div
                        ref={dropdownRef}
                        className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      >
                        {isSearching ? (
                          <div className="p-3 text-center text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                            {texts.searching}
                          </div>
                        ) : filteredSearchResults.length === 0 ? (
                          <div className="p-3 text-center text-gray-500">
                            {texts.noUsersFound}
                          </div>
                        ) : (
                          filteredSearchResults.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleSelectUser(user)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-royal-100 flex items-center justify-center flex-shrink-0">
                                <Users className="h-4 w-4 text-royal-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {user.first_name && user.last_name
                                    ? `${user.first_name} ${user.last_name}`
                                    : user.email}
                                </div>
                                {user.first_name && user.last_name && (
                                  <div className="text-sm text-gray-500 truncate">{user.email}</div>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Users */}
                <div>
                  <Label>{texts.selectedUsers}</Label>
                  {selectedUsers.length === 0 ? (
                    <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500 text-sm">
                      {texts.noUsersSelected}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                      {selectedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg"
                        >
                          <span className="text-sm">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName} (${user.email})`
                              : user.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveUser(user.id)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Certification Type */}
                <div>
                  <Label htmlFor="bulk-cert-type">
                    {texts.certificationType} <span className="text-red-500">*</span>
                  </Label>
                  <Select value={bulkCertType} onValueChange={(v) => setBulkCertType(v as 'CP' | 'SCP')}>
                    <SelectTrigger id="bulk-cert-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CP">{texts.cpLabel}</SelectItem>
                      <SelectItem value="SCP">{texts.scpLabel}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Exam Language */}
                <div>
                  <Label htmlFor="bulk-exam-language">
                    {texts.examLanguage} <span className="text-red-500">*</span>
                  </Label>
                  <Select value={bulkExamLanguage} onValueChange={(v) => setBulkExamLanguage(v as 'en' | 'ar')}>
                    <SelectTrigger id="bulk-exam-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{texts.englishLabel}</SelectItem>
                      <SelectItem value="ar">{texts.arabicLabel}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Expiration Date */}
                <div>
                  <Label htmlFor="bulk-expires">
                    {texts.expiresAt} <span className="text-red-500">*</span>
                  </Label>
                  <input
                    type="datetime-local"
                    id="bulk-expires"
                    value={bulkExpiresAt}
                    onChange={(e) => setBulkExpiresAt(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Admin Notes */}
                <div>
                  <Label htmlFor="bulk-notes">{texts.adminNotes}</Label>
                  <textarea
                    id="bulk-notes"
                    value={bulkAdminNotes}
                    onChange={(e) => setBulkAdminNotes(e.target.value)}
                    placeholder={texts.adminNotesPlaceholder}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
                <Button
                  onClick={() => setShowBulkModal(false)}
                  variant="outline"
                  disabled={createVouchersBulkMutation.isPending}
                >
                  {texts.cancel}
                </Button>
                <Button
                  onClick={handleBulkIssuance}
                  disabled={createVouchersBulkMutation.isPending || selectedUsers.length === 0 || !bulkExpiresAt}
                  className="bg-royal-600 hover:bg-royal-700"
                >
                  {createVouchersBulkMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {texts.creatingVouchers}
                    </>
                  ) : (
                    <>
                      <Ticket className="h-4 w-4 mr-2" />
                      {texts.issueVouchers}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

CustomersVouchers.displayName = 'CustomersVouchers';
