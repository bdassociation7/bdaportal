/**
 * ECP Partner Details Page
 * Comprehensive view of ECP partner information, stats, and activity
 */

import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminPageLayout } from '@/components/admin/AdminPageLayout';
import {
  Edit,
  Ticket,
  Users,
  Award,
  AlertCircle,
  FileText,
  Upload,
  Download,
  Trash2,
  Plus,
  Shield,
  Globe,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ECPService } from '@/entities/ecp/ecp.service';
import type { ECPLicense, LicenseDocument, LicenseDocumentType, LicenseStatus, CertificationType } from '@/entities/ecp/ecp.types';
import { useToast } from '@/hooks/use-toast';

const DOCUMENT_TYPES: { value: LicenseDocumentType; label: string }[] = [
  { value: 'license_agreement', label: 'License Agreement' },
  { value: 'brand_guidelines', label: 'Brand Guidelines' },
  { value: 'training_standards', label: 'Training Standards' },
  { value: 'compliance_checklist', label: 'Compliance Checklist' },
  { value: 'renewal_contract', label: 'Renewal Contract' },
  { value: 'amendment', label: 'Amendment' },
  { value: 'other', label: 'Other' },
];

const LICENSE_STATUSES: { value: LicenseStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'bg-green-100 text-green-700' },
  { value: 'expiring_soon', label: 'Expiring Soon', color: 'bg-orange-100 text-orange-700' },
  { value: 'expired', label: 'Expired', color: 'bg-red-100 text-red-700' },
  { value: 'suspended', label: 'Suspended', color: 'bg-gray-100 text-gray-700' },
  { value: 'pending_renewal', label: 'Pending Renewal', color: 'bg-blue-100 text-blue-700' },
];

export default function ECPDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateLicenseDialog, setShowCreateLicenseDialog] = useState(false);
  const [showUploadDocDialog, setShowUploadDocDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // License form state
  const [licenseForm, setLicenseForm] = useState({
    license_number: '',
    partner_code: '',
    issue_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    territories: '',
    programs: ['CP'] as CertificationType[],
    status: 'active' as LicenseStatus,
    notes: '',
  });

  // Document upload form state
  const [docForm, setDocForm] = useState({
    document_type: 'license_agreement' as LicenseDocumentType,
    title: '',
    description: '',
    file: null as File | null,
  });

  // Fetch ECP partner data
  const { data: partner, isLoading, error } = useQuery({
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

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['ecp-stats', id],
    queryFn: async () => {
      const [allocations, trainers, batches, trainees] = await Promise.all([
        supabase.from('ecp_voucher_allocations').select('quantity, vouchers_used').eq('partner_id', id),
        supabase.from('ecp_trainers').select('status').eq('partner_id', id),
        supabase.from('ecp_training_batches').select('id').eq('partner_id', id),
        supabase.from('ecp_trainees').select('id').eq('partner_id', id),
      ]);

      const totalVouchers = allocations.data?.reduce((sum, a) => sum + (a.quantity || 0), 0) || 0;
      const vouchersUsedCount = allocations.data?.reduce((sum, a) => sum + (a.vouchers_used || 0), 0) || 0;

      return {
        vouchers_total: totalVouchers,
        vouchers_used: vouchersUsedCount,
        trainers_total: trainers.data?.length || 0,
        trainers_approved: trainers.data?.filter((t) => t.status === 'approved').length || 0,
        batches_total: batches.data?.length || 0,
        trainees_total: trainees.data?.length || 0,
      };
    },
    enabled: !!id,
  });

  // Fetch trainers
  const { data: trainers } = useQuery({
    queryKey: ['ecp-trainers', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecp_trainers')
        .select('*')
        .eq('partner_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch batches
  const { data: batches } = useQuery({
    queryKey: ['ecp-batches', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecp_training_batches')
        .select('*')
        .eq('partner_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch voucher allocations
  const { data: voucherAllocations } = useQuery({
    queryKey: ['ecp-voucher-allocations', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecp_voucher_allocations')
        .select('*')
        .eq('partner_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch license
  const { data: license, isLoading: licenseLoading } = useQuery({
    queryKey: ['ecp-license', id],
    queryFn: async () => {
      const result = await ECPService.getAdminLicense(id!);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!id,
  });

  // Fetch license documents
  const { data: licenseDocuments } = useQuery({
    queryKey: ['ecp-license-documents', license?.id],
    queryFn: async () => {
      if (!license?.id) return [];
      const result = await ECPService.getAdminLicenseDocuments(license.id);
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: !!license?.id,
  });

  // Create license mutation
  const createLicenseMutation = useMutation({
    mutationFn: async () => {
      const result = await ECPService.createLicense(id!, {
        license_number: licenseForm.license_number,
        partner_code: licenseForm.partner_code,
        issue_date: licenseForm.issue_date,
        expiry_date: licenseForm.expiry_date,
        territories: licenseForm.territories.split(',').map(t => t.trim()).filter(Boolean),
        programs: licenseForm.programs,
        status: licenseForm.status,
        notes: licenseForm.notes || undefined,
      });
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecp-license', id] });
      setShowCreateLicenseDialog(false);
      toast({ title: 'License created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create license', description: error.message, variant: 'destructive' });
    },
  });

  // Update license mutation
  const updateLicenseMutation = useMutation({
    mutationFn: async (updates: Partial<ECPLicense>) => {
      if (!license?.id) throw new Error('No license found');
      const result = await ECPService.updateLicense(license.id, updates);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecp-license', id] });
      toast({ title: 'License updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update license', description: error.message, variant: 'destructive' });
    },
  });

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!license?.id || !docForm.file) throw new Error('Missing license or file');

      setIsUploading(true);

      // Upload file
      const uploadResult = await ECPService.uploadLicenseDocumentFile(docForm.file, license.id);
      if (uploadResult.error) throw uploadResult.error;

      // Create document record
      const createResult = await ECPService.createLicenseDocument(license.id, {
        document_type: docForm.document_type,
        title: docForm.title,
        description: docForm.description || undefined,
        file_url: uploadResult.data!.url,
        file_name: uploadResult.data!.fileName,
        file_size: uploadResult.data!.fileSize,
        mime_type: uploadResult.data!.mimeType,
      });

      if (createResult.error) throw createResult.error;
      return createResult.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecp-license-documents', license?.id] });
      setShowUploadDocDialog(false);
      setDocForm({ document_type: 'license_agreement', title: '', description: '', file: null });
      setIsUploading(false);
      toast({ title: 'Document uploaded successfully' });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      toast({ title: 'Failed to upload document', description: error.message, variant: 'destructive' });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const result = await ECPService.deleteLicenseDocument(documentId);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecp-license-documents', license?.id] });
      toast({ title: 'Document deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete document', description: error.message, variant: 'destructive' });
    },
  });

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  const getStatusColor = (status: LicenseStatus) => {
    return LICENSE_STATUSES.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <AdminPageLayout title="Loading..." backTo="/admin/ecp-management">
        <Skeleton className="h-96 w-full" />
      </AdminPageLayout>
    );
  }

  if (error || !partner) {
    return (
      <AdminPageLayout title="Partner Not Found" backTo="/admin/ecp-management">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>ECP partner not found.</AlertDescription>
        </Alert>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout
      title={partner.company_name}
      subtitle="ECP - Examination & Certification Partner"
      backTo="/admin/ecp-management"
      actions={
        <>
          <Button
            onClick={() => navigate(`/admin/ecp/${id}/vouchers`)}
            variant="outline"
            className="bg-white text-gray-900 hover:bg-gray-100"
          >
            <Ticket className="h-4 w-4 mr-2" />
            Allocate Vouchers
          </Button>
          <Button
            onClick={() => navigate(`/admin/partners/${id}/edit`)}
            className="bg-white text-gray-900 hover:bg-gray-100"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Partner
          </Button>
        </>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="license">License</TabsTrigger>
          <TabsTrigger value="trainers">Trainers</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Partner Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Contact Person</Label>
                  <p className="font-medium">{partner.contact_person || '—'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Email</Label>
                  <p className="font-medium">{partner.contact_email}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Phone</Label>
                  <p className="font-medium">{partner.contact_phone || '—'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Country</Label>
                  <p className="font-medium">{partner.country || '—'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <Badge className={partner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                    {partner.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Vouchers</p>
                    <p className="text-2xl font-bold">{stats?.vouchers_total || 0}</p>
                  </div>
                  <Ticket className="h-6 w-6 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Approved Trainers</p>
                    <p className="text-2xl font-bold">{stats?.trainers_approved || 0}</p>
                  </div>
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Trainees</p>
                    <p className="text-2xl font-bold">{stats?.trainees_total || 0}</p>
                  </div>
                  <Award className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* License Tab */}
        <TabsContent value="license" className="space-y-4">
          {licenseLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !license ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No License Created</h3>
                  <p className="text-gray-500 mb-4">
                    This partner doesn't have a license yet. Create one to enable document management.
                  </p>
                  <Button onClick={() => setShowCreateLicenseDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create License
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* License Info Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      License Information
                    </CardTitle>
                    <Badge className={getStatusColor(license.status)}>
                      {LICENSE_STATUSES.find(s => s.value === license.status)?.label || license.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-gray-500">License Number</Label>
                      <p className="font-mono font-semibold">{license.license_number}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Partner Code</Label>
                      <p className="font-mono">{license.partner_code}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Issue Date</Label>
                      <p className="font-medium">{formatDate(license.issue_date)}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Expiry Date</Label>
                      <p className="font-medium">{formatDate(license.expiry_date)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <Label className="text-gray-500">Licensed Territories</Label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {license.territories && license.territories.length > 0 ? (
                          license.territories.map((territory) => (
                            <Badge key={territory} variant="outline">{territory}</Badge>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">No territories specified</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-4 w-4 text-gray-500" />
                        <Label className="text-gray-500">Licensed Programs</Label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {license.programs && license.programs.length > 0 ? (
                          license.programs.map((program) => (
                            <Badge
                              key={program}
                              className={program === 'CP' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}
                            >
                              {program}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">No programs specified</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Update */}
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-gray-500 mb-2 block">Update Status</Label>
                    <div className="flex gap-2">
                      <Select
                        value={license.status}
                        onValueChange={(value) => updateLicenseMutation.mutate({ status: value as LicenseStatus })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LICENSE_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* License Documents Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        License Documents
                      </CardTitle>
                      <CardDescription>
                        Upload and manage documents for this partner's license
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowUploadDocDialog(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {licenseDocuments && licenseDocuments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {licenseDocuments.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{doc.title}</p>
                                {doc.description && (
                                  <p className="text-sm text-gray-500">{doc.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-500">
                              {formatDate(doc.uploaded_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(doc.file_url, '_blank')}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this document?')) {
                                      deleteDocumentMutation.mutate(doc.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription>
                        No documents uploaded yet. Click "Upload Document" to add the first document.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Trainers Tab */}
        <TabsContent value="trainers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Approved Trainers</CardTitle>
              <CardDescription>All trainers approved for this ECP partner</CardDescription>
            </CardHeader>
            <CardContent>
              {trainers && trainers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Certifications</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainers.map((trainer: any) => (
                      <TableRow key={trainer.id}>
                        <TableCell className="font-medium">
                          {trainer.first_name} {trainer.last_name}
                        </TableCell>
                        <TableCell>{trainer.email}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              trainer.status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : trainer.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }
                          >
                            {trainer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {trainer.certifications?.join(', ') || '—'}
                        </TableCell>
                        <TableCell>
                          {new Date(trainer.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No trainers found for this partner.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batches Tab */}
        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Training Batches</CardTitle>
              <CardDescription>All training batches for this ECP partner</CardDescription>
            </CardHeader>
            <CardContent>
              {batches && batches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Code</TableHead>
                      <TableHead>Certification</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Trainees</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch: any) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium font-mono">
                          {batch.batch_code || batch.id.substring(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{batch.certification_type || 'CP'}</Badge>
                        </TableCell>
                        <TableCell>
                          {batch.training_start_date ? new Date(batch.training_start_date).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>
                          {batch.training_end_date ? new Date(batch.training_end_date).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>{batch.max_capacity || 0}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              batch.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : batch.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }
                          >
                            {batch.status || 'scheduled'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No training batches found for this partner.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vouchers Tab */}
        <TabsContent value="vouchers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Voucher Allocations</CardTitle>
                  <CardDescription>All voucher allocations for this ECP partner</CardDescription>
                </div>
                <Button
                  onClick={() => navigate(`/admin/ecp/${id}/vouchers`)}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Ticket className="h-4 w-4 mr-2" />
                  Allocate More
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {voucherAllocations && voucherAllocations.length > 0 ? (
                <div className="space-y-4">
                  {voucherAllocations.map((allocation: any) => (
                    <Card key={allocation.id} className="border-2">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <Label className="text-gray-500">Certification Type</Label>
                              <Badge className="mt-1">BDA-{allocation.certification_type}</Badge>
                            </div>
                            <div>
                              <Label className="text-gray-500">Total Vouchers</Label>
                              <p className="text-lg font-bold mt-1">{allocation.quantity}</p>
                            </div>
                            <div>
                              <Label className="text-gray-500">Used</Label>
                              <p className="text-lg font-bold mt-1">{allocation.vouchers_used}</p>
                            </div>
                            <div>
                              <Label className="text-gray-500">Remaining</Label>
                              <p className="text-lg font-bold mt-1 text-green-600">
                                {allocation.vouchers_remaining || (allocation.quantity - allocation.vouchers_used)}
                              </p>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">Voucher Usage</span>
                              <span className="text-sm text-gray-500">
                                {Math.round((allocation.vouchers_used / allocation.quantity) * 100)}%
                              </span>
                            </div>
                            <Progress
                              value={(allocation.vouchers_used / allocation.quantity) * 100}
                              className="h-2"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                            <div>
                              <Label className="text-gray-500">Valid From</Label>
                              <p className="text-sm mt-1">
                                {new Date(allocation.valid_from).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <Label className="text-gray-500">Valid Until</Label>
                              <p className="text-sm mt-1">
                                {new Date(allocation.valid_until).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <Label className="text-gray-500">Status</Label>
                              <Badge
                                className={
                                  allocation.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : allocation.status === 'depleted'
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-red-100 text-red-700'
                                }
                              >
                                {allocation.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No voucher allocations found. Click "Allocate More" to create the first allocation.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create License Dialog */}
      <Dialog open={showCreateLicenseDialog} onOpenChange={setShowCreateLicenseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create License</DialogTitle>
            <DialogDescription>
              Create a new license for this ECP partner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License Number *</Label>
                <Input
                  value={licenseForm.license_number}
                  onChange={(e) => setLicenseForm({ ...licenseForm, license_number: e.target.value })}
                  placeholder="ECP-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Partner Code *</Label>
                <Input
                  value={licenseForm.partner_code}
                  onChange={(e) => setLicenseForm({ ...licenseForm, partner_code: e.target.value })}
                  placeholder="ECP001"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue Date *</Label>
                <Input
                  type="date"
                  value={licenseForm.issue_date}
                  onChange={(e) => setLicenseForm({ ...licenseForm, issue_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date *</Label>
                <Input
                  type="date"
                  value={licenseForm.expiry_date}
                  onChange={(e) => setLicenseForm({ ...licenseForm, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Territories (comma-separated)</Label>
              <Input
                value={licenseForm.territories}
                onChange={(e) => setLicenseForm({ ...licenseForm, territories: e.target.value })}
                placeholder="Saudi Arabia, UAE, Qatar"
              />
            </div>
            <div className="space-y-2">
              <Label>Programs</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={licenseForm.programs.includes('CP')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLicenseForm({ ...licenseForm, programs: [...licenseForm.programs, 'CP'] });
                      } else {
                        setLicenseForm({ ...licenseForm, programs: licenseForm.programs.filter(p => p !== 'CP') });
                      }
                    }}
                  />
                  <span>CP (Certified Professional)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={licenseForm.programs.includes('SCP')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLicenseForm({ ...licenseForm, programs: [...licenseForm.programs, 'SCP'] });
                      } else {
                        setLicenseForm({ ...licenseForm, programs: licenseForm.programs.filter(p => p !== 'SCP') });
                      }
                    }}
                  />
                  <span>SCP (Senior Certified Professional)</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={licenseForm.notes}
                onChange={(e) => setLicenseForm({ ...licenseForm, notes: e.target.value })}
                placeholder="Optional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateLicenseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createLicenseMutation.mutate()}
              disabled={!licenseForm.license_number || !licenseForm.partner_code || createLicenseMutation.isPending}
            >
              {createLicenseMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create License
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadDocDialog} onOpenChange={setShowUploadDocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a new document for this partner's license
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select
                value={docForm.document_type}
                onValueChange={(value) => setDocForm({ ...docForm, document_type: value as LicenseDocumentType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={docForm.title}
                onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                placeholder="e.g., ECP License Agreement 2024"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={docForm.description}
                onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => setDocForm({ ...docForm, file: e.target.files?.[0] || null })}
              />
              <p className="text-xs text-gray-500">
                Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDocDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => uploadDocumentMutation.mutate()}
              disabled={!docForm.title || !docForm.file || isUploading}
            >
              {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
}
