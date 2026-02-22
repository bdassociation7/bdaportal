import { useState } from 'react';
import {
  BookOpen,
  Link as LinkIcon,
  RefreshCw,
  CheckCircle,
  Edit,
  ExternalLink,
  Filter,
  Trash2,
  FileText,
  Award,
  Gift,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { useToast } from '@/hooks/use-toast';
import {
  useMembershipBenefitBooks,
  useCreateMembershipBenefitBook,
  useUpdateMembershipBenefitBook,
  useDeleteMembershipBenefitBook,
  useWooCommerceProducts,
  useGrantAllBookCredits,
} from '@/entities/membership-benefit-books';
import type {
  MembershipBenefitBook,
  CreateMembershipBenefitBookDTO,
  WooCommerceProduct,
  MembershipType,
  BookLanguage,
} from '@/entities/membership-benefit-books';
import { cn } from '@/shared/utils/cn';

type LinkStatus = 'all' | 'linked' | 'not-linked';

interface ProductWithLink {
  wooProduct: WooCommerceProduct;
  benefitBook?: MembershipBenefitBook;
  isLinked: boolean;
}

export default function MembershipBenefitBooks() {
  const { toast } = useToast();
  const { language } = useLanguage();

  const t = {
    en: {
      title: 'Membership Benefit Books',
      description: 'Map WooCommerce book products to membership types. Users with active memberships automatically get access to these books without purchase.',
      totalProducts: 'Total Products',
      linked: 'Linked',
      notLinked: 'Not Linked',
      linkStatus: 'Link Status',
      allProducts: 'All Products',
      linkedOnly: 'Linked Only',
      notLinkedOnly: 'Not Linked Only',
      refreshFromStore: 'Refresh from Store',
      grantAllCredits: 'Grant Book Credits',
      grantingCredits: 'Granting Credits...',
      creditsGranted: 'Credits Granted',
      creditsGrantedDesc: 'Granted {count} book credits to active members',
      creditsGrantFailed: 'Failed to Grant Credits',
      loading: 'Loading products...',
      noProducts: 'No products found',
      noLinkedProducts: 'No linked products',
      noUnlinkedProducts: 'No unlinked products',
      syncFromStore: 'Sync products from your WooCommerce store',
      editLink: 'Edit Link',
      linkToMembership: 'Link to Membership',
      editProductLink: 'Edit Membership Mapping',
      linkToMembershipTypes: 'Link to Membership',
      editDescription: 'Change which membership type has access to this book',
      linkDescription: 'Select which membership type gets access to this book',
      product: 'Product',
      membershipType: 'Membership Type',
      basic: 'Basic Membership',
      professional: 'Professional Membership',
      bookProductGroup: 'Book Product Group',
      bookProductGroupHint: 'Groups language versions together (e.g., "bda-bock")',
      language: 'Language',
      languageHint: 'Which language is this book version',
      english: 'English',
      arabic: 'Arabic',
      bookFormat: 'Book Format',
      downloadUrl: 'Download URL',
      downloadUrlHint: 'Full URL or path to the book file (e.g., /resources/book.pdf)',
      coverImageUrl: 'Cover Image URL',
      coverImageUrlHint: 'Optional book cover image URL',
      bookDescription: 'Description',
      bookDescriptionHint: 'Optional book description',
      pages: 'Number of Pages',
      pagesHint: 'Optional page count',
      isActive: 'Active',
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
      title: 'كتب مزايا العضوية',
      description: 'ربط منتجات الكتب من WooCommerce بأنواع العضوية. يحصل المستخدمون ذوو العضويات النشطة تلقائيًا على وصول إلى هذه الكتب دون شراء.',
      totalProducts: 'إجمالي المنتجات',
      linked: 'مرتبط',
      notLinked: 'غير مرتبط',
      linkStatus: 'حالة الربط',
      allProducts: 'جميع المنتجات',
      linkedOnly: 'المرتبطة فقط',
      notLinkedOnly: 'غير المرتبطة فقط',
      refreshFromStore: 'تحديث من المتجر',
      grantAllCredits: 'منح أرصدة الكتب',
      grantingCredits: 'جارٍ منح الأرصدة...',
      creditsGranted: 'تم منح الأرصدة',
      creditsGrantedDesc: 'تم منح {count} رصيد كتاب للأعضاء النشطين',
      creditsGrantFailed: 'فشل في منح الأرصدة',
      loading: 'جارٍ تحميل المنتجات...',
      noProducts: 'لم يتم العثور على منتجات',
      noLinkedProducts: 'لا توجد منتجات مرتبطة',
      noUnlinkedProducts: 'لا توجد منتجات غير مرتبطة',
      syncFromStore: 'مزامنة المنتجات من متجر WooCommerce الخاص بك',
      editLink: 'تعديل الربط',
      linkToMembership: 'ربط بالعضوية',
      editProductLink: 'تعديل ربط العضوية',
      linkToMembershipTypes: 'ربط بالعضوية',
      editDescription: 'تغيير نوع العضوية الذي يمكنه الوصول إلى هذا الكتاب',
      linkDescription: 'اختر نوع العضوية الذي يحصل على وصول إلى هذا الكتاب',
      product: 'المنتج',
      membershipType: 'نوع العضوية',
      basic: 'عضوية أساسية',
      professional: 'عضوية احترافية',
      bookProductGroup: 'مجموعة منتجات الكتاب',
      bookProductGroupHint: 'يجمع إصدارات اللغة معًا (على سبيل المثال، "bda-bock")',
      language: 'اللغة',
      languageHint: 'ما هي لغة هذا الإصدار من الكتاب',
      english: 'الإنجليزية',
      arabic: 'العربية',
      bookFormat: 'تنسيق الكتاب',
      downloadUrl: 'رابط التحميل',
      downloadUrlHint: 'عنوان URL كامل أو مسار ملف الكتاب (مثل: /resources/book.pdf)',
      coverImageUrl: 'رابط صورة الغلاف',
      coverImageUrlHint: 'رابط صورة غلاف الكتاب (اختياري)',
      bookDescription: 'الوصف',
      bookDescriptionHint: 'وصف الكتاب (اختياري)',
      pages: 'عدد الصفحات',
      pagesHint: 'عدد الصفحات (اختياري)',
      isActive: 'نشط',
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
  const { data: benefitBooks, isLoading: isLoadingBenefits, refetch: refetchBenefits } = useMembershipBenefitBooks();

  // Mutations
  const createMutation = useCreateMembershipBenefitBook();
  const updateMutation = useUpdateMembershipBenefitBook();
  const deleteMutation = useDeleteMembershipBenefitBook();
  const grantCreditsMutation = useGrantAllBookCredits();

  // Filters
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('all');

  // Dialog state
  const [selectedProduct, setSelectedProduct] = useState<ProductWithLink | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkForm, setLinkForm] = useState({
    membership_type: 'professional' as MembershipType,
    book_product_group: '',
    language: 'en' as BookLanguage,
  });

  // Combine WooCommerce products with benefit book links
  const productsWithLinks: ProductWithLink[] =
    wooProducts?.map((wooProduct) => {
      const benefitBook = benefitBooks?.find(
        (bb) => bb.woocommerce_product_id === wooProduct.id
      );
      return {
        wooProduct,
        benefitBook,
        isLinked: !!benefitBook,
      };
    }) || [];

  // Apply filters
  const filteredProducts = productsWithLinks.filter((p) => {
    if (linkStatus === 'linked') return p.isLinked;
    if (linkStatus === 'not-linked') return !p.isLinked;
    return true;
  });

  const isLoading = isLoadingWoo || isLoadingBenefits;

  const handleOpenLinkDialog = (product: ProductWithLink) => {
    setSelectedProduct(product);
    setIsEditMode(false);
    setLinkForm({
      membership_type: 'professional',
      book_product_group: '',
      language: 'en',
    });
  };

  const handleOpenEditDialog = (product: ProductWithLink) => {
    if (!product.benefitBook) return;
    setSelectedProduct(product);
    setIsEditMode(true);
    setLinkForm({
      membership_type: product.benefitBook.membership_type,
      book_product_group: product.benefitBook.book_product_group || '',
      language: product.benefitBook.language || 'en',
    });
  };

  const handleCloseDialog = () => {
    setSelectedProduct(null);
    setIsEditMode(false);
    setShowDeleteConfirm(false);
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;

    // Validate required fields
    if (!linkForm.book_product_group || !linkForm.book_product_group.trim()) {
      toast({
        title: texts.error,
        description: 'Book Product Group is required for book credits to work properly',
        variant: 'destructive',
      });
      return;
    }

    if (!linkForm.language) {
      toast({
        title: texts.error,
        description: 'Language is required for book credits to work properly',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isEditMode && selectedProduct.benefitBook) {
        // Update existing link
        await updateMutation.mutateAsync({
          id: selectedProduct.benefitBook.id,
          dto: {
            membership_type: linkForm.membership_type,
            book_product_group: linkForm.book_product_group,
            language: linkForm.language,
          },
        });
        toast({ title: texts.success, description: texts.linkUpdated });
      } else {
        // Create new link
        const createPayload: CreateMembershipBenefitBookDTO = {
          woocommerce_product_id: selectedProduct.wooProduct.id,
          product_name: selectedProduct.wooProduct.name,
          product_sku: selectedProduct.wooProduct.sku,
          membership_type: linkForm.membership_type,
          book_product_group: linkForm.book_product_group,
          language: linkForm.language,
        };
        await createMutation.mutateAsync(createPayload);
        toast({ title: texts.success, description: texts.productLinked });
      }

      refetchBenefits();
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
    if (!selectedProduct?.benefitBook) return;

    try {
      await deleteMutation.mutateAsync(selectedProduct.benefitBook.id);
      toast({ title: texts.success, description: texts.linkDeleted });
      refetchBenefits();
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
    await Promise.all([refetchWoo(), refetchBenefits()]);
    toast({ title: texts.refreshed, description: texts.productsSynced });
  };

  const handleGrantAllCredits = async () => {
    try {
      const result = await grantCreditsMutation.mutateAsync();
      toast({
        title: texts.creditsGranted,
        description: texts.creditsGrantedDesc.replace('{count}', result.granted.toString()),
      });
    } catch (error: any) {
      toast({
        title: texts.creditsGrantFailed,
        description: error.message,
        variant: 'destructive',
      });
    }
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
          <BookOpen className="h-8 w-8" />
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
              <div className="flex items-end gap-2">
                <Button onClick={handleRefresh} disabled={isLoading} variant="outline" className="flex-1">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  {texts.refreshFromStore}
                </Button>
                <Button
                  onClick={handleGrantAllCredits}
                  disabled={grantCreditsMutation.isPending || stats.linked === 0}
                  className="flex-1"
                >
                  <Gift className={`h-4 w-4 mr-2 ${grantCreditsMutation.isPending ? 'animate-pulse' : ''}`} />
                  {grantCreditsMutation.isPending ? texts.grantingCredits : texts.grantAllCredits}
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
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
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
                  {product.wooProduct.image && (
                    <img
                      src={product.wooProduct.image}
                      alt={product.wooProduct.name}
                      className="w-16 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">
                      {product.wooProduct.name}
                    </h3>
                    <p className="text-xs text-gray-600">
                      SKU: {product.wooProduct.sku || 'N/A'}
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
                {product.isLinked && product.benefitBook && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                    <div className="flex items-center gap-1 text-xs text-blue-700 font-semibold">
                      <Award className="h-3 w-3" />
                      {product.benefitBook.membership_type === 'professional'
                        ? texts.professional
                        : texts.basic}
                    </div>
                    {product.benefitBook.language && (
                      <div className="text-xs text-blue-600">
                        {product.benefitBook.language === 'en' ? texts.english : texts.arabic}
                      </div>
                    )}
                    {product.benefitBook.book_product_group && (
                      <div className="text-xs text-blue-500">
                        Group: {product.benefitBook.book_product_group}
                      </div>
                    )}
                    {product.benefitBook.format && (
                      <div className="text-xs text-blue-600 uppercase">
                        {product.benefitBook.format}
                      </div>
                    )}
                    {!product.benefitBook.is_active && (
                      <Badge variant="outline" className="text-xs">
                        Inactive
                      </Badge>
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
                      {texts.linkToMembership}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? texts.editProductLink : texts.linkToMembershipTypes}</DialogTitle>
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
                    ID: {selectedProduct.wooProduct.id} | SKU: {selectedProduct.wooProduct.sku}
                  </p>
                </div>
              </div>

              {/* Membership Type */}
              <div>
                <Label>{texts.membershipType}</Label>
                <Select
                  value={linkForm.membership_type}
                  onValueChange={(v) =>
                    setLinkForm({ ...linkForm, membership_type: v as MembershipType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">{texts.basic}</SelectItem>
                    <SelectItem value="professional">{texts.professional}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Book Product Group */}
              <div>
                <Label className="text-red-600">
                  {texts.bookProductGroup} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={linkForm.book_product_group}
                  onChange={(e) =>
                    setLinkForm({ ...linkForm, book_product_group: e.target.value })
                  }
                  placeholder="bda-bock"
                  required
                  className={cn(
                    !linkForm.book_product_group && 'border-red-300'
                  )}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {texts.bookProductGroupHint}{' '}
                  <span className="text-red-600 font-semibold">Required for book credits!</span>
                </p>
              </div>

              {/* Language */}
              <div>
                <Label className="text-red-600">
                  {texts.language} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={linkForm.language}
                  onValueChange={(v) =>
                    setLinkForm({ ...linkForm, language: v as BookLanguage })
                  }
                  required
                >
                  <SelectTrigger className={cn(
                    !linkForm.language && 'border-red-300'
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{texts.english}</SelectItem>
                    <SelectItem value="ar">{texts.arabic}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {texts.languageHint}{' '}
                  <span className="text-red-600 font-semibold">Required for book credits!</span>
                </p>
              </div>

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

MembershipBenefitBooks.displayName = 'MembershipBenefitBooks';
