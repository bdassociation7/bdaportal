/**
 * Admin PDP Annual Reports Review
 *
 * Review and approve annual reports submitted by PDP partners:
 * - View all submitted reports
 * - Review report metrics and content
 * - Approve or reject reports with feedback
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  FileText,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Calendar,
  TrendingUp,
  Users,
  Award,
  Loader2,
  BarChart3,
  Building2,
} from 'lucide-react';
import type { ReportStatus } from '@/entities/pdp/pdp.types';
import { useLanguage } from '@/contexts/LanguageContext';

interface AnnualReportWithPartner {
  id: string;
  partner_id: string;
  report_year: number;
  total_programs: number;
  total_enrollments: number;
  total_completions: number;
  total_pdc_credits_issued: number;
  average_satisfaction_score?: number;
  completion_rate?: number;
  summary?: string;
  challenges?: string;
  improvements_planned?: string;
  report_file_url?: string;
  status: ReportStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  partner?: {
    email: string;
    company_name?: string;
    first_name?: string;
    last_name?: string;
  };
}

const statusColors: Record<ReportStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

// Status labels will be provided by the component using translations

async function fetchAllAnnualReports(): Promise<AnnualReportWithPartner[]> {
  const { data, error } = await supabase
    .from('pdp_annual_reports')
    .select(`
      *,
      partner:partners!pdp_annual_reports_partner_id_fkey(
        company_name,
        contact_person,
        contact_email
      )
    `)
    .order('report_year', { ascending: false })
    .order('submitted_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((report: any) => ({
    ...report,
    partner: report.partner ? {
      email: report.partner.contact_email,
      company_name: report.partner.company_name,
      first_name: report.partner.contact_person?.split(' ')[0] || '',
      last_name: report.partner.contact_person?.split(' ').slice(1).join(' ') || '',
    } : undefined,
  }));
}

export default function PDPAnnualReports() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<AnnualReportWithPartner | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  // Translated status labels
  const getStatusLabel = (status: ReportStatus): string => {
    switch (status) {
      case 'draft': return t('pdpAnnualReports.draft');
      case 'submitted': return t('common.submitted');
      case 'under_review': return t('pdpAnnualReports.underReview');
      case 'approved': return t('common.approved');
      case 'rejected': return t('common.rejected');
    }
  };

  // Query
  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['admin', 'pdp-annual-reports'],
    queryFn: fetchAllAnnualReports,
  });

  // Mutation for reviewing reports
  const reviewMutation = useMutation({
    mutationFn: async ({
      reportId,
      status,
      notes,
    }: {
      reportId: string;
      status: ReportStatus;
      notes: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('pdp_annual_reports')
        .update({
          status,
          review_notes: notes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pdp-annual-reports'] });
      toast({ title: t('pdpAnnualReports.reportUpdated'), description: t('pdpAnnualReports.reportReviewedSuccess') });
      setShowReviewDialog(false);
      setSelectedReport(null);
      setReviewNotes('');
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  // Filter reports
  const filteredReports = reports?.filter((report) => {
    const partnerName = report.partner?.company_name ||
      `${report.partner?.first_name || ''} ${report.partner?.last_name || ''}`.trim() ||
      report.partner?.email || '';

    const matchesSearch =
      partnerName.toLowerCase().includes(search.toLowerCase()) ||
      report.partner?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesYear = yearFilter === 'all' || report.report_year.toString() === yearFilter;

    return matchesSearch && matchesStatus && matchesYear;
  }) || [];

  // Get unique years for filter
  const years = [...new Set(reports?.map((r) => r.report_year) || [])].sort((a, b) => b - a);

  // Stats
  const totalReports = reports?.length || 0;
  const pendingReports = reports?.filter((r) => r.status === 'submitted' || r.status === 'under_review').length || 0;
  const approvedReports = reports?.filter((r) => r.status === 'approved').length || 0;
  const rejectedReports = reports?.filter((r) => r.status === 'rejected').length || 0;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPartnerName = (report: AnnualReportWithPartner) => {
    if (report.partner?.company_name) return report.partner.company_name;
    if (report.partner?.first_name || report.partner?.last_name) {
      return `${report.partner.first_name || ''} ${report.partner.last_name || ''}`.trim();
    }
    return report.partner?.email || t('pdpAnnualReports.unknownPartner');
  };

  const openReviewDialog = (report: AnnualReportWithPartner) => {
    setSelectedReport(report);
    setReviewNotes(report.review_notes || '');
    setShowReviewDialog(true);
  };

  const handleReview = (status: ReportStatus) => {
    if (!selectedReport) return;
    reviewMutation.mutate({
      reportId: selectedReport.id,
      status,
      notes: reviewNotes,
    });
  };

  const markUnderReview = async (report: AnnualReportWithPartner) => {
    reviewMutation.mutate({
      reportId: report.id,
      status: 'under_review',
      notes: report.review_notes || '',
    });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('pdpAnnualReports.errorLoadingReports')}</AlertTitle>
          <AlertDescription>
            {t('pdpAnnualReports.unableToLoad')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">{t('pdpAnnualReports.title')}</h1>
            <p className="mt-2 opacity-90">
              {t('pdpAnnualReports.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('pdpAnnualReports.totalReports')}</p>
                <p className="text-3xl font-bold">{totalReports}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className={pendingReports > 0 ? 'border-amber-200' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('pdpAnnualReports.pendingReview')}</p>
                <p className="text-3xl font-bold text-amber-600">{pendingReports}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('common.approved')}</p>
                <p className="text-3xl font-bold text-green-600">{approvedReports}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('common.rejected')}</p>
                <p className="text-3xl font-bold text-red-600">{rejectedReports}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('pdpAnnualReports.allAnnualReports')}</CardTitle>
              <CardDescription>{t('pdpAnnualReports.reviewReports')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('pdpAnnualReports.searchPartners')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={t('pdpAnnualReports.year')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('pdpAnnualReports.allYears')}</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t('table.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('pdpAnnualReports.allStatus')}</SelectItem>
                  <SelectItem value="submitted">{t('common.submitted')}</SelectItem>
                  <SelectItem value="under_review">{t('pdpAnnualReports.underReview')}</SelectItem>
                  <SelectItem value="approved">{t('common.approved')}</SelectItem>
                  <SelectItem value="rejected">{t('common.rejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pdpAnnualReports.partner')}</TableHead>
                <TableHead>{t('pdpAnnualReports.year')}</TableHead>
                <TableHead>{t('pdpAnnualReports.programs')}</TableHead>
                <TableHead>{t('pdpAnnualReports.enrolments')}</TableHead>
                <TableHead>{t('pdpAnnualReports.pdcsIssued')}</TableHead>
                <TableHead>{t('pdpAnnualReports.submitted')}</TableHead>
                <TableHead>{t('table.status')}</TableHead>
                <TableHead>{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getPartnerName(report)}</p>
                        <p className="text-sm text-gray-500">{report.partner?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{report.report_year}</TableCell>
                    <TableCell>{report.total_programs}</TableCell>
                    <TableCell>{report.total_enrollments.toLocaleString()}</TableCell>
                    <TableCell>{report.total_pdc_credits_issued.toLocaleString()}</TableCell>
                    <TableCell>{formatDate(report.submitted_at)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[report.status]}>
                        {getStatusLabel(report.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openReviewDialog(report)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('pdpAnnualReports.viewReview')}
                          </DropdownMenuItem>
                          {report.status === 'submitted' && (
                            <DropdownMenuItem onClick={() => markUnderReview(report)}>
                              <Clock className="h-4 w-4 mr-2" />
                              {t('pdpAnnualReports.markUnderReview')}
                            </DropdownMenuItem>
                          )}
                          {(report.status === 'submitted' || report.status === 'under_review') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setReviewNotes('');
                                  handleReview('approved');
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {t('pdpAnnualReports.quickApprove')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {t('pdpAnnualReports.noReports')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReport?.report_year} {t('pdpAnnualReports.annualReportReview')}
            </DialogTitle>
            <DialogDescription>
              {selectedReport && getPartnerName(selectedReport)}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6 py-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <Badge className={statusColors[selectedReport.status]}>
                  {getStatusLabel(selectedReport.status)}
                </Badge>
                {selectedReport.submitted_at && (
                  <span className="text-sm text-gray-600">
                    {t('pdpAnnualReports.submitted')}: {formatDate(selectedReport.submitted_at)}
                  </span>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedReport.total_programs}
                  </p>
                  <p className="text-sm text-gray-600">{t('pdpAnnualReports.programs')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedReport.total_enrollments.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">{t('pdpAnnualReports.enrolments')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedReport.total_completions.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">{t('pdpAnnualReports.completions')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {selectedReport.total_pdc_credits_issued.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">{t('pdpAnnualReports.pdcsIssued')}</p>
                </div>
              </div>

              {/* Additional Metrics */}
              {(selectedReport.completion_rate || selectedReport.average_satisfaction_score) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedReport.completion_rate && (
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-gray-600">{t('pdpAnnualReports.completionRate')}</p>
                      <p className="text-xl font-bold">{selectedReport.completion_rate}%</p>
                    </div>
                  )}
                  {selectedReport.average_satisfaction_score && (
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-gray-600">{t('pdpAnnualReports.avgSatisfaction')}</p>
                      <p className="text-xl font-bold">
                        {selectedReport.average_satisfaction_score}/5
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {selectedReport.summary && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t('pdpAnnualReports.executiveSummary')}</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedReport.summary}</p>
                </div>
              )}

              {/* Challenges */}
              {selectedReport.challenges && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t('pdpAnnualReports.challengesFaced')}</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">{selectedReport.challenges}</p>
                </div>
              )}

              {/* Improvements */}
              {selectedReport.improvements_planned && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t('pdpAnnualReports.plannedImprovements')}</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">
                    {selectedReport.improvements_planned}
                  </p>
                </div>
              )}

              {/* Review Notes */}
              <div className="space-y-2 border-t pt-4">
                <Label>{t('pdpAnnualReports.reviewNotes')}</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={t('pdpAnnualReports.addFeedback')}
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              {t('common.cancel')}
            </Button>
            {selectedReport &&
              (selectedReport.status === 'submitted' ||
                selectedReport.status === 'under_review') && (
                <>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleReview('rejected')}
                    disabled={reviewMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {t('pdpAnnualReports.reject')}
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleReview('approved')}
                    disabled={reviewMutation.isPending}
                  >
                    {reviewMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('pdpAnnualReports.approve')}
                  </Button>
                </>
              )}
            {selectedReport &&
              selectedReport.status !== 'submitted' &&
              selectedReport.status !== 'under_review' && (
                <Button onClick={() => setShowReviewDialog(false)}>{t('pdpAnnualReports.close')}</Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
