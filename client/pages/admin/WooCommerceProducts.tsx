import { useState } from 'react';
import { Package, RefreshCw, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useWooCommerceProducts } from '@/entities/woocommerce';
import { useActiveQuizzes, useCreateCertificationProduct, type CertificationType } from '@/entities/quiz';
import type { WooCommerceProduct } from '@/entities/woocommerce';

export default function WooCommerceProducts() {
  const { toast } = useToast();
  const { data: products, isLoading, refetch } = useWooCommerceProducts();
  const { data: quizzes } = useActiveQuizzes();
  const createCertProductMutation = useCreateCertificationProduct();

  const [selectedProduct, setSelectedProduct] = useState<WooCommerceProduct | null>(null);
  const [linkForm, setLinkForm] = useState({
    certification_type: 'CP' as CertificationType,
    quiz_id: '',
    vouchers_per_purchase: '1',
    voucher_validity_months: '6',
  });

  const handleOpenLinkDialog = (product: WooCommerceProduct) => {
    setSelectedProduct(product);
    setLinkForm({
      certification_type: 'CP',
      quiz_id: '',
      vouchers_per_purchase: '1',
      voucher_validity_months: '6',
    });
  };

  const handleSubmitLink = async () => {
    if (!selectedProduct) return;

    try {
      await createCertProductMutation.mutateAsync({
        woocommerce_product_id: selectedProduct.id,
        woocommerce_product_name: selectedProduct.name,
        woocommerce_product_sku: selectedProduct.sku || undefined,
        certification_type: linkForm.certification_type,
        quiz_id: linkForm.quiz_id || undefined,
        vouchers_per_purchase: parseInt(linkForm.vouchers_per_purchase),
        voucher_validity_months: parseInt(linkForm.voucher_validity_months),
      });

      toast({ title: 'Success', description: 'Product linked to certification successfully' });
      setSelectedProduct(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to link product', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8" />
          WooCommerce Products
        </h1>
        <p className="mt-2 opacity-90">Sync and link products to certification exams</p>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-gray-600">
          {products?.length || 0} products from WooCommerce store
        </p>
        <Button onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh from Store
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading products...</p>
        </div>
      ) : !products || products.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No products found in WooCommerce store</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-3 mb-3">
                  {product.image && (
                    <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-gray-600">SKU: {product.sku || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <Badge>{product.status}</Badge>
                  <span className="font-bold text-gray-900">${product.price}</span>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleOpenLinkDialog(product)} className="flex-1">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Link to Cert
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(product.permalink, '_blank')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Certification</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <Label>Product</Label>
                <div className="p-3 bg-gray-50 rounded mt-1">
                  <p className="font-semibold">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-600">ID: {selectedProduct.id}</p>
                </div>
              </div>

              <div>
                <Label>Certification Type</Label>
                <Select value={linkForm.certification_type} onValueChange={(v) => setLinkForm({ ...linkForm, certification_type: v as CertificationType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CP">BDA-CP™</SelectItem>
                    <SelectItem value="SCP">BDA-SCP™</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Linked Quiz</Label>
                <Select value={linkForm.quiz_id || 'none'} onValueChange={(v) => setLinkForm({ ...linkForm, quiz_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {quizzes?.filter(q => q.certification_type === linkForm.certification_type).map(q => (
                      <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vouchers / Purchase</Label>
                  <Input type="number" min="1" value={linkForm.vouchers_per_purchase} onChange={(e) => setLinkForm({ ...linkForm, vouchers_per_purchase: e.target.value })} />
                </div>
                <div>
                  <Label>Validity (Months)</Label>
                  <Input type="number" min="1" value={linkForm.voucher_validity_months} onChange={(e) => setLinkForm({ ...linkForm, voucher_validity_months: e.target.value })} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedProduct(null)}>Cancel</Button>
                <Button onClick={handleSubmitLink} disabled={createCertProductMutation.isPending}>Link Product</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

WooCommerceProducts.displayName = 'WooCommerceProducts';
