/**
 * Partner Edit Page
 * Form for editing partner information
 * Replaces the modal-based edit form with a dedicated page
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AdminPageLayout } from '@/components/admin/AdminPageLayout';
import {
  Building2,
  GraduationCap,
  Save,
  AlertCircle,
} from 'lucide-react';
import { useUpdatePartner } from '@/entities/partners';
import { supabase } from '@/lib/supabase';
import type { Partner, UpdatePartnerDTO } from '@/entities/partners';
import { useToast } from '@/hooks/use-toast';

export default function PartnerEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const updateMutation = useUpdatePartner();

  const [editForm, setEditForm] = useState<UpdatePartnerDTO>({});

  // Fetch partner data
  const { data: partner, isLoading, error } = useQuery({
    queryKey: ['partner', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Partner;
    },
    enabled: !!id,
  });

  // Populate form when partner data loads
  useEffect(() => {
    if (partner) {
      setEditForm({
        company_name: partner.company_name || '',
        contact_person: partner.contact_person || '',
        contact_email: partner.contact_email || '',
        contact_phone: partner.contact_phone || '',
        country: partner.country || '',
        city: partner.city || '',
        address: partner.address || '',
        website: partner.website || '',
        industry: partner.industry || '',
        description: partner.description || '',
        is_active: partner.is_active,
      });
    }
  }, [partner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) return;

    // Clean up empty strings to undefined for optional fields
    const cleanedDto: any = {};
    Object.entries(editForm).forEach(([key, value]) => {
      if (value !== '' && value !== null) {
        cleanedDto[key] = value;
      } else if (value === '') {
        cleanedDto[key] = null;
      }
    });

    try {
      await updateMutation.mutateAsync({
        id: id!,
        dto: cleanedDto,
      });

      toast({
        title: 'Partner Updated',
        description: 'Partner information has been updated successfully.',
      });

      navigate(`/admin/partners/${id}`);
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update partner information. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <AdminPageLayout
        title="Loading..."
        backTo="/admin/partners"
      >
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminPageLayout>
    );
  }

  if (error || !partner) {
    return (
      <AdminPageLayout
        title="Partner Not Found"
        backTo="/admin/partners"
      >
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Partner not found or an error occurred loading partner details.
          </AlertDescription>
        </Alert>
      </AdminPageLayout>
    );
  }

  const isECP = partner.partner_type === 'ecp';

  return (
    <AdminPageLayout
      title="Edit Partner"
      subtitle={partner.company_name}
      backTo={`/admin/partners/${id}`}
      backLabel="Back to partner details"
    >
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Partner Information</CardTitle>
              <div className="flex items-center gap-2">
                {isECP ? (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    <Building2 className="h-3 w-3 mr-1" />
                    ECP Partner
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    PDP Partner
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Company Information</h3>

              <div>
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={editForm.company_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  placeholder="Partner organisation name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={editForm.industry || ''}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    placeholder="e.g., Education, Consulting"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={editForm.website || ''}
                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Brief description of the partner organisation"
                  rows={3}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Contact Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_person">Contact Person *</Label>
                  <Input
                    id="contact_person"
                    value={editForm.contact_person || ''}
                    onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_email">Contact Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={editForm.contact_email || ''}
                    onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                    placeholder="email@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={editForm.contact_phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
            </div>

            {/* Location Information */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Location</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={editForm.country || ''}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    placeholder="e.g., United States"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={editForm.city || ''}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="e.g., New York"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Full Address</Label>
                <Textarea
                  id="address"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Street address, building, etc."
                  rows={2}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Status</h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active Status</Label>
                  <p className="text-sm text-gray-500">
                    {editForm.is_active
                      ? 'Partner is currently active and can access the system'
                      : 'Partner is deactivated and cannot access the system'}
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={editForm.is_active}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/admin/partners/${id}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-royal-600 hover:bg-royal-700"
          >
            {updateMutation.isPending ? (
              <>
                <span className="mr-2">Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </AdminPageLayout>
  );
}
