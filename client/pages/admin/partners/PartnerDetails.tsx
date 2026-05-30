/**
 * Partner Details Page
 * Displays comprehensive information about a specific partner
 * Replaces the modal-based detail view with a dedicated page
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Building2,
  GraduationCap,
  Edit,
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Ticket,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Partner } from '@/entities/partners';
import { PartnersService } from '@/entities/partners';

export default function PartnerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

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

  // Fetch ECP stats
  const { data: ecpStatsResult } = useQuery({
    queryKey: ['partner-ecp-stats', id],
    queryFn: async () => {
      const result = await PartnersService.getECPPartnerStats(id!);
      return result.data;
    },
    enabled: !!id && partner?.partner_type === 'ecp',
  });

  // Fetch PDP stats
  const { data: pdpStatsResult } = useQuery({
    queryKey: ['partner-pdp-stats', id],
    queryFn: async () => {
      const result = await PartnersService.getPDPPartnerStats(id!);
      return result.data;
    },
    enabled: !!id && partner?.partner_type === 'pdp',
  });

  // Fetch recent batches for ECP
  const { data: recentBatches } = useQuery({
    queryKey: ['partner-recent-batches', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('ecp_training_batches')
        .select('id, batch_code, batch_name, status, max_capacity, training_start_date')
        .eq('partner_id', id!)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!id && partner?.partner_type === 'ecp',
  });

  // Fetch recent programs for PDP
  const { data: recentPrograms } = useQuery({
    queryKey: ['partner-recent-programs', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('pdp_programs')
        .select('id, program_name, status, max_pdc_credits')
        .eq('provider_id', id!)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!id && partner?.partner_type === 'pdp',
  });

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

  // Use real stats from queries with fallback to zeros
  const ecpStats = ecpStatsResult || {
    total_batches: 0,
    active_batches: 0,
    completed_batches: 0,
    total_trainees: 0,
    certified_trainees: 0,
    trainers: 0,
    vouchers_allocated: 0,
    vouchers_used: 0,
    pass_rate: 0,
  };

  const pdpStats = pdpStatsResult || {
    total_programs: 0,
    active_programs: 0,
    pending_programs: 0,
    approved_programs: 0,
    total_enrollments: 0,
    completions: 0,
    pdc_credits_issued: 0,
    completion_rate: 0,
  };

  return (
    <AdminPageLayout
      title={partner.company_name}
      subtitle={isECP ? 'ECP - Examination & Certification Partner' : 'PDP - Professional Development Partner'}
      backTo="/admin/partners"
      actions={
        <Button
          onClick={() => navigate(`/admin/partners/${id}/edit`)}
          className="bg-white text-gray-900 hover:bg-gray-100"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Partner
        </Button>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value={isECP ? 'batches' : 'programs'}>
            {isECP ? 'Batches' : 'Programs'}
          </TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Partner Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-500">Partner Type</Label>
                  <div>
                    <Badge className={isECP ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}>
                      {partner.partner_type.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-500">Status</Label>
                  <div>
                    <Badge className={partner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {partner.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-500">Contact Person</Label>
                  <p className="font-medium">{partner.contact_person || '—'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-500">Contact Email</Label>
                  <p className="font-medium">{partner.contact_email}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-500">Contact Phone</Label>
                  <p className="font-medium">{partner.contact_phone || '—'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-500">Country</Label>
                  <p className="font-medium">{partner.country || '—'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-500">City</Label>
                  <p className="font-medium">{partner.city || '—'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-500">Industry</Label>
                  <p className="font-medium">{partner.industry || '—'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-500">Website</Label>
                  <p className="font-medium">
                    {partner.website ? (
                      <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {partner.website}
                      </a>
                    ) : '—'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-500">Address</Label>
                  <p className="font-medium">{partner.address || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              {isECP ? (
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Users className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                    <p className="text-2xl font-bold">{ecpStats.total_batches}</p>
                    <p className="text-sm text-gray-500">Total Batches</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Clock className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">{ecpStats.active_batches}</p>
                    <p className="text-sm text-gray-500">Active Batches</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Award className="h-6 w-6 mx-auto text-green-600 mb-2" />
                    <p className="text-2xl font-bold">{ecpStats.certified_trainees}</p>
                    <p className="text-sm text-gray-500">Certified</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Ticket className="h-6 w-6 mx-auto text-orange-600 mb-2" />
                    <p className="text-2xl font-bold">{ecpStats.vouchers_used}/{ecpStats.vouchers_allocated}</p>
                    <p className="text-sm text-gray-500">Vouchers Used</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <BookOpen className="h-6 w-6 mx-auto text-green-600 mb-2" />
                    <p className="text-2xl font-bold">{pdpStats.total_programs}</p>
                    <p className="text-sm text-gray-500">Total Programs</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Users className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                    <p className="text-2xl font-bold">{pdpStats.total_enrolments}</p>
                    <p className="text-sm text-gray-500">Enrolments</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Award className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                    <p className="text-2xl font-bold">{pdpStats.pdc_credits_issued}</p>
                    <p className="text-sm text-gray-500">PDCs Issued</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <TrendingUp className="h-6 w-6 mx-auto text-orange-600 mb-2" />
                    <p className="text-2xl font-bold">{pdpStats.completion_rate}%</p>
                    <p className="text-sm text-gray-500">Completion Rate</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batches/Programs Tab */}
        <TabsContent value={isECP ? 'batches' : 'programs'} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isECP ? 'Recent Training Batches' : 'Recent Programs'}</CardTitle>
            </CardHeader>
            <CardContent>
              {isECP ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Start Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBatches && recentBatches.length > 0 ? (
                      recentBatches.map((batch: any) => (
                        <TableRow key={batch.id}>
                          <TableCell className="font-medium">{batch.batch_code}</TableCell>
                          <TableCell>{batch.batch_name || '—'}</TableCell>
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
                              {batch.status?.replace('_', ' ') || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>{batch.max_capacity || '—'}</TableCell>
                          <TableCell>
                            {batch.training_start_date
                              ? new Date(batch.training_start_date).toLocaleDateString()
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No batches found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>PDC Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPrograms && recentPrograms.length > 0 ? (
                      recentPrograms.map((program: any) => (
                        <TableRow key={program.id}>
                          <TableCell className="font-medium">{program.program_name}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                program.status === 'approved'
                                  ? 'bg-green-100 text-green-700'
                                  : program.status === 'under_review'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-amber-100 text-amber-700'
                              }
                            >
                              {program.status?.replace('_', ' ') || 'pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>{program.max_pdc_credits || 0} PDCs</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No programs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isECP ? (
                <>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Pass Rate</span>
                      <span className="text-sm text-gray-500">{ecpStats.pass_rate}%</span>
                    </div>
                    <Progress value={ecpStats.pass_rate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Voucher Usage</span>
                      <span className="text-sm text-gray-500">
                        {Math.round((ecpStats.vouchers_used / ecpStats.vouchers_allocated) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={(ecpStats.vouchers_used / ecpStats.vouchers_allocated) * 100}
                      className="h-2"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Completion Rate</span>
                      <span className="text-sm text-gray-500">{pdpStats.completion_rate}%</span>
                    </div>
                    <Progress value={pdpStats.completion_rate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Avg. Satisfaction</span>
                      <span className="text-sm text-gray-500">{pdpStats.avg_satisfaction}/5.0</span>
                    </div>
                    <Progress value={(pdpStats.avg_satisfaction / 5) * 100} className="h-2" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  Detailed reports and analytics will be available soon.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
