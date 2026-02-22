/**
 * Book Products Admin Page
 * Manages which WooCommerce products are classified as books
 * Matches UX pattern of MembershipBenefitBooks page
 */

import { useState } from 'react';
import {
  BookOpen,
  BookMarked,
  RefreshCw,
  CheckCircle,
  Edit,
  ExternalLink,
  Filter,
  Trash2,
  XCircle,
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  useBookProducts,
  useCreateBookProduct,
  useUpdateBookProduct,
  useDeleteBookProduct,
  type BookProduct,
  type BookLanguage,
  type BookFormat,
  type BookCategory,
} from '@/entities/book-products';
import { useWooCommerceProducts, type WooCommerceProduct } from '@/entities/membership-benefit-books';
import { cn } from '@/shared/utils/cn';

type LinkStatus = 'all' | 'marked' | 'not-marked';

interface ProductWithBook {
  wooProduct: WooCommerceProduct;
  bookProduct?: BookProduct;
  isMarked: boolean;
}

export default function BookProductsAdmin() {
  const { toast } = useToast();
  const { language } = useLanguage();

  const t = {
    en: {
      title: 'Book Products',
      pageDescription: 'Define which WooCommerce products are books (vs memberships, certifications, learning systems). Only marked products appear in users\' My Books.',
      totalProducts: 'Total Products',
      marked: 'Marked as Books',
      notMarked: 'Not Marked',
      markStatus: 'Mark Status',
      allProducts: 'All Products',
      markedOnly: 'Books Only',
      notMarkedOnly: 'Not Marked Only',
      refreshFromStore: 'Refresh from Store',
      loading: 'Loading products...',
      noProducts: 'No products found',
      noMarkedProducts: 'No products marked as books',
      noUnmarkedProducts: 'All products are marked',
      syncFromStore: 'Sync products from your WooCommerce store',
      editBook: 'Edit Book',
      markAsBook: 'Mark as Book',
      editBookConfig: 'Edit Book Configuration',
      markAsBookTitle: 'Mark as Book Product',
      editDescription: 'Update book product configuration',
      markDescription: 'Configure this product as a book',
      product: 'Product',
      language: 'Language',
      languageHint: 'Book language',
      english: 'English',
      arabic: 'Arabic',
      format: 'Format',
      formatHint: 'Book format',
      pdf: 'PDF',
      epub: 'EPUB',
      mobi: 'MOBI',
      category: 'Category',
      categoryHint: 'Book category',
      bock: 'BoCK',
      glossary: 'Glossary',
      studyGuide: 'Study Guide',
      handbook: 'Handbook',
      other: 'Other',
      coverImageUrl: 'Cover Image URL',
      coverImageUrlHint: 'Optional cover image URL',
      description: 'Description',
      descriptionHint: 'Optional book description',
      pages: 'Number of Pages',
      pagesHint: 'Optional page count',
      isActive: 'Active',
      cancel: 'Cancel',
      updateBook: 'Update Book',
      markProduct: 'Mark as Book',
      unmarkBook: 'Unmark Book',
      confirmDelete: 'Are you sure you want to unmark this product as a book?',
      success: 'Success',
      error: 'Error',
      bookUpdated: 'Book product updated successfully',
      productMarked: 'Product marked as book successfully',
      bookDeleted: 'Book product unmarked successfully',
      saveFailed: 'Failed to save book product',
      deleteFailed: 'Failed to delete book product',
      refreshed: 'Refreshed',
      productsSynced: 'Products synced from WooCommerce',
    },
    ar: {
      title: 'منتجات الكتب',
      pageDescription: 'حدد منتجات WooCommerce التي تعتبر كتبًا (مقابل العضويات والشهادات وأنظمة التعلم). تظهر المنتجات المحددة فقط في كتبي الخاصة بالمستخدمين.',
      totalProducts: 'إجمالي المنتجات',
      marked: 'محدد ككتب',
      notMarked: 'غير محدد',
      markStatus: 'حالة التحديد',
      allProducts: 'جميع المنتجات',
      markedOnly: 'الكتب فقط',
      notMarkedOnly: 'غير المحدد فقط',
      refreshFromStore: 'تحديث من المتجر',
      loading: 'جارٍ تحميل المنتجات...',
      noProducts: 'لم يتم العثور على منتجات',
      noMarkedProducts: 'لا توجد منتجات محددة ككتب',
      noUnmarkedProducts: 'تم تحديد جميع المنتجات',
      syncFromStore: 'مزامنة المنتجات من متجر WooCommerce',
      editBook: 'تعديل الكتاب',
      markAsBook: 'تحديد ككتاب',
      editBookConfig: 'تعديل إعدادات الكتاب',
      markAsBookTitle: 'تحديد كمنتج كتاب',
      editDescription: 'تحديث إعدادات منتج الكتاب',
      markDescription: 'تكوين هذا المنتج ككتاب',
      product: 'المنتج',
      language: 'اللغة',
      languageHint: 'لغة الكتاب',
      english: 'الإنجليزية',
      arabic: 'العربية',
      format: 'التنسيق',
      formatHint: 'تنسيق الكتاب',
      pdf: 'PDF',
      epub: 'EPUB',
      mobi: 'MOBI',
      category: 'الفئة',
      categoryHint: 'فئة الكتاب',
      bock: 'BoCK',
      glossary: 'المسرد',
      studyGuide: 'دليل الدراسة',
      handbook: 'كتيب',
      other: 'أخرى',
      coverImageUrl: 'رابط صورة الغلاف',
      coverImageUrlHint: 'رابط صورة الغلاف (اختياري)',
      description: 'الوصف',
      descriptionHint: 'وصف الكتاب (اختياري)',
      pages: 'عدد الصفحات',
      pagesHint: 'عدد الصفحات (اختياري)',
      isActive: 'نشط',
      cancel: 'إلغاء',
      updateBook: 'تحديث الكتاب',
      markProduct: 'تحديد ككتاب',
      unmarkBook: 'إلغاء تحديد الكتاب',
      confirmDelete: 'هل أنت متأكد من إلغاء تحديد هذا المنتج ككتاب؟',
      success: 'نجاح',
      error: 'خطأ',
      bookUpdated: 'تم تحديث منتج الكتاب بنجاح',
      productMarked: 'تم تحديد المنتج ككتاب بنجاح',
      bookDeleted: 'تم إلغاء تحديد منتج الكتاب بنجاح',
      saveFailed: 'فشل في حفظ منتج الكتاب',
      deleteFailed: 'فشل في حذف منتج الكتاب',
      refreshed: 'تم التحديث',
      productsSynced: 'تمت مزامنة المنتجات من WooCommerce',
    }
  };

  const texts = t[language];

  // Fetch data
  const { data: wooProducts, isLoading: isLoadingWoo, refetch: refetchWoo } = useWooCommerceProducts();
  const { data: bookProducts, isLoading: isLoadingBooks, refetch: refetchBooks } = useBookProducts();

  // Mutations
  const createMutation = useCreateBookProduct();
  const updateMutation = useUpdateBookProduct();
  const deleteMutation = useDeleteBookProduct();

  // State
  const [linkStatus, setLinkStatus] = useState<LinkStatus>('all');
  const [selectedProduct, setSelectedProduct] = useState<ProductWithBook | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    language: '' as BookLanguage | '',
    format: '' as BookFormat | '',
    category: '' as BookCategory | '',
    cover_image_url: '',
    description: '',
    pages: undefined as number | undefined,
    is_active: true,
  });

  // Combine WooCommerce products with book products
  const productsWithBooks: ProductWithBook[] = (wooProducts || []).map((wooProduct) => {
    const bookProduct = bookProducts?.find(
      (bp) => bp.woocommerce_product_id === wooProduct.id
    );
    return {
      wooProduct,
      bookProduct,
      isMarked: !!bookProduct,
    };
  });

  // Filter products
  const filteredProducts = productsWithBooks.filter((product) => {
    if (linkStatus === 'marked') return product.isMarked;
    if (linkStatus === 'not-marked') return !product.isMarked;
    return true;
  });

  // Stats
  const stats = {
    total: productsWithBooks.length,
    marked: productsWithBooks.filter((p) => p.isMarked).length,
    notMarked: productsWithBooks.filter((p) => !p.isMarked).length,
  };

  // Handlers
  const handleOpenDialog = (product: ProductWithBook) => {
    setSelectedProduct(product);
    if (product.bookProduct) {
      setFormData({
        language: product.bookProduct.language || '',
        format: product.bookProduct.format || '',
        category: product.bookProduct.category || '',
        cover_image_url: product.bookProduct.cover_image_url || '',
        description: product.bookProduct.description || '',
        pages: product.bookProduct.pages,
        is_active: product.bookProduct.is_active,
      });
    } else {
      setFormData({
        language: '',
        format: '',
        category: '',
        cover_image_url: product.wooProduct.images?.[0]?.src || '',
        description: product.wooProduct.short_description || '',
        pages: undefined,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedProduct) return;

    try {
      if (selectedProduct.bookProduct) {
        // Update existing
        await updateMutation.mutateAsync({
          id: selectedProduct.bookProduct.id,
          dto: {
            product_name: selectedProduct.wooProduct.name,
            product_sku: selectedProduct.wooProduct.sku,
            language: formData.language || undefined,
            format: formData.format || undefined,
            category: formData.category || undefined,
            cover_image_url: formData.cover_image_url || undefined,
            description: formData.description || undefined,
            pages: formData.pages,
            is_active: formData.is_active,
          },
        });
        toast({ title: texts.success, description: texts.bookUpdated });
      } else {
        // Create new
        await createMutation.mutateAsync({
          woocommerce_product_id: selectedProduct.wooProduct.id,
          product_name: selectedProduct.wooProduct.name,
          product_sku: selectedProduct.wooProduct.sku,
          language: formData.language || undefined,
          format: formData.format || undefined,
          category: formData.category || undefined,
          cover_image_url: formData.cover_image_url || undefined,
          description: formData.description || undefined,
          pages: formData.pages,
          is_active: formData.is_active,
        });
        toast({ title: texts.success, description: texts.productMarked });
      }
      setIsDialogOpen(false);
      refetchBooks();
    } catch (error: any) {
      toast({
        title: texts.error,
        description: error.message || texts.saveFailed,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (product: ProductWithBook) => {
    if (!product.bookProduct) return;
    if (!confirm(texts.confirmDelete)) return;

    try {
      await deleteMutation.mutateAsync(product.bookProduct.id);
      toast({ title: texts.success, description: texts.bookDeleted });
      refetchBooks();
    } catch (error: any) {
      toast({
        title: texts.error,
        description: error.message || texts.deleteFailed,
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchWoo(), refetchBooks()]);
    toast({ title: texts.refreshed, description: texts.productsSynced });
  };

  const isLoading = isLoadingWoo || isLoadingBooks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BookMarked className="h-8 w-8 text-royal-600" />
          {texts.title}
        </h1>
        <p className="text-gray-600 mt-1">{texts.pageDescription}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">{texts.totalProducts}</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">{texts.marked}</div>
            <div className="text-2xl font-bold text-green-600">{stats.marked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">{texts.notMarked}</div>
            <div className="text-2xl font-bold text-gray-500">{stats.notMarked}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">{texts.markStatus}:</span>
        </div>
        <Button
          variant={linkStatus === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLinkStatus('all')}
        >
          {texts.allProducts}
        </Button>
        <Button
          variant={linkStatus === 'marked' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLinkStatus('marked')}
        >
          {texts.markedOnly}
        </Button>
        <Button
          variant={linkStatus === 'not-marked' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLinkStatus('not-marked')}
        >
          {texts.notMarkedOnly}
        </Button>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            {texts.refreshFromStore}
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-4 border-royal-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">{texts.loading}</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              {linkStatus === 'marked'
                ? texts.noMarkedProducts
                : linkStatus === 'not-marked'
                ? texts.noUnmarkedProducts
                : texts.noProducts}
            </p>
            <p className="text-sm text-gray-500">{texts.syncFromStore}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card
              key={product.wooProduct.id}
              className={cn(
                'hover:shadow-lg transition-shadow cursor-pointer',
                product.isMarked && 'border-green-500 border-2'
              )}
              onClick={() => handleOpenDialog(product)}
            >
              <CardContent className="p-4">
                {/* Product Image */}
                {product.wooProduct.images?.[0]?.src && (
                  <img
                    src={product.wooProduct.images[0].src}
                    alt={product.wooProduct.name}
                    className="w-full h-32 object-cover rounded mb-3"
                  />
                )}

                {/* Product Name */}
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {product.wooProduct.name}
                </h3>

                {/* Product Info */}
                <div className="space-y-2 text-sm text-gray-600">
                  {product.wooProduct.sku && (
                    <div>SKU: {product.wooProduct.sku}</div>
                  )}
                  <div>ID: {product.wooProduct.id}</div>
                </div>

                {/* Status Badge */}
                <div className="mt-3 flex items-center gap-2">
                  {product.isMarked ? (
                    <>
                      <Badge className="bg-green-100 text-green-700 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Book
                      </Badge>
                      {product.bookProduct?.language && (
                        <Badge variant="outline">
                          {product.bookProduct.language === 'en' ? texts.english : texts.arabic}
                        </Badge>
                      )}
                      {product.bookProduct?.format && (
                        <Badge variant="outline" className="uppercase">
                          {product.bookProduct.format}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      <XCircle className="h-3 w-3 mr-1" />
                      {texts.notMarked}
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog(product);
                    }}
                  >
                    {product.isMarked ? (
                      <>
                        <Edit className="h-3 w-3 mr-1" />
                        {texts.editBook}
                      </>
                    ) : (
                      <>
                        <BookMarked className="h-3 w-3 mr-1" />
                        {texts.markAsBook}
                      </>
                    )}
                  </Button>
                  {product.isMarked && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(product);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Mark Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct?.isMarked ? texts.editBookConfig : texts.markAsBookTitle}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.isMarked ? texts.editDescription : texts.markDescription}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <Label className="text-xs text-gray-600">{texts.product}</Label>
                <div className="font-medium">{selectedProduct.wooProduct.name}</div>
                <div className="text-sm text-gray-500">ID: {selectedProduct.wooProduct.id}</div>
              </div>

              {/* Language */}
              <div className="space-y-2">
                <Label>{texts.language}</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData({ ...formData, language: value as BookLanguage })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={texts.languageHint} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{texts.english}</SelectItem>
                    <SelectItem value="ar">{texts.arabic}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Format */}
              <div className="space-y-2">
                <Label>{texts.format}</Label>
                <Select
                  value={formData.format}
                  onValueChange={(value) => setFormData({ ...formData, format: value as BookFormat })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={texts.formatHint} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">{texts.pdf}</SelectItem>
                    <SelectItem value="epub">{texts.epub}</SelectItem>
                    <SelectItem value="mobi">{texts.mobi}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>{texts.category}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as BookCategory })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={texts.categoryHint} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bock">{texts.bock}</SelectItem>
                    <SelectItem value="glossary">{texts.glossary}</SelectItem>
                    <SelectItem value="study-guide">{texts.studyGuide}</SelectItem>
                    <SelectItem value="handbook">{texts.handbook}</SelectItem>
                    <SelectItem value="other">{texts.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cover Image URL */}
              <div className="space-y-2">
                <Label>{texts.coverImageUrl}</Label>
                <Input
                  value={formData.cover_image_url}
                  onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                  placeholder={texts.coverImageUrlHint}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>{texts.description}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={texts.descriptionHint}
                  rows={3}
                />
              </div>

              {/* Pages */}
              <div className="space-y-2">
                <Label>{texts.pages}</Label>
                <Input
                  type="number"
                  value={formData.pages || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, pages: e.target.value ? parseInt(e.target.value) : undefined })
                  }
                  placeholder={texts.pagesHint}
                />
              </div>

              {/* Active */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active">{texts.isActive}</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {texts.cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {selectedProduct?.isMarked ? texts.updateBook : texts.markProduct}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

BookProductsAdmin.displayName = 'BookProductsAdmin';
