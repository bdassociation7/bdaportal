/**
 * ECP Voucher Allocation Page
 * Allocate exam vouchers directly to ECP partners.
 * Uses admin_allocate_vouchers() RPC which creates both the allocation record
 * AND the actual voucher codes in ecp_vouchers — partners see them immediately.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AdminPageLayout } from '@/components/admin/AdminPageLayout';
import {
  Building2,
  Ticket,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function VoucherAllocation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState('');
  const [certificationType, setCertificationType] = useState('CP');
  const [validUntil, setValidUntil] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  // Fetch partner
  const { data: partner, isLoading: loadingPartner } = useQuery({
    queryKey: ['ecp-partner', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', id)
        .eq('partner_type', 'ecp')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Allocate vouchers mutation — calls admin_allocate_vouchers() RPC
  // This creates BOTH the allocation record AND actual voucher codes in ecp_vouchers
  const allocateMutation = useMutation({
    mutationFn: async ({
      quantity,
      certType,
      validUntil,
      unitPrice,
    }: {
      quantity: number;
      certType: string;
      validUntil: string;
      unitPrice?: number;
    }) => {
      const { data, error } = await supabase.rpc('admin_allocate_vouchers', {
        p_partner_id: id,
        p_certification_type: certType,
        p_quantity: quantity,
        p_valid_until: validUntil,
        p_unit_price: unitPrice ?? null,
      });

      if (error) throw error;

      // data = number of vouchers created
      return data as number;
    },
    onSuccess: (createdCount) => {
      queryClient.invalidateQueries({ queryKey: ['ecp-vouchers', id] });
      queryClient.invalidateQueries({ queryKey: ['ecp-partner', id] });
      toast({
        title: 'Vouchers Allocated',
        description: `${createdCount} ${certificationType} voucher${createdCount !== 1 ? 's' : ''} created and are now visible in the partner's account.`,
      });
      navigate(`/admin/ecp/${id}`);
    },
    onError: (error: any) => {
      console.error('Allocation error:', error);
      toast({
        title: 'Allocation Failed',
        description: error.message || 'Failed to allocate vouchers. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    const price = unitPrice ? parseFloat(unitPrice) : undefined;

    if (qty > 0 && validUntil) {
      allocateMutation.mutate({
        quantity: qty,
        certType: certificationType,
        validUntil,
        unitPrice: price,
      });
    }
  };

  if (loadingPartner) {
    return (
      <AdminPageLayout title="Loading..." backTo="/admin/ecp-management">
        <Skeleton className="h-96 w-full" />
      </AdminPageLayout>
    );
  }

  if (!partner) {
    return (
      <AdminPageLayout title="Partner Not Found" backTo="/admin/ecp-management">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>ECP partner not found.</AlertDescription>
        </Alert>
      </AdminPageLayout>
    );
  }

  const qty = parseInt(quantity) || 0;
  const price = parseFloat(unitPrice) || 0;
  const totalCost = qty > 0 && price > 0 ? qty * price : null;

  return (
    <AdminPageLayout
      title="Allocate Vouchers"
      subtitle={partner.company_name}
      backTo={`/admin/ecp/${id}`}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Info banner */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Vouchers allocated here are <strong>immediately visible</strong> in the partner's account and ready to assign to candidates.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Voucher Allocation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Partner info */}
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">{partner.company_name}</span>
                  <Badge variant="outline" className="text-purple-700 border-purple-300">ECP</Badge>
                </div>
                <p className="text-sm text-gray-600">{partner.contact_email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="certType">Certification Type *</Label>
                  <select
                    id="certType"
                    value={certificationType}
                    onChange={(e) => setCertificationType(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                    required
                  >
                    <option value="CP">Certified Professional (CP)</option>
                    <option value="SCP">Senior Certified Professional (SCP)</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="500"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="validUntil">Valid Until *</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="unitPrice">Unit Price (Optional)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Summary preview */}
              {qty > 0 && validUntil && (
                <Alert className="border-purple-200 bg-purple-50">
                  <Ticket className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-purple-800">
                    Allocating <strong>{qty} {certificationType} voucher{qty !== 1 ? 's' : ''}</strong> to{' '}
                    <strong>{partner.company_name}</strong>, valid until{' '}
                    <strong>{new Date(validUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                    {totalCost !== null && (
                      <> Total value: <strong>${totalCost.toFixed(2)}</strong></>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/admin/ecp/${id}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={allocateMutation.isPending || qty <= 0 || !validUntil}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {allocateMutation.isPending ? (
                'Allocating...'
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Allocate {qty > 0 ? `${qty} ` : ''}Vouchers
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </AdminPageLayout>
  );
}
