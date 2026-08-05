import { useState } from 'react';
import {
  Package,
  Link as LinkIcon,
  RefreshCw,
  CheckCircle,
  Edit,
  ExternalLink,
  Filter,
  Trash2,
  Plus,
  FileText,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useWooCommerceProducts } from '@/entities/woocommerce';
import {
  useMockExamProducts,
  useCreateMockExamProduct,
  useUpdateMockExamProduct,
  useDeleteMockExamProduct,
  useExamsAdmin,
} from '@/entities/mock-exam/mock-exam.hooks';
import type { MockExamProduct, CreateMockExamProductDTO, UpdateMockExamProductDTO } from '@/entities/mock-exam/mock-exam.types';
import type { WooCommerceProduct } from '@/entities/woocommerce';
import { cn } from '@/shared/utils/cn';

type LinkStatus = 'all' | 'linked' | 'not-linked';

interface ProductWithLink {
  wooProduct: WooCommerceProduct;
  mockExamProduct?: MockExamProduct;
  isLinked: boolean;
}

export default function MockExamProducts() {
  const { toast } = useToast();
  const { language } = useLanguage();

  const t = {
    en: {
      title: 'Mock Exam Products',
      description: 'Link WooCommerce products to premium mock exam access. Users who purchase these products will automatically receive mock exam credits.',
      totalProducts: 'Total Products',
      linked: 'Linked',
      notLinked: 'Not Linked',
      linkStatus: 'Link Status',
      allProducts: 'All Products',
      linkedOnly: 'Linked Only',
      notLinkedOnly: 'Not Linked Only',
      refreshFromStore: 'Refresh from Store',
      loading: 'Loading products...',
      noProducts: 'No products found',
      noLinkedProducts: 'No linked products',
      noUnlinkedProducts: 'No unlinked products',
      syncFromStore: 'Sync products from your WooCommerce store',
      editLink: 'Edit Link',
      linkToMockExam: 'Link to Mock Exams',
      examsPerPurchase: 'exam(s) per purchase',
      validFor: 'Valid for',
      months: 'months',
      unlimited: 'Unlimited',
      linkedToSpecificExams: 'Linked to specific exams',
      editProductLink: 'Edit Product Link',
      linkToMockExams: 'Link to Mock Exams',
      editDescription: 'Update mock exam access configuration for this product',
      linkDescription: 'Configure how this product grants premium mock exam access',
      product: 'Product',
      examsCount: 'Number of Exams',
      validityMonths: 'Validity (Months)',
      validityMonthsHint: 'Leave empty for unlimited validity',
      specificExams: 'Specific Exams (Optional)',
      specificExamsHint: 'Leave empty to allow access to any premium exam',
      anyPremiumExam: 'Any Premium Exam',
      cancel: 'Cancel',
      updateLink: 'Update Link',
      linkProduct: 'Link Product',
      deleteLink: 'Delete Link',
      confirmDelete: 'Are you sure you want to delete this product link?',
      success: 'Success',
      error: 'Error',
      linkUpdated: 'Product link updated successfully',
      productLinked: 'Product linked successfully',
      linkDeleted: 'Product link deleted successfully',
      saveFailed: 'Failed to save product link',
      deleteFailed: 'Failed to delete product link',
      refreshed: 'Refreshed',
      productsSynced: 'Products synced from WooCommerce',
    },
    ar: {
      title: 'منتجات الاختبارات التجريبية',
      description: 'ربط منتجات WooCommerce بالوصول المميز للاختبارات التجريبية. المستخدمون الذين يشترون هذه المنتجات سيحصلون تلقائيًا على رصيد الاختبارات التجريبية.',
      totalProducts: 'إجمالي المنتجات',
      linked: 'مرتبط',
      notLinked: 'غير مرتبط',
      linkStatus: 'حالة الربط',
      allProducts: 'جميع المنتجات',
      linkedOnly: 'المرتبطة فقط',
      notLinkedOnly: 'غير المرتبطة فقط',
      refreshFromStore: 'تحديث من المتجر',
      loading: 'جارٍ تحميل المنتجات...',
      noProducts: 'لم يتم العثور على منتجات',
      noLinkedProducts: 'لا توجد منتجات مرتبطة',
      noUnlinkedProducts: 'لا توجد منتجات غير مرتبطة',
      syncFromStore: 'مزامنة المنتجات من متجر WooCommerce الخاص بك',
      editLink: 'تعديل الربط',
      linkToMockExam: 'ربط بالاختبارات التجريبية',
      examsPerPurchase: 'اختبار/اختبارات لكل عملية شراء',
      validFor: 'صالح لمدة',
      months: 'شهر',
      unlimited: 'غير محدود',
      linkedToSpecificExams: 'مرتبط باختبارات محددة',
      editProductLink: 'تعديل ربط المنتج',
      linkToMockExams: 'ربط بالاختبارات التجريبية',
      editDescription: 'تحديث تكوين الوصول للاختبارات التجريبية لهذا المنتج',
      linkDescription: 'تكوين كيفية منح هذا المنتج للوصول المميز للاختبارات التجريبية',
      product: 'المنتج',
      examsCount: 'عدد الاختبارات',
      validityMonths: 'الصلاحية (بالأشهر)',
      validityMonthsHint: 'اتركه فارغًا لصلاحية غير محدودة',
      specificExams: 'اختبارات محددة (اختياري)',
      specificExamsHint: 'اتركه فارغًا للسماح بالوصول إلى أي اختبار مميز',
      anyPremiumExam: 'أي اختبار مميز',
      cancel: 'إلغاء',
      updateLink: 'تحديث الربط',
      linkProduct: 'ربط المنتج',
      deleteLink: 'حذف الربط',
      confirmDelete: 'هل أنت متأكد من حذف هذا الربط؟',
      success: 'نجاح',
      error: 'خطأ',
      linkUpdated: 'تم تحديث ربط المنتج بنجاح',
      productLinked: 'تم ربط المنتج بنجاح',
      linkDeleted: 'تم حذف ربط المنتج بنجاح',
      saveFailed: 'فشل في حفظ ربط المنتج',
      deleteFailed: 'فشل في حذف ربط المنتج',
      refreshed: 'تم التحديث',
      productsSynced: 'تمت مزامنة المنتجات من WooCommerce',
    }
  };

  const texts = t[language];

  // Fetch data
  const { data: wooProducts, isLoading: isLoadingWoo, refetch: refetchWoo } = useWooCommerceProducts();
  const { data: mockExamProducts, isLoading: isLoadingMockExam, refetch: refetchMockExam } = useMockExamProducts();
  const { data: mockExams } = useExamsAdmin();

  // Mutations
  const createMutation = useCreateMockExamProduct();
  const updateMutation = useUpdateMockExamProduct();
  const deleteMutation = useDeleteMockExamProduct();

  // Filters
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('all');

  // Dialog state
  const [selectedProduct, setSelectedProduct] = useState<ProductWithLink | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkForm, setLinkForm] = useState({
    exams_count: '1',
    validity_months: '',
    specific_exam_ids: [] as string[],
    certification_type: '' as '' | 'CP' | 'SCP',
    exam_language: '' as '' | 'en' | 'ar',
    selection_mode: 'random' as 'random' | 'user_picks' | 'specific',
  });

  // Combine WooCommerce products with mock exam product links
  const productsWithLinks: ProductWithLink[] =
    wooProducts?.map((wooProduct) => {
      const mockExamProduct = mockExamProducts?.find(
        (mp) => mp.woocommerce_product_id === wooProduct.id
      );
      return {
        wooProduct,
        mockExamProduct,
        isLinked: !!mockExamProduct,
      };
    }) || [];

  // Apply filters
  const filteredProducts = productsWithLinks.filter((p) => {
    if (linkStatus === 'linked') return p.isLinked;
    if (linkStatus === 'not-linked') return !p.isLinked;
    return true;
  });

  const isLoading = isLoadingWoo || isLoadingMockExam;

  const handleOpenLinkDialog = (product: ProductWithLink) => {
    setSelectedProduct(product);
    setIsEditMode(false);
    setLinkForm({
      exams_count: '1',
      validity_months: '',
      specific_exam_ids: [],
      certification_type: 'CP',
      exam_language: 'en',
      selection_mode: 'random',
    });
  };

  const handleOpenEditDialog = (product: ProductWithLink) => {
    if (!product.mockExamProduct) return;
    setSelectedProduct(product);
    setIsEditMode(true);
    setLinkForm({
      exams_count: product.mockExamProduct.exams_count.toString(),
      validity_months: product.mockExamProduct.validity_months?.toString() || '',
      specific_exam_ids: product.mockExamProduct.specific_exam_ids || [],
      certification_type: (product.mockExamProduct as any).certification_type || 'CP',
      exam_language: (product.mockExamProduct as any).exam_language || 'en',
      selection_mode: (product.mockExamProduct as any).selection_mode || 'random',
    });
  };

  const handleCloseDialog = () => {
    setSelectedProduct(null);
    setIsEditMode(false);
    setShowDeleteConfirm(false);
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;

    try {
      const payload = {
        exams_count: parseInt(linkForm.exams_count),
        validity_months: linkForm.validity_months ? parseInt(linkForm.validity_months) : null,
        specific_exam_ids: linkForm.selection_mode === 'specific' && linkForm.specific_exam_ids.length > 0
          ? linkForm.specific_exam_ids
          : null,
        certification_type: linkForm.certification_type || null,
        exam_language: linkForm.exam_language || null,
        selection_mode: linkForm.selection_mode,
      };

      if (isEditMode && selectedProduct.mockExamProduct) {
        // Update existing link
        await updateMutation.mutateAsync({
          id: selectedProduct.mockExamProduct.id,
          dto: payload as UpdateMockExamProductDTO,
        });
        toast({ title: texts.success, description: texts.linkUpdated });
      } else {
        // Create new link
        const createPayload: CreateMockExamProductDTO = {
          woocommerce_product_id: selectedProduct.wooProduct.id,
          product_name: selectedProduct.wooProduct.name,
          ...payload,
        };
        await createMutation.mutateAsync(createPayload);
        toast({ title: texts.success, description: texts.productLinked });
      }

      refetchMockExam();
      handleCloseDialog();
    } catch (error: any) {
      toast({
        title: texts.error,
        description: error.message || texts.saveFailed,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct?.mockExamProduct) return;

    try {
      await deleteMutation.mutateAsync(selectedProduct.mockExamProduct.id);
      toast({ title: texts.success, description: texts.linkDeleted });
      refetchMockExam();
      handleCloseDialog();
    } catch (error: any) {
      toast({
        title: texts.error,
        description: error.message || texts.deleteFailed,
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchWoo(), refetchMockExam()]);
    toast({ title: texts.refreshed, description: texts.productsSynced });
  };

  const stats = {
    total: productsWithLinks.length,
    linked: productsWithLinks.filter((p) => p.isLinked).length,
    notLinked: productsWithLinks.filter((p) => !p.isLinked).length,
  };

  // Get premium exams for selection
  const premiumExams = mockExams?.filter(e => e.is_premium) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          {texts.title}
        </h1>
        <p className="mt-2 opacity-90">
          {texts.description}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">{texts.totalProducts}</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="text-sm text-green-700 mb-1 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              {texts.linked}
            </div>
            <div className="text-2xl font-bold text-green-800">{stats.linked}</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">{texts.notLinked}</div>
            <div className="text-2xl font-bold text-gray-700">{stats.notLinked}</div>
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
                <Label>{texts.linkStatus}</Label>
                <Select value={linkStatus} onValueChange={(v) => setLinkStatus(v as LinkStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{texts.allProducts}</SelectItem>
                    <SelectItem value="linked">{texts.linkedOnly}</SelectItem>
                    <SelectItem value="not-linked">{texts.notLinkedOnly}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleRefresh} disabled={isLoading} variant="outline" className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {texts.refreshFromStore}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{texts.loading}</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">{texts.noProducts}</p>
            <p className="text-sm text-gray-500">
              {linkStatus !== 'all'
                ? (linkStatus === 'linked' ? texts.noLinkedProducts : texts.noUnlinkedProducts)
                : texts.syncFromStore}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card
              key={product.wooProduct.id}
              className={cn(
                'hover:shadow-md transition-shadow',
                product.isLinked && 'border-green-200'
              )}
            >
              <CardContent className="p-4">
                {/* Product Header */}
                <div className="flex gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">
                      {product.wooProduct.name}
                    </h3>
                    <p className="text-xs text-gray-600">
                      SKU: {product.wooProduct.sku || 'N/A'}
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      ${product.wooProduct.price}
                    </p>
                  </div>
                </div>

                {/* Link Status */}
                <div className="mb-3">
                  {product.isLinked ? (
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {texts.linked}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600">
                      {texts.notLinked}
                    </Badge>
                  )}
                </div>

                {/* Linked Product Info */}
                {product.isLinked && product.mockExamProduct && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg space-y-1">
                    {/* Certification Type & Language */}
                    <div className="flex gap-2 mb-2">
                      {(product.mockExamProduct as any).certification_type && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                          {(product.mockExamProduct as any).certification_type}
                        </Badge>
                      )}
                      {(product.mockExamProduct as any).exam_language && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                          {(product.mockExamProduct as any).exam_language === 'ar' ? 'Arabic' : 'English'}
                        </Badge>
                      )}
                      {(product.mockExamProduct as any).selection_mode && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                          {(product.mockExamProduct as any).selection_mode === 'random' ? 'Random' :
                           (product.mockExamProduct as any).selection_mode === 'specific' ? 'Specific' : 'User Picks'}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-green-700 font-semibold">
                      {product.mockExamProduct.exams_count} {texts.examsPerPurchase}
                    </div>
                    <div className="text-xs text-green-600">
                      {product.mockExamProduct.validity_months
                        ? `${texts.validFor} ${product.mockExamProduct.validity_months} ${texts.months}`
                        : texts.unlimited}
                    </div>
                    {product.mockExamProduct.specific_exam_ids && product.mockExamProduct.specific_exam_ids.length > 0 && (
                      <div className="text-xs text-green-600">
                        {texts.linkedToSpecificExams}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {product.isLinked ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditDialog(product)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {texts.editLink}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleOpenLinkDialog(product)}
                      className="flex-1"
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      {texts.linkToMockExam}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(product.wooProduct.permalink, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Link/Edit Dialog */}
      <Dialog open={!!selectedProduct && !showDeleteConfirm} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? texts.editProductLink : texts.linkToMockExams}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? texts.editDescription
                : texts.linkDescription}
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              {/* Product Info */}
              <div>
                <Label>{texts.product}</Label>
                <div className="p-3 bg-gray-50 rounded mt-1">
                  <p className="font-semibold text-sm">{selectedProduct.wooProduct.name}</p>
                  <p className="text-xs text-gray-600">
                    ID: {selectedProduct.wooProduct.id} - ${selectedProduct.wooProduct.price}
                  </p>
                </div>
              </div>

              {/* Certification Type & Language */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Certification Type <span className="text-red-500">*</span></Label>
                  <Select
                    value={linkForm.certification_type}
                    onValueChange={(v) => setLinkForm({ ...linkForm, certification_type: v as 'CP' | 'SCP' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CP">BDA-CP</SelectItem>
                      <SelectItem value="SCP">BDA-SCP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Exam Language <span className="text-red-500">*</span></Label>
                  <Select
                    value={linkForm.exam_language}
                    onValueChange={(v) => setLinkForm({ ...linkForm, exam_language: v as 'en' | 'ar' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selection Mode */}
              <div>
                <Label>Selection Mode <span className="text-red-500">*</span></Label>
                <Select
                  value={linkForm.selection_mode}
                  onValueChange={(v) => setLinkForm({ ...linkForm, selection_mode: v as 'random' | 'user_picks' | 'specific' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Random (System selects from pool)</SelectItem>
                    <SelectItem value="user_picks">User Picks (User chooses exams)</SelectItem>
                    <SelectItem value="specific">Specific (Pre-defined exams)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Random: System randomly selects exams matching type & language
                </p>
              </div>

              {/* Exams Count */}
              <div>
                <Label>{texts.examsCount}</Label>
                <Input
                  type="number"
                  min="1"
                  value={linkForm.exams_count}
                  onChange={(e) =>
                    setLinkForm({ ...linkForm, exams_count: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  How many exams this product grants per purchase
                </p>
              </div>

              {/* Validity Months */}
              <div>
                <Label>{texts.validityMonths}</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder={texts.unlimited}
                  value={linkForm.validity_months}
                  onChange={(e) =>
                    setLinkForm({ ...linkForm, validity_months: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">{texts.validityMonthsHint}</p>
              </div>

              {/* Specific Exams - Only show when selection_mode is 'specific' */}
              {linkForm.selection_mode === 'specific' && (
                <div>
                  <Label>{texts.specificExams}</Label>
                  <Select
                    value={linkForm.specific_exam_ids.length > 0 ? linkForm.specific_exam_ids[0] : 'none'}
                    onValueChange={(v) =>
                      setLinkForm({
                        ...linkForm,
                        specific_exam_ids: v === 'none' ? [] : [v],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specific exam" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Select an exam --</SelectItem>
                      {premiumExams
                        .filter(exam =>
                          (!linkForm.certification_type || exam.category === linkForm.certification_type.toLowerCase()) &&
                          (!linkForm.exam_language || exam.language === linkForm.exam_language)
                        )
                        .map((exam) => (
                          <SelectItem key={exam.id} value={exam.id}>
                            {exam.title} ({exam.category?.toUpperCase()} - {exam.language?.toUpperCase()})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Select the specific exam to grant access to</p>
                </div>
              )}

              <DialogFooter className="flex justify-between">
                <div>
                  {isEditMode && (
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {texts.deleteLink}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCloseDialog}>
                    {texts.cancel}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {isEditMode ? texts.updateLink : texts.linkProduct}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{texts.deleteLink}</DialogTitle>
            <DialogDescription>
              {texts.confirmDelete}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              {texts.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {texts.deleteLink}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

MockExamProducts.displayName = 'MockExamProducts';
