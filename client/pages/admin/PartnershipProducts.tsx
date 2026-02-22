import { useState } from 'react';
import {
  Handshake,
  Link as LinkIcon,
  RefreshCw,
  CheckCircle,
  Edit,
  ExternalLink,
  Filter,
  Trash2,
  Plus,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useWooCommerceProducts } from '@/entities/woocommerce';
import { useAllCertificationProducts } from '@/entities/quiz';
import {
  usePartnershipMappings,
  useCreatePartnershipMapping,
  useUpdatePartnershipMapping,
  useDeletePartnershipMapping,
  type PartnershipProductMapping,
  type PartnershipType,
} from '@/entities/partnership';
import type { WooCommerceProduct } from '@/entities/woocommerce';
import { cn } from '@/shared/utils/cn';

type LinkStatus = 'all' | 'linked' | 'not-linked';

interface ProductWithLink {
  wooProduct: WooCommerceProduct;
  partnershipMapping?: PartnershipProductMapping;
  isLinked: boolean;
}

export default function PartnershipProducts() {
  const { toast } = useToast();
  const { language } = useLanguage();

  const t = {
    en: {
      title: 'Partnership Products',
      description: 'Link WooCommerce products to PDP/ECP partnerships for automatic account activation',
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
      linkToPartnership: 'Link to Partnership',
      validFor: 'Valid for',
      months: 'months',
      maxPrograms: 'Max Programs',
      programs: 'programs',
      editProductLink: 'Edit Product Link',
      linkToPartnershipTitle: 'Link to Partnership',
      editDescription: 'Update partnership configuration for this product',
      linkDescription: 'Configure how this product activates partnership accounts',
      product: 'Product',
      partnershipType: 'Partnership Type',
      pdpLabel: 'PDP - Professional Development Provider',
      ecpLabel: 'ECP - Endorsed Certification Partner',
      licenseDuration: 'License Duration (Months)',
      maxProgramsLabel: 'Max Programs (PDP only)',
      tier: 'Tier',
      isActive: 'Active',
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
      deleteConfirmTitle: 'Delete Link',
      deleteConfirmDescription: 'Are you sure you want to remove this product link? This will not delete the WooCommerce product.',
      deleteSuccess: 'Product link removed successfully',
      deleteFailed: 'Failed to remove product link',
      delete: 'Delete',
    },
    ar: {
      title: 'منتجات الشراكة',
      description: 'ربط منتجات WooCommerce بشراكات PDP/ECP للتفعيل التلقائي للحسابات',
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
      linkToPartnership: 'ربط بالشراكة',
      validFor: 'صالح لمدة',
      months: 'شهر',
      maxPrograms: 'الحد الأقصى للبرامج',
      programs: 'برنامج',
      editProductLink: 'تعديل ربط المنتج',
      linkToPartnershipTitle: 'ربط بالشراكة',
      editDescription: 'تحديث تكوين الشراكة لهذا المنتج',
      linkDescription: 'تكوين كيفية تفعيل هذا المنتج لحسابات الشراكة',
      product: 'المنتج',
      partnershipType: 'نوع الشراكة',
      pdpLabel: 'PDP - مزود التطوير المهني',
      ecpLabel: 'ECP - شريك الشهادات المعتمد',
      licenseDuration: 'مدة الترخيص (بالأشهر)',
      maxProgramsLabel: 'الحد الأقصى للبرامج (PDP فقط)',
      tier: 'المستوى',
      isActive: 'نشط',
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
      deleteConfirmTitle: 'حذف الربط',
      deleteConfirmDescription: 'هل أنت متأكد من إزالة ربط هذا المنتج؟ لن يتم حذف منتج WooCommerce.',
      deleteSuccess: 'تم إزالة ربط المنتج بنجاح',
      deleteFailed: 'فشل في إزالة ربط المنتج',
      delete: 'حذف',
    }
  };

  const texts = t[language];

  // Data fetching
  const { data: wooProducts, isLoading: wooLoading, refetch: refetchWoo } = useWooCommerceProducts();
  const { data: partnershipMappings, isLoading: mappingsLoading } = usePartnershipMappings();
  const { data: certificationProducts, isLoading: certLoading } = useAllCertificationProducts();

  // Mutations
  const createMapping = useCreatePartnershipMapping();
  const updateMapping = useUpdatePartnershipMapping();
  const deleteMapping = useDeletePartnershipMapping();

  // UI State
  const [linkFilter, setLinkFilter] = useState<LinkStatus>('all');
  const [editingProduct, setEditingProduct] = useState<ProductWithLink | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<PartnershipProductMapping | null>(null);

  // Form state for editing
  const [formData, setFormData] = useState({
    partnershipType: 'pdp' as PartnershipType,
    licenseDuration: 12,
    maxPrograms: 5,
    tier: 'standard',
    isActive: true,
  });

  // Get certification product IDs to exclude them from the list
  const certificationProductIds = new Set(
    (certificationProducts || []).map(p => p.woocommerce_product_id)
  );

  // Combine WooCommerce products with partnership mappings (excluding certification products)
  const productsWithLinks: ProductWithLink[] = (wooProducts || [])
    .filter(wooProduct => !certificationProductIds.has(wooProduct.id))
    .map(wooProduct => {
    const partnershipMapping = partnershipMappings?.find(
      m => m.woocommerce_product_id === wooProduct.id
    );
    return {
      wooProduct,
      partnershipMapping,
      isLinked: !!partnershipMapping,
    };
  });

  // Filter products based on link status
  const filteredProducts = productsWithLinks.filter(p => {
    if (linkFilter === 'linked') return p.isLinked;
    if (linkFilter === 'not-linked') return !p.isLinked;
    return true;
  });

  // Stats
  const linkedCount = productsWithLinks.filter(p => p.isLinked).length;
  const notLinkedCount = productsWithLinks.length - linkedCount;

  const handleEditClick = (product: ProductWithLink) => {
    setEditingProduct(product);
    if (product.partnershipMapping) {
      setFormData({
        partnershipType: product.partnershipMapping.partnership_type,
        licenseDuration: product.partnershipMapping.license_duration_months,
        maxPrograms: product.partnershipMapping.max_programs || 5,
        tier: product.partnershipMapping.tier,
        isActive: product.partnershipMapping.is_active,
      });
    } else {
      setFormData({
        partnershipType: 'pdp',
        licenseDuration: 12,
        maxPrograms: 5,
        tier: 'standard',
        isActive: true,
      });
    }
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    try {
      if (editingProduct.partnershipMapping) {
        // Update existing
        await updateMapping.mutateAsync({
          id: editingProduct.partnershipMapping.id,
          dto: {
            partnership_type: formData.partnershipType,
            license_duration_months: formData.licenseDuration,
            max_programs: formData.partnershipType === 'pdp' ? formData.maxPrograms : null,
            tier: formData.tier,
            is_active: formData.isActive,
          },
        });
        toast({
          title: texts.success,
          description: texts.linkUpdated,
        });
      } else {
        // Create new
        await createMapping.mutateAsync({
          woocommerce_product_id: editingProduct.wooProduct.id,
          product_name: editingProduct.wooProduct.name,
          partnership_type: formData.partnershipType,
          license_duration_months: formData.licenseDuration,
          max_programs: formData.partnershipType === 'pdp' ? formData.maxPrograms : null,
          tier: formData.tier,
          is_active: formData.isActive,
        });
        toast({
          title: texts.success,
          description: texts.productLinked,
        });
      }
      setEditingProduct(null);
    } catch (error: any) {
      toast({
        title: texts.error,
        description: error.message || texts.saveFailed,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;

    try {
      await deleteMapping.mutateAsync(deleteProduct.id);
      toast({
        title: texts.success,
        description: texts.deleteSuccess,
      });
      setDeleteProduct(null);
    } catch (error: any) {
      toast({
        title: texts.error,
        description: error.message || texts.deleteFailed,
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = async () => {
    await refetchWoo();
    toast({
      title: texts.refreshed,
      description: texts.productsSynced,
    });
  };

  const isLoading = wooLoading || mappingsLoading || certLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Handshake className="h-6 w-6" />
            {texts.title}
          </h1>
          <p className="text-muted-foreground mt-1">{texts.description}</p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading} variant="outline">
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          {texts.refreshFromStore}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{productsWithLinks.length}</div>
            <p className="text-sm text-muted-foreground">{texts.totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{linkedCount}</div>
            <p className="text-sm text-muted-foreground">{texts.linked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{notLinkedCount}</div>
            <p className="text-sm text-muted-foreground">{texts.notLinked}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={linkFilter} onValueChange={(v) => setLinkFilter(v as LinkStatus)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={texts.linkStatus} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{texts.allProducts}</SelectItem>
            <SelectItem value="linked">{texts.linkedOnly}</SelectItem>
            <SelectItem value="not-linked">{texts.notLinkedOnly}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{texts.loading}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {linkFilter === 'linked' ? texts.noLinkedProducts :
           linkFilter === 'not-linked' ? texts.noUnlinkedProducts :
           texts.noProducts}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredProducts.map(({ wooProduct, partnershipMapping, isLinked }) => (
            <Card key={wooProduct.id} className={cn(
              'transition-colors',
              isLinked && 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20'
            )}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {wooProduct.image && (
                      <img
                        src={wooProduct.image}
                        alt={wooProduct.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{wooProduct.name}</h3>
                        {isLinked && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {partnershipMapping?.partnership_type.toUpperCase()}
                          </Badge>
                        )}
                        {partnershipMapping && !partnershipMapping.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ID: {wooProduct.id} | {wooProduct.price} | SKU: {wooProduct.sku || 'N/A'}
                      </p>
                      {isLinked && partnershipMapping && (
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{texts.validFor} {partnershipMapping.license_duration_months} {texts.months}</span>
                          {partnershipMapping.partnership_type === 'pdp' && partnershipMapping.max_programs && (
                            <span>| {texts.maxPrograms}: {partnershipMapping.max_programs}</span>
                          )}
                          <span>| Tier: {partnershipMapping.tier}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(wooProduct.permalink, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {isLinked && partnershipMapping && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteProduct(partnershipMapping)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                    <Button
                      variant={isLinked ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => handleEditClick({ wooProduct, partnershipMapping, isLinked })}
                    >
                      {isLinked ? (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          {texts.editLink}
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          {texts.linkToPartnership}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Link Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct?.isLinked ? texts.editProductLink : texts.linkToPartnershipTitle}
            </DialogTitle>
            <DialogDescription>
              {editingProduct?.isLinked ? texts.editDescription : texts.linkDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>{texts.product}</Label>
              <p className="text-sm font-medium mt-1">{editingProduct?.wooProduct.name}</p>
              <p className="text-xs text-muted-foreground">ID: {editingProduct?.wooProduct.id}</p>
            </div>

            <div className="space-y-2">
              <Label>{texts.partnershipType}</Label>
              <Select
                value={formData.partnershipType}
                onValueChange={(v) => setFormData({ ...formData, partnershipType: v as PartnershipType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdp">{texts.pdpLabel}</SelectItem>
                  <SelectItem value="ecp">{texts.ecpLabel}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{texts.licenseDuration}</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={formData.licenseDuration}
                onChange={(e) => setFormData({ ...formData, licenseDuration: parseInt(e.target.value) || 12 })}
              />
            </div>

            {formData.partnershipType === 'pdp' && (
              <div className="space-y-2">
                <Label>{texts.maxProgramsLabel}</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.maxPrograms}
                  onChange={(e) => setFormData({ ...formData, maxPrograms: parseInt(e.target.value) || 5 })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{texts.tier}</Label>
              <Select
                value={formData.tier}
                onValueChange={(v) => setFormData({ ...formData, tier: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>{texts.isActive}</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>
              {texts.cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMapping.isPending || updateMapping.isPending}
            >
              {editingProduct?.isLinked ? texts.updateLink : texts.linkProduct}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{texts.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {texts.deleteConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{texts.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {texts.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
