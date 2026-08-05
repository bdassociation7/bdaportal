import { useState } from 'react';
import {
  Package,
  Link as LinkIcon,
  RefreshCw,
  CheckCircle,
  Edit,
  ExternalLink,
  Filter,
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
  useAllCertificationProducts,
  useCreateCertificationProduct,
  useUpdateCertificationProduct,
  useActiveQuizzes,
  type CertificationType,
  type CertificationProduct,
} from '@/entities/quiz';
import type { WooCommerceProduct } from '@/entities/woocommerce';
import { cn } from '@/shared/utils/cn';

type LinkStatus = 'all' | 'linked' | 'not-linked';

interface ProductWithLink {
  wooProduct: WooCommerceProduct;
  certProduct?: CertificationProduct;
  isLinked: boolean;
}

export default function CertificationProductsUnified() {
  const { toast } = useToast();
  const { language } = useLanguage();

  const t = {
    en: {
      title: 'Certification Products',
      description: 'Link WooCommerce products to certification exams and configure voucher generation',
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
      linkToCert: 'Link to Cert',
      vouchersPerPurchase: 'voucher(s) per purchase',
      validFor: 'Valid for',
      months: 'months',
      linkedToQuiz: 'Linked to specific quiz',
      editProductLink: 'Edit Product Link',
      linkToCertification: 'Link to Certification',
      editDescription: 'Update certification configuration for this product',
      linkDescription: 'Configure how this product generates certification vouchers',
      product: 'Product',
      certificationType: 'Certification Type',
      linkedQuizOptional: 'Linked Quiz (Optional)',
      anyQuiz: 'Any quiz',
      vouchersLabel: 'Vouchers / Purchase',
      validityMonths: 'Validity (Months)',
      cancel: 'Cancel',
      updateLink: 'Update Link',
      linkProduct: 'Link Product',
      success: 'Success',
      error: 'Error',
      linkUpdated: 'Product link updated successfully',
      productLinked: 'Product linked successfully',
      saveFailed: 'Failed to save product link',
      refreshed: 'Refreshed',
      productsSynced: 'Products synced from WooCommerce',
      cpLabel: 'BDA-CP - BDA Certified Professional',
      scpLabel: 'BDA-SCP - BDA Senior Certified Professional',
    },
    ar: {
      title: 'منتجات الشهادات',
      description: 'ربط منتجات WooCommerce بامتحانات الشهادات وتكوين إنشاء القسائم',
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
      linkToCert: 'ربط بالشهادة',
      vouchersPerPurchase: 'قسيمة/قسائم لكل عملية شراء',
      validFor: 'صالح لمدة',
      months: 'شهر',
      linkedToQuiz: 'مرتبط باختبار محدد',
      editProductLink: 'تعديل ربط المنتج',
      linkToCertification: 'ربط بالشهادة',
      editDescription: 'تحديث تكوين الشهادة لهذا المنتج',
      linkDescription: 'تكوين كيفية إنشاء هذا المنتج لقسائم الشهادة',
      product: 'المنتج',
      certificationType: 'نوع الشهادة',
      linkedQuizOptional: 'الاختبار المرتبط (اختياري)',
      anyQuiz: 'أي اختبار',
      vouchersLabel: 'القسائم / الشراء',
      validityMonths: 'الصلاحية (بالأشهر)',
      cancel: 'إلغاء',
      updateLink: 'تحديث الربط',
      linkProduct: 'ربط المنتج',
      success: 'نجاح',
      error: 'خطأ',
      linkUpdated: 'تم تحديث ربط المنتج بنجاح',
      productLinked: 'تم ربط المنتج بنجاح',
      saveFailed: 'فشل في حفظ ربط المنتج',
      refreshed: 'تم التحديث',
      productsSynced: 'تمت مزامنة المنتجات من WooCommerce',
      cpLabel: 'BDA-CP - محترف معتمد',
      scpLabel: 'BDA-SCP - محترف معتمد أول',
    }
  };

  const texts = t[language];

  // Fetch data
  const { data: wooProducts, isLoading: isLoadingWoo, refetch: refetchWoo } = useWooCommerceProducts();
  const { data: certProducts, isLoading: isLoadingCert, refetch: refetchCert } = useAllCertificationProducts();
  const { data: quizzes } = useActiveQuizzes();

  // Mutations
  const createMutation = useCreateCertificationProduct();
  const updateMutation = useUpdateCertificationProduct();

  // Filters
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('all');

  // Dialog state
  const [selectedProduct, setSelectedProduct] = useState<ProductWithLink | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [linkForm, setLinkForm] = useState({
    certification_type: 'CP' as CertificationType,
    quiz_id: '',
    vouchers_per_purchase: '1',
    voucher_validity_months: '6',
  });

  // Combine WooCommerce products with certification product links
  const productsWithLinks: ProductWithLink[] =
    wooProducts?.map((wooProduct) => {
      const certProduct = certProducts?.find(
        (cp) => cp.woocommerce_product_id === wooProduct.id
      );
      return {
        wooProduct,
        certProduct,
        isLinked: !!certProduct,
      };
    }) || [];

  // Apply filters
  const filteredProducts = productsWithLinks.filter((p) => {
    if (linkStatus === 'linked') return p.isLinked;
    if (linkStatus === 'not-linked') return !p.isLinked;
    return true;
  });

  const isLoading = isLoadingWoo || isLoadingCert;

  const handleOpenLinkDialog = (product: ProductWithLink) => {
    setSelectedProduct(product);
    setIsEditMode(false);
    setLinkForm({
      certification_type: 'CP',
      quiz_id: '',
      vouchers_per_purchase: '1',
      voucher_validity_months: '6',
    });
  };

  const handleOpenEditDialog = (product: ProductWithLink) => {
    if (!product.certProduct) return;
    setSelectedProduct(product);
    setIsEditMode(true);
    setLinkForm({
      certification_type: product.certProduct.certification_type,
      quiz_id: product.certProduct.quiz_id || '',
      vouchers_per_purchase: product.certProduct.vouchers_per_purchase.toString(),
      voucher_validity_months: product.certProduct.voucher_validity_months.toString(),
    });
  };

  const handleCloseDialog = () => {
    setSelectedProduct(null);
    setIsEditMode(false);
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;

    try {
      if (isEditMode && selectedProduct.certProduct) {
        // Update existing link
        await updateMutation.mutateAsync({
          id: selectedProduct.certProduct.id,
          dto: {
            certification_type: linkForm.certification_type,
            quiz_id: linkForm.quiz_id || undefined,
            vouchers_per_purchase: parseInt(linkForm.vouchers_per_purchase),
            voucher_validity_months: parseInt(linkForm.voucher_validity_months),
          },
        });
        toast({ title: texts.success, description: texts.linkUpdated });
      } else {
        // Create new link
        await createMutation.mutateAsync({
          woocommerce_product_id: selectedProduct.wooProduct.id,
          woocommerce_product_name: selectedProduct.wooProduct.name,
          woocommerce_product_sku: selectedProduct.wooProduct.sku || undefined,
          certification_type: linkForm.certification_type,
          quiz_id: linkForm.quiz_id || undefined,
          vouchers_per_purchase: parseInt(linkForm.vouchers_per_purchase),
          voucher_validity_months: parseInt(linkForm.voucher_validity_months),
        });
        toast({ title: texts.success, description: texts.productLinked });
      }

      refetchCert();
      handleCloseDialog();
    } catch (error: any) {
      toast({
        title: texts.error,
        description: error.message || texts.saveFailed,
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchWoo(), refetchCert()]);
    toast({ title: texts.refreshed, description: texts.productsSynced });
  };

  const stats = {
    total: productsWithLinks.length,
    linked: productsWithLinks.filter((p) => p.isLinked).length,
    notLinked: productsWithLinks.filter((p) => !p.isLinked).length,
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
                {product.isLinked && product.certProduct && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg space-y-1">
                    <div className="text-xs text-green-700 font-semibold">
                      {product.certProduct.certification_type === 'CP' ? 'BDA-CP' : 'BDA-SCP'}
                    </div>
                    <div className="text-xs text-green-600">
                      {product.certProduct.vouchers_per_purchase} {texts.vouchersPerPurchase}
                    </div>
                    <div className="text-xs text-green-600">
                      {texts.validFor} {product.certProduct.voucher_validity_months} {texts.months}
                    </div>
                    {product.certProduct.quiz_id && (
                      <div className="text-xs text-green-600">
                        {texts.linkedToQuiz}
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
                      {texts.linkToCert}
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
      <Dialog open={!!selectedProduct} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? texts.editProductLink : texts.linkToCertification}</DialogTitle>
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
                    ID: {selectedProduct.wooProduct.id} • ${selectedProduct.wooProduct.price}
                  </p>
                </div>
              </div>

              {/* Certification Type */}
              <div>
                <Label>{texts.certificationType}</Label>
                <Select
                  value={linkForm.certification_type}
                  onValueChange={(v) =>
                    setLinkForm({ ...linkForm, certification_type: v as CertificationType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CP">{texts.cpLabel}</SelectItem>
                    <SelectItem value="SCP">{texts.scpLabel}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Linked Quiz */}
              <div>
                <Label>{texts.linkedQuizOptional}</Label>
                <Select
                  value={linkForm.quiz_id || 'none'}
                  onValueChange={(v) => setLinkForm({ ...linkForm, quiz_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={texts.anyQuiz} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{texts.anyQuiz}</SelectItem>
                    {quizzes
                      ?.filter((q) => q.certification_type === linkForm.certification_type)
                      .map((quiz) => (
                        <SelectItem key={quiz.id} value={quiz.id}>
                          {quiz.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vouchers per Purchase */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{texts.vouchersLabel}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={linkForm.vouchers_per_purchase}
                    onChange={(e) =>
                      setLinkForm({ ...linkForm, vouchers_per_purchase: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>{texts.validityMonths}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={linkForm.voucher_validity_months}
                    onChange={(e) =>
                      setLinkForm({ ...linkForm, voucher_validity_months: e.target.value })
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  {texts.cancel}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {isEditMode ? texts.updateLink : texts.linkProduct}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

CertificationProductsUnified.displayName = 'CertificationProductsUnified';
