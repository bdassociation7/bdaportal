import { useState } from 'react';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Search,
  Filter,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import {
  useAllCertificationProducts,
  useCreateCertificationProduct,
  useUpdateCertificationProduct,
  useDeleteCertificationProduct,
  useToggleCertificationProductActive,
  useActiveQuizzes,
  type CertificationProduct,
  type CertificationType,
  type CreateCertificationProductDTO,
  type UpdateCertificationProductDTO,
} from '@/entities/quiz';
import { cn } from '@/shared/utils/cn';

/**
 * CertificationProducts Page (Admin)
 * Manage WooCommerce product links to certifications
 */

const CERTIFICATION_LABELS: Record<CertificationType, string> = {
  CP: 'BDA-CP™ - BDA Certified Professional',
  SCP: 'BDA-SCP™ - BDA Senior Certified Professional',
};

type FormMode = 'create' | 'edit' | null;

interface ProductFormData {
  id?: string;
  woocommerce_product_id: string;
  woocommerce_product_name: string;
  woocommerce_product_sku: string;
  certification_type: CertificationType;
  quiz_id: string;
  vouchers_per_purchase: string;
  voucher_validity_months: string;
}

const emptyFormData: ProductFormData = {
  woocommerce_product_id: '',
  woocommerce_product_name: '',
  woocommerce_product_sku: '',
  certification_type: 'CP',
  quiz_id: '',
  vouchers_per_purchase: '1',
  voucher_validity_months: '6',
};

export default function CertificationProducts() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { language } = useLanguage();

  const t = {
    en: {
      title: 'Certification Products',
      description: 'Link WooCommerce products to certification exams and manage voucher settings',
      search: 'Search',
      searchPlaceholder: 'Search by product name or SKU...',
      certificationType: 'Certification Type',
      allTypes: 'All Types',
      status: 'Status',
      allStatus: 'All Status',
      active: 'Active',
      inactive: 'Inactive',
      addProduct: 'Add Product',
      loading: 'Loading certification products...',
      noProducts: 'No certification products found',
      noProductsDescription: 'Create a product link to start managing certification vouchers',
      addFirstProduct: 'Add First Product',
      certification: 'Certification',
      linkedQuiz: 'Linked Quiz',
      notLinked: 'Not linked',
      vouchersPerPurchase: 'Vouchers / Purchase',
      validity: 'Validity',
      months: 'months',
      deactivate: 'Deactivate',
      activate: 'Activate',
      edit: 'Edit',
      delete: 'Delete',
      addProductTitle: 'Add Certification Product',
      editProductTitle: 'Edit Certification Product',
      addProductDescription: 'Link a WooCommerce product to a certification exam',
      editProductDescription: 'Update certification product settings',
      productId: 'WooCommerce Product ID',
      productIdHelp: 'The product ID from your WooCommerce store',
      productName: 'Product Name',
      productSku: 'Product SKU (Optional)',
      linkedQuizOptional: 'Linked Quiz (Optional)',
      selectQuiz: 'Select a quiz',
      none: 'None',
      linkedQuizHelp: 'Link this product to a specific certification exam',
      vouchersCount: 'Vouchers per Purchase',
      vouchersCountHelp: 'How many vouchers are included with each product purchase',
      validityMonths: 'Voucher Validity (Months)',
      validityMonthsHelp: 'How long vouchers are valid after purchase',
      cancel: 'Cancel',
      create: 'Create',
      saveChanges: 'Save Changes',
      validationError: 'Validation Error',
      productIdRequired: 'Product ID and Name are required',
      productIdInvalid: 'Product ID must be a valid number',
      vouchersInvalid: 'Vouchers per purchase must be a valid number',
      validityInvalid: 'Validity months must be a valid number',
      success: 'Success',
      error: 'Error',
      createSuccess: 'Certification product created successfully',
      updateSuccess: 'Certification product updated successfully',
      deleteSuccess: 'Certification product deleted successfully',
      saveFailed: 'Failed to save certification product',
      deleteFailed: 'Failed to delete certification product',
      toggleFailed: 'Failed to toggle product status',
      deactivatedSuccess: 'Product deactivated successfully',
      activatedSuccess: 'Product activated successfully',
      deleteConfirmTitle: 'Delete Certification Product',
      deleteConfirmDescription: 'Are you sure you want to delete "{name}"? This action cannot be undone.',
      confirmDelete: 'Delete',
      cpLabel: 'BDA-CP™ - BDA Certified Professional',
      scpLabel: 'BDA-SCP™ - BDA Senior Certified Professional',
    },
    ar: {
      title: 'منتجات الشهادات',
      description: 'ربط منتجات WooCommerce بامتحانات الشهادات وإدارة إعدادات القسائم',
      search: 'البحث',
      searchPlaceholder: 'البحث باسم المنتج أو SKU...',
      certificationType: 'نوع الشهادة',
      allTypes: 'جميع الأنواع',
      status: 'الحالة',
      allStatus: 'جميع الحالات',
      active: 'نشط',
      inactive: 'غير نشط',
      addProduct: 'إضافة منتج',
      loading: 'جارٍ تحميل منتجات الشهادات...',
      noProducts: 'لم يتم العثور على منتجات شهادات',
      noProductsDescription: 'أنشئ رابط منتج لبدء إدارة قسائم الشهادات',
      addFirstProduct: 'إضافة أول منتج',
      certification: 'الشهادة',
      linkedQuiz: 'الاختبار المرتبط',
      notLinked: 'غير مرتبط',
      vouchersPerPurchase: 'القسائم / الشراء',
      validity: 'الصلاحية',
      months: 'شهر',
      deactivate: 'إلغاء التفعيل',
      activate: 'تفعيل',
      edit: 'تعديل',
      delete: 'حذف',
      addProductTitle: 'إضافة منتج شهادة',
      editProductTitle: 'تعديل منتج الشهادة',
      addProductDescription: 'ربط منتج WooCommerce بامتحان شهادة',
      editProductDescription: 'تحديث إعدادات منتج الشهادة',
      productId: 'معرف منتج WooCommerce',
      productIdHelp: 'معرف المنتج من متجر WooCommerce الخاص بك',
      productName: 'اسم المنتج',
      productSku: 'SKU المنتج (اختياري)',
      linkedQuizOptional: 'الاختبار المرتبط (اختياري)',
      selectQuiz: 'اختر اختبار',
      none: 'لا شيء',
      linkedQuizHelp: 'ربط هذا المنتج بامتحان شهادة محدد',
      vouchersCount: 'القسائم لكل عملية شراء',
      vouchersCountHelp: 'عدد القسائم المتضمنة مع كل عملية شراء منتج',
      validityMonths: 'صلاحية القسيمة (بالأشهر)',
      validityMonthsHelp: 'مدة صلاحية القسائم بعد الشراء',
      cancel: 'إلغاء',
      create: 'إنشاء',
      saveChanges: 'حفظ التغييرات',
      validationError: 'خطأ في التحقق',
      productIdRequired: 'معرف المنتج والاسم مطلوبان',
      productIdInvalid: 'يجب أن يكون معرف المنتج رقماً صالحاً',
      vouchersInvalid: 'يجب أن تكون القسائم لكل عملية شراء رقماً صالحاً',
      validityInvalid: 'يجب أن تكون أشهر الصلاحية رقماً صالحاً',
      success: 'نجاح',
      error: 'خطأ',
      createSuccess: 'تم إنشاء منتج الشهادة بنجاح',
      updateSuccess: 'تم تحديث منتج الشهادة بنجاح',
      deleteSuccess: 'تم حذف منتج الشهادة بنجاح',
      saveFailed: 'فشل في حفظ منتج الشهادة',
      deleteFailed: 'فشل في حذف منتج الشهادة',
      toggleFailed: 'فشل في تبديل حالة المنتج',
      deactivatedSuccess: 'تم إلغاء تفعيل المنتج بنجاح',
      activatedSuccess: 'تم تفعيل المنتج بنجاح',
      deleteConfirmTitle: 'حذف منتج الشهادة',
      deleteConfirmDescription: 'هل أنت متأكد من حذف "{name}"؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmDelete: 'حذف',
      cpLabel: 'BDA-CP™ - محترف معتمد',
      scpLabel: 'BDA-SCP™ - محترف معتمد أول',
    }
  };

  const texts = t[language];

  // Filters
  const [certificationFilter, setCertificationFilter] = useState<CertificationType | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData);

  // Build filters
  const filters = {
    certification_type: certificationFilter !== 'all' ? certificationFilter : undefined,
    is_active: activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined,
    search: searchQuery || undefined,
  };

  // Fetch data
  const { data: products, isLoading } = useAllCertificationProducts(filters);
  const { data: quizzes } = useActiveQuizzes();

  // Mutations
  const createMutation = useCreateCertificationProduct();
  const updateMutation = useUpdateCertificationProduct();
  const deleteMutation = useDeleteCertificationProduct();
  const toggleActiveMutation = useToggleCertificationProductActive();

  // Handlers
  const handleOpenCreate = () => {
    setFormData(emptyFormData);
    setFormMode('create');
  };

  const handleOpenEdit = (product: CertificationProduct) => {
    setFormData({
      id: product.id,
      woocommerce_product_id: product.woocommerce_product_id.toString(),
      woocommerce_product_name: product.woocommerce_product_name,
      woocommerce_product_sku: product.woocommerce_product_sku || '',
      certification_type: product.certification_type,
      quiz_id: product.quiz_id || '',
      vouchers_per_purchase: product.vouchers_per_purchase.toString(),
      voucher_validity_months: product.voucher_validity_months.toString(),
    });
    setFormMode('edit');
  };

  const handleCloseDialog = () => {
    setFormMode(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.woocommerce_product_id || !formData.woocommerce_product_name) {
      toast({
        title: texts.validationError,
        description: texts.productIdRequired,
        variant: 'destructive',
      });
      return;
    }

    const productId = parseInt(formData.woocommerce_product_id);
    if (isNaN(productId) || productId <= 0) {
      toast({
        title: texts.validationError,
        description: texts.productIdInvalid,
        variant: 'destructive',
      });
      return;
    }

    const vouchersPerPurchase = parseInt(formData.vouchers_per_purchase);
    const validityMonths = parseInt(formData.voucher_validity_months);

    if (isNaN(vouchersPerPurchase) || vouchersPerPurchase <= 0) {
      toast({
        title: texts.validationError,
        description: texts.vouchersInvalid,
        variant: 'destructive',
      });
      return;
    }

    if (isNaN(validityMonths) || validityMonths <= 0) {
      toast({
        title: texts.validationError,
        description: texts.validityInvalid,
        variant: 'destructive',
      });
      return;
    }

    try {
      if (formMode === 'create') {
        const dto: CreateCertificationProductDTO = {
          woocommerce_product_id: productId,
          woocommerce_product_name: formData.woocommerce_product_name,
          woocommerce_product_sku: formData.woocommerce_product_sku || undefined,
          certification_type: formData.certification_type,
          quiz_id: formData.quiz_id || undefined,
          vouchers_per_purchase: vouchersPerPurchase,
          voucher_validity_months: validityMonths,
        };

        await createMutation.mutateAsync(dto);
        toast({
          title: texts.success,
          description: texts.createSuccess,
        });
      } else if (formMode === 'edit' && formData.id) {
        const dto: UpdateCertificationProductDTO = {
          woocommerce_product_name: formData.woocommerce_product_name,
          woocommerce_product_sku: formData.woocommerce_product_sku || undefined,
          quiz_id: formData.quiz_id || undefined,
          vouchers_per_purchase: vouchersPerPurchase,
          voucher_validity_months: validityMonths,
        };

        await updateMutation.mutateAsync({ id: formData.id, dto });
        toast({
          title: texts.success,
          description: texts.updateSuccess,
        });
      }

      handleCloseDialog();
    } catch (error: any) {
      toast({
        title: texts.error,
        description: error.message || texts.saveFailed,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (product: CertificationProduct) => {
    const confirmed = await confirm({
      title: texts.deleteConfirmTitle,
      description: texts.deleteConfirmDescription.replace('{name}', product.woocommerce_product_name),
      confirmText: texts.confirmDelete,
      cancelText: texts.cancel,
    });

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(product.id);
      toast({
        title: texts.success,
        description: texts.deleteSuccess,
      });
    } catch (error: any) {
      toast({
        title: texts.error,
        description: error.message || texts.deleteFailed,
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (product: CertificationProduct) => {
    try {
      await toggleActiveMutation.mutateAsync({
        id: product.id,
        isActive: !product.is_active,
      });
      toast({
        title: texts.success,
        description: product.is_active ? texts.deactivatedSuccess : texts.activatedSuccess,
      });
    } catch (error: any) {
      toast({
        title: texts.error,
        description: error.message || texts.toggleFailed,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8" />
          {texts.title}
        </h1>
        <p className="mt-2 opacity-90">
          {texts.description}
        </p>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {/* Search */}
            <div className="flex-1">
              <Label htmlFor="search">{texts.search}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder={texts.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="w-full md:w-48">
              <Label>{texts.certificationType}</Label>
              <Select
                value={certificationFilter}
                onValueChange={(value) => setCertificationFilter(value as CertificationType | 'all')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{texts.allTypes}</SelectItem>
                  <SelectItem value="CP">BDA-CP™</SelectItem>
                  <SelectItem value="SCP">BDA-SCP™</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Label>{texts.status}</Label>
              <Select
                value={activeFilter}
                onValueChange={(value) => setActiveFilter(value as 'all' | 'active' | 'inactive')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{texts.allStatus}</SelectItem>
                  <SelectItem value="active">{texts.active}</SelectItem>
                  <SelectItem value="inactive">{texts.inactive}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Create Button */}
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {texts.addProduct}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{texts.loading}</p>
        </div>
      ) : !products || products.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">{texts.noProducts}</p>
            <p className="text-sm text-gray-500 mb-4">
              {texts.noProductsDescription}
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {texts.addFirstProduct}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-3 rounded-lg bg-purple-100">
                        <ShieldCheck className="h-6 w-6 text-royal-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-gray-900">
                            {product.woocommerce_product_name}
                          </h3>
                          {product.is_active ? (
                            <Badge variant="outline" className="text-green-700 bg-green-100 border-green-300">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {texts.active}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-700 bg-gray-100 border-gray-300">
                              <XCircle className="h-3 w-3 mr-1" />
                              {texts.inactive}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <span>ID: <span className="font-semibold">{product.woocommerce_product_id}</span></span>
                          {product.woocommerce_product_sku && (
                            <span>SKU: <span className="font-semibold">{product.woocommerce_product_sku}</span></span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">{texts.certification}</div>
                        <Badge variant="outline">
                          {product.certification_type === 'CP' ? texts.cpLabel : texts.scpLabel}
                        </Badge>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">{texts.linkedQuiz}</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {product.quiz?.title || texts.notLinked}
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">{texts.vouchersPerPurchase}</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {product.vouchers_per_purchase}
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-xs text-gray-600 mb-1">{texts.validity}</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {product.voucher_validity_months} {texts.months}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(product)}
                      disabled={toggleActiveMutation.isPending}
                    >
                      {product.is_active ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          {texts.deactivate}
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {texts.activate}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(product)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {texts.edit}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(product)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {texts.delete}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formMode !== null} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? texts.addProductTitle : texts.editProductTitle}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? texts.addProductDescription
                : texts.editProductDescription}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* WooCommerce Product ID */}
            <div>
              <Label htmlFor="product-id">
                {texts.productId} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="product-id"
                type="number"
                placeholder="123"
                value={formData.woocommerce_product_id}
                onChange={(e) => setFormData({ ...formData, woocommerce_product_id: e.target.value })}
                required
                disabled={formMode === 'edit'}
              />
              <p className="text-xs text-gray-500 mt-1">
                {texts.productIdHelp}
              </p>
            </div>

            {/* Product Name */}
            <div>
              <Label htmlFor="product-name">
                {texts.productName} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="product-name"
                placeholder="BDA Certification BDA-CP™ Book"
                value={formData.woocommerce_product_name}
                onChange={(e) => setFormData({ ...formData, woocommerce_product_name: e.target.value })}
                required
              />
            </div>

            {/* Product SKU */}
            <div>
              <Label htmlFor="product-sku">{texts.productSku}</Label>
              <Input
                id="product-sku"
                placeholder="BDA-CP-BOOK"
                value={formData.woocommerce_product_sku}
                onChange={(e) => setFormData({ ...formData, woocommerce_product_sku: e.target.value })}
              />
            </div>

            {/* Certification Type */}
            <div>
              <Label htmlFor="cert-type">
                {texts.certificationType} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.certification_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, certification_type: value as CertificationType })
                }
              >
                <SelectTrigger id="cert-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CP">{texts.cpLabel}</SelectItem>
                  <SelectItem value="SCP">{texts.scpLabel}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quiz Link */}
            <div>
              <Label htmlFor="quiz-id">{texts.linkedQuizOptional}</Label>
              <Select
                value={formData.quiz_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, quiz_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger id="quiz-id">
                  <SelectValue placeholder={texts.selectQuiz} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{texts.none}</SelectItem>
                  {quizzes
                    ?.filter((q) => q.certification_type === formData.certification_type)
                    .map((quiz) => (
                      <SelectItem key={quiz.id} value={quiz.id}>
                        {quiz.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {texts.linkedQuizHelp}
              </p>
            </div>

            {/* Vouchers Per Purchase */}
            <div>
              <Label htmlFor="vouchers-count">
                {texts.vouchersCount} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vouchers-count"
                type="number"
                min="1"
                value={formData.vouchers_per_purchase}
                onChange={(e) => setFormData({ ...formData, vouchers_per_purchase: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {texts.vouchersCountHelp}
              </p>
            </div>

            {/* Validity Months */}
            <div>
              <Label htmlFor="validity-months">
                {texts.validityMonths} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="validity-months"
                type="number"
                min="1"
                value={formData.voucher_validity_months}
                onChange={(e) => setFormData({ ...formData, voucher_validity_months: e.target.value })}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {texts.validityMonthsHelp}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {texts.cancel}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {formMode === 'create' ? texts.create : texts.saveChanges}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

CertificationProducts.displayName = 'CertificationProducts';
