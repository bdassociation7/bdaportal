import { useState } from 'react';
import {
  Crown,
  Link as LinkIcon,
  RefreshCw,
  CheckCircle,
  Edit,
  ExternalLink,
  Filter,
  Trash2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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
import { usePartnershipMappings } from '@/entities/partnership';
import {
  useMembershipProductMappings,
  useCreateMembershipProductMapping,
  useUpdateMembershipProductMapping,
  useDeleteMembershipProductMapping,
} from '@/entities/membership';
import type { MembershipProductMapping, MembershipType } from '@/entities/membership';
import type { WooCommerceProduct } from '@/entities/woocommerce';
import { supabase } from '@/lib/supabase';
import { cn } from '@/shared/utils/cn';

type LinkStatus = 'all' | 'linked' | 'not-linked';

interface ProductWithLink {
  wooProduct: WooCommerceProduct;
  membershipMapping?: MembershipProductMapping;
  isLinked: boolean;
}

export default function MembershipProducts() {
  const { toast } = useToast();
  const { language } = useLanguage();

  const t = {
    en: {
      title: 'Membership Products',
      description: 'Link WooCommerce products to membership types for automatic activation on purchase',
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
      editLink: 'Edit Link',
      linkToMembership: 'Link to Membership',
      duration: 'Duration',
      months: 'months',
      editProductLink: 'Edit Product Link',
      linkToMembershipTitle: 'Link to Membership',
      editDescription: 'Update membership configuration for this product',
      linkDescription: 'Configure how this product activates membership on purchase',
      product: 'Product',
      membershipType: 'Membership Type',
      basicLabel: 'Basic Membership',
      professionalLabel: 'Professional Membership',
      durationLabel: 'Duration (Months)',
      isActive: 'Active',
      cancel: 'Cancel',
      updateLink: 'Update Link',
      linkProduct: 'Link Product',
      success: 'Success',
      error: 'Error',
      linkUpdated: 'Product link updated successfully',
      productLinked: 'Product linked to membership successfully',
      saveFailed: 'Failed to save product link',
      refreshed: 'Refreshed',
      productsSynced: 'Products synced from WooCommerce',
      deleteConfirmTitle: 'Remove Link',
      deleteConfirmDescription: 'Are you sure you want to remove this membership product link? This will not delete the WooCommerce product.',
      deleteSuccess: 'Product link removed successfully',
      deleteFailed: 'Failed to remove product link',
      delete: 'Remove',
    },
    ar: {
      title: 'منتجات العضوية',
      description: 'ربط منتجات WooCommerce بأنواع العضوية للتفعيل التلقائي عند الشراء',
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
      editLink: 'تعديل الربط',
      linkToMembership: 'ربط بالعضوية',
      duration: 'المدة',
      months: 'شهر',
      editProductLink: 'تعديل ربط المنتج',
      linkToMembershipTitle: 'ربط بالعضوية',
      editDescription: 'تحديث تكوين العضوية لهذا المنتج',
      linkDescription: 'تكوين كيفية تفعيل هذا المنتج للعضوية عند الشراء',
      product: 'المنتج',
      membershipType: 'نوع العضوية',
      basicLabel: 'عضوية أساسية',
      professionalLabel: 'عضوية احترافية',
      durationLabel: 'المدة (بالأشهر)',
      isActive: 'نشط',
      cancel: 'إلغاء',
      updateLink: 'تحديث الربط',
      linkProduct: 'ربط المنتج',
      success: 'نجاح',
      error: 'خطأ',
      linkUpdated: 'تم تحديث ربط المنتج بنجاح',
      productLinked: 'تم ربط المنتج بالعضوية بنجاح',
      saveFailed: 'فشل في حفظ ربط المنتج',
      refreshed: 'تم التحديث',
      productsSynced: 'تمت مزامنة المنتجات من WooCommerce',
      deleteConfirmTitle: 'إزالة الربط',
      deleteConfirmDescription: 'هل أنت متأكد من إزالة ربط هذا المنتج بالعضوية؟ لن يتم حذف منتج WooCommerce.',
      deleteSuccess: 'تم إزالة ربط المنتج بنجاح',
      deleteFailed: 'فشل في إزالة ربط المنتج',
      delete: 'إزالة',
    },
  };

  const texts = t[language];

  // Data fetching
  const { data: wooProducts, isLoading: wooLoading, refetch: refetchWoo } = useWooCommerceProducts();
  const { data: membershipMappings, isLoading: mappingsLoading } = useMembershipProductMappings();
  const { data: certificationProducts, isLoading: certLoading } = useAllCertificationProducts();
  const { data: partnershipMappings } = usePartnershipMappings();
  const { data: learningProducts } = useQuery({
    queryKey: ['learning-system-products-ids'],
    queryFn: async () => {
      const { data } = await supabase
        .from('learning_system_products')
        .select('woocommerce_product_id');
      return data || [];
    },
  });

  // Mutations
  const createMapping = useCreateMembershipProductMapping();
  const updateMapping = useUpdateMembershipProductMapping();
  const deleteMapping = useDeleteMembershipProductMapping();

  // UI State
  const [linkFilter, setLinkFilter] = useState<LinkStatus>('all');
  const [editingProduct, setEditingProduct] = useState<ProductWithLink | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<MembershipProductMapping | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    membershipType: 'basic' as MembershipType,
    durationMonths: 12,
    isActive: true,
  });

  // Build exclusion set (products already linked to other systems)
  const excludedIds = new Set([
    ...(certificationProducts || []).map(p => p.woocommerce_product_id),
    ...(partnershipMappings || []).map(p => p.woocommerce_product_id),
    ...(learningProducts || []).map(p => p.woocommerce_product_id),
  ]);

  // Combine WooCommerce products with membership mappings
  const productsWithLinks: ProductWithLink[] = (wooProducts || [])
    .filter(wp => {
      // Show if: not linked to other systems, OR already linked to membership
      const isLinkedToMembership = membershipMappings?.some(m => m.woocommerce_product_id === wp.id);
      return !excludedIds.has(wp.id) || isLinkedToMembership;
    })
    .map(wp => {
      const membershipMapping = membershipMappings?.find(m => m.woocommerce_product_id === wp.id);
      return {
        wooProduct: wp,
        membershipMapping,
        isLinked: !!membershipMapping,
      };
    });

  // Filter
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
    if (product.membershipMapping) {
      setFormData({
        membershipType: product.membershipMapping.membership_type,
        durationMonths: product.membershipMapping.duration_months,
        isActive: product.membershipMapping.is_active,
      });
    } else {
      setFormData({
        membershipType: 'basic',
        durationMonths: 12,
        isActive: true,
      });
    }
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    try {
      if (editingProduct.membershipMapping) {
        await updateMapping.mutateAsync({
          id: editingProduct.membershipMapping.id,
          dto: {
            membership_type: formData.membershipType,
            duration_months: formData.durationMonths,
            is_active: formData.isActive,
          },
        });
        toast({ title: texts.success, description: texts.linkUpdated });
      } else {
        await createMapping.mutateAsync({
          woocommerce_product_id: editingProduct.wooProduct.id,
          membership_type: formData.membershipType,
          duration_months: formData.durationMonths,
          is_active: formData.isActive,
        });
        toast({ title: texts.success, description: texts.productLinked });
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
      toast({ title: texts.success, description: texts.deleteSuccess });
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
    toast({ title: texts.refreshed, description: texts.productsSynced });
  };

  const isLoading = wooLoading || mappingsLoading || certLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6" />
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
          {filteredProducts.map(({ wooProduct, membershipMapping, isLinked }) => (
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
                        {isLinked && membershipMapping && (
                          <Badge variant="outline" className={cn(
                            membershipMapping.membership_type === 'professional'
                              ? 'text-purple-600 border-purple-600'
                              : 'text-blue-600 border-blue-600'
                          )}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {membershipMapping.membership_type === 'professional' ? 'Professional' : 'Basic'}
                          </Badge>
                        )}
                        {membershipMapping && !membershipMapping.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ID: {wooProduct.id} | {wooProduct.price} | SKU: {wooProduct.sku || 'N/A'}
                      </p>
                      {isLinked && membershipMapping && (
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{texts.duration}: {membershipMapping.duration_months} {texts.months}</span>
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
                    {isLinked && membershipMapping && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteProduct(membershipMapping)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                    <Button
                      variant={isLinked ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => handleEditClick({ wooProduct, membershipMapping, isLinked })}
                    >
                      {isLinked ? (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          {texts.editLink}
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          {texts.linkToMembership}
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
              {editingProduct?.isLinked ? texts.editProductLink : texts.linkToMembershipTitle}
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
              <Label>{texts.membershipType}</Label>
              <Select
                value={formData.membershipType}
                onValueChange={(v) => setFormData({ ...formData, membershipType: v as MembershipType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">{texts.basicLabel}</SelectItem>
                  <SelectItem value="professional">{texts.professionalLabel}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{texts.durationLabel}</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={formData.durationMonths}
                onChange={(e) => setFormData({ ...formData, durationMonths: parseInt(e.target.value) || 12 })}
              />
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
