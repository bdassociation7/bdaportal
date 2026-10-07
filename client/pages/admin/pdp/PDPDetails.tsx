/**
 * PDP Partner Details Page
 * Comprehensive view of PDP partner information, programs, and license
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
  GraduationCap,
  Edit,
  BookOpen,
  Users,
  Award,
  FileText,
  AlertCircle,
  Calendar,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const formatLicenceDate = (dateString: string) => {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(Date.UTC(year, month - 1, day)));
};

export default function PDPDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch PDP partner data
  const { data: partner, isLoading, error } = useQuery({
    queryKey: ['pdp-partner', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', id)
        .eq('partner_type', 'pdp')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch programs
  const { data: programs } = useQuery({
    queryKey: ['pdp-programs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdp_programs')
        .select('*')
        .eq('provider_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch license
  const { data: license } = useQuery({
    queryKey: ['pdp-license', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdp_licenses')
        .select('*')
        .eq('partner_id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AdminPageLayout title="Loading..." backTo="/admin/pdp-management">
        <Skeleton className="h-96 w-full" />
      </AdminPageLayout>
    );
  }

  if (error || !partner) {
    return (
      <AdminPageLayout title="Partner Not Found" backTo="/admin/pdp-management">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>PDP partner not found.</AlertDescription>
        </Alert>
      </AdminPageLayout>
    );
  }

  const approvedPrograms = programs?.filter((p) => p.status === 'approved').length || 0;
  const pendingPrograms = programs?.filter((p) => p.status === 'pending').length || 0;

  return (
    <AdminPageLayout
      title={partner.company_name}
      subtitle="PDP - Professional Development Partner"
      backTo="/admin/pdp-management"
      
      actions={
        <>
          {license && (
            <Button
              onClick={() => navigate(`/admin/pdp/${id}/license`)}
              variant="outline"
              className="bg-white text-gray-900 hover:bg-gray-100"
            >
              <FileText className="h-4 w-4 mr-2" />
              Manage License
            </Button>
          )}
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="license">License</TabsTrigger>
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
                    <p className="text-sm text-gray-500">Total Programs</p>
                    <p className="text-2xl font-bold">{programs?.length || 0}</p>
                  </div>
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Approved</p>
                    <p className="text-2xl font-bold">{approvedPrograms}</p>
                  </div>
                  <Award className="h-6 w-6 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="text-2xl font-bold">{pendingPrograms}</p>
                  </div>
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Programs Tab */}
        <TabsContent value="programs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Programs</CardTitle>
                  <CardDescription>All professional development programs by this partner</CardDescription>
                </div>
                <Button
                  onClick={() => navigate('/admin/pdp-programs')}
                  variant="outline"
                  size="sm"
                >
                  View All Programs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {programs && programs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Activity Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>PDC Credits</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((prog: any) => (
                      <TableRow key={prog.id}>
                        <TableCell className="font-mono text-sm">{prog.program_id}</TableCell>
                        <TableCell className="font-medium">{prog.program_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {prog.activity_type?.replace('_', ' ') || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>{prog.duration_hours || 0}h</TableCell>
                        <TableCell className="font-medium">{prog.max_pdc_credits}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              prog.status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : prog.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : prog.status === 'under_review'
                                ? 'bg-blue-100 text-blue-700'
                                : prog.status === 'revision_requested'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-700'
                            }
                          >
                            {prog.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/pdp-programs/${prog.id}/review`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No programs found for this partner.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Program Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Programs</p>
                  <p className="text-2xl font-bold mt-1">{programs?.length || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{approvedPrograms}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Pending Review</p>
                  <p className="text-2xl font-bold mt-1 text-amber-600">{pendingPrograms}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total PDCs</p>
                  <p className="text-2xl font-bold mt-1 text-purple-600">
                    {programs?.filter(p => p.status === 'approved').reduce((sum, p) => sum + (p.max_pdc_credits || 0), 0) || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* License Tab */}
        <TabsContent value="license" className="space-y-4">
          {license ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>License Information</CardTitle>
                    <Button onClick={() => navigate(`/admin/pdp/${id}/license`)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Manage License
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <Label className="text-gray-500">License Number</Label>
                      <p className="font-medium font-mono mt-1">{license.license_number}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Partner Code</Label>
                      <p className="font-medium font-mono mt-1">{license.partner_code}</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Status</Label>
                      <div className="mt-1">
                        <Badge
                          className={
                            license.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : license.status === 'suspended'
                              ? 'bg-red-100 text-red-700'
                              : license.status === 'expired'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-amber-100 text-amber-700'
                          }
                        >
                          {license.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-500">Issue Date</Label>
                      <p className="font-medium mt-1">
                        <span dir="ltr">{formatLicenceDate(license.issue_date)}</span>
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Expiry Date</Label>
                      <p className="font-medium mt-1">
                        <span dir="ltr">{formatLicenceDate(license.expiry_date)}</span>
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Submission Enabled</Label>
                      <Badge
                        variant="outline"
                        className={license.program_submission_enabled ? 'text-green-700' : 'text-red-700'}
                      >
                        {license.program_submission_enabled ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Program Slots Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Program Slots Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Programs Used</p>
                      <p className="text-3xl font-bold mt-1">{license.programs_used}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Maximum Programs</p>
                      <p className="text-3xl font-bold mt-1">{license.max_programs}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Slot Usage</span>
                      <span className="text-sm text-gray-500">
                        {Math.round((license.programs_used / license.max_programs) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={(license.programs_used / license.max_programs) * 100}
                      className="h-3"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-sm text-gray-500">Available Slots</p>
                      <p className="text-2xl font-bold mt-1 text-green-600">
                        {license.max_programs - license.programs_used}
                      </p>
                    </div>
                    {license.programs_used >= license.max_programs && (
                      <Alert className="flex-1 ml-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          All program slots are used. Consider increasing the slot limit.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* License Validity */}
              <Card>
                <CardHeader>
                  <CardTitle>License Validity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Issued</p>
                          <p className="font-medium" dir="ltr">{formatLicenceDate(license.issue_date)}</p>
                        </div>
                      </div>
                      <div className="text-center px-4">
                        <p className="text-sm text-gray-500">Duration</p>
                        <p className="font-medium">
                          {Math.ceil((new Date(license.expiry_date).getTime() - new Date(license.issue_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-500">Expires</p>
                          <p className="font-medium" dir="ltr">{formatLicenceDate(license.expiry_date)}</p>
                        </div>
                      </div>
                    </div>

                    {license.admin_notes && (
                      <div className="pt-4 border-t">
                        <Label className="text-gray-500">Admin Notes</Label>
                        <p className="mt-1 text-gray-900 whitespace-pre-wrap">{license.admin_notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No license found for this partner. Create a license to enable program submissions.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}
