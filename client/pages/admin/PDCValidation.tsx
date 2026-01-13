import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Award,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Search,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/app/providers/AuthProvider';
import {
  usePdcEntries,
  usePdcStats,
  useReviewPdcEntry,
  ACTIVITY_TYPE_LABELS,
} from '@/entities/pdcs';
import type {
  PdcFilters,
  PdcStatus,
  CertificationType,
  ReviewPdcDTO,
  PdcEntry,
} from '@/entities/pdcs';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PDCValidation() {
  const { t } = useLanguage();
  const { user } = useAuthContext();
  const [filters, setFilters] = useState<PdcFilters>({ status: 'pending' });
  const [search, setSearch] = useState('');
  const [reviewingEntry, setReviewingEntry] = useState<PdcEntry | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const { data: entries, isLoading } = usePdcEntries({ ...filters, search });
  const { data: stats } = usePdcStats();

  const reviewMutation = useReviewPdcEntry();

  const [reviewForm, setReviewForm] = useState<{
    status: 'approved' | 'rejected';
    credits_approved: number;
    rejection_reason: string;
  }>({
    status: 'approved',
    credits_approved: 0,
    rejection_reason: '',
  });

  const openReviewDialog = (entry: PdcEntry) => {
    setReviewingEntry(entry);
    setReviewForm({
      status: 'approved',
      credits_approved: entry.credits_claimed, // Default to claimed amount
      rejection_reason: '',
    });
    setIsReviewOpen(true);
  };

  const handleReview = async () => {
    if (!reviewingEntry || !user?.id) return;

    const dto: ReviewPdcDTO = {
      status: reviewForm.status,
      credits_approved: reviewForm.status === 'approved' ? reviewForm.credits_approved : undefined,
      rejection_reason: reviewForm.status === 'rejected' ? reviewForm.rejection_reason : undefined,
    };

    console.log('Review DTO:', dto);
    console.log('Credits claimed:', reviewingEntry.credits_claimed);
    console.log('Credits approved:', reviewForm.credits_approved);

    await reviewMutation.mutateAsync({
      id: reviewingEntry.id,
      reviewerId: user.id,
      dto,
    });

    setIsReviewOpen(false);
    setReviewingEntry(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('common.approved')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="default" className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            {t('common.rejected')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="default" className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            {t('pdcValidation.pending')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <Award className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">{t('pdcValidation.title')}</h1>
            <p className="mt-2 opacity-90">{t('pdcValidation.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('pdcValidation.totalEntries')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_entries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('pdcValidation.pendingReview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.pending_entries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('common.approved')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.approved_entries}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('pdcValidation.totalCredits')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_credits_approved}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('pdcValidation.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value === 'all' ? undefined : (value as PdcStatus) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('pdcValidation.allStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('pdcValidation.allStatus')}</SelectItem>
                  <SelectItem value="pending">{t('pdcValidation.pending')}</SelectItem>
                  <SelectItem value="approved">{t('common.approved')}</SelectItem>
                  <SelectItem value="rejected">{t('common.rejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Select
                value={filters.certification_type || 'all'}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    certification_type: value === 'all' ? undefined : (value as CertificationType),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('pdcValidation.allCertifications')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('pdcValidation.allCertifications')}</SelectItem>
                  <SelectItem value="CP">BDA-CP™</SelectItem>
                  <SelectItem value="SCP">BDA-SCP™</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pdcValidation.pdcEntries')}</CardTitle>
          <CardDescription>{t('pdcValidation.pdcEntriesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-royal-600" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pdcValidation.user')}</TableHead>
                  <TableHead>{t('pdcValidation.activity')}</TableHead>
                  <TableHead>{t('pdcValidation.type')}</TableHead>
                  <TableHead>{t('pdcValidation.cert')}</TableHead>
                  <TableHead>{t('pdcValidation.date')}</TableHead>
                  <TableHead>{t('pdcValidation.credits')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead>{t('common.submitted')}</TableHead>
                  <TableHead>{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries && entries.length > 0 ? (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="font-medium">
                          {entry.user?.first_name && entry.user?.last_name
                            ? `${entry.user.first_name} ${entry.user.last_name}`
                            : t('pdcValidation.noName')}
                        </div>
                        <div className="text-sm text-muted-foreground">{entry.user?.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{entry.activity_title}</div>
                        {entry.activity_description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {entry.activity_description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ACTIVITY_TYPE_LABELS[entry.activity_type]}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">BDA-{entry.certification_type}™</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(entry.activity_date)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{t('pdcValidation.claimed')}: {entry.credits_claimed}</div>
                          {entry.credits_approved !== null && (
                            <div className="text-green-600 font-medium">
                              {t('common.approved')}: {entry.credits_approved}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                      <TableCell className="text-sm">{formatDate(entry.submission_date)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {entry.certificate_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const { data } = await supabase.storage
                                    .from('resources')
                                    .createSignedUrl(entry.certificate_url!, 3600);

                                  if (data?.signedUrl) {
                                    window.open(data.signedUrl, '_blank');
                                  } else {
                                    toast.error(t('pdcValidation.failedToGenerateUrl'));
                                  }
                                } catch (error) {
                                  console.error('Download error:', error);
                                  toast.error(t('pdcValidation.failedToDownload'));
                                }
                              }}
                              title={t('pdcValidation.viewCertificate')}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {entry.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openReviewDialog(entry)}
                              title={t('pdcValidation.review')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      {t('pdcValidation.noEntries')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('pdcValidation.reviewPdcEntry')}</DialogTitle>
            <DialogDescription>
              {t('pdcValidation.reviewDescription')}
            </DialogDescription>
          </DialogHeader>
          {reviewingEntry && (
            <div className="space-y-4">
              {/* Entry Details */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div>
                  <span className="text-sm font-medium">{t('pdcValidation.user')}:</span>{' '}
                  <span className="text-sm">
                    {reviewingEntry.user?.first_name} {reviewingEntry.user?.last_name} (
                    {reviewingEntry.user?.email})
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium">{t('pdcValidation.activity')}:</span>{' '}
                  <span className="text-sm">{reviewingEntry.activity_title}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">{t('pdcValidation.type')}:</span>{' '}
                  <span className="text-sm">{ACTIVITY_TYPE_LABELS[reviewingEntry.activity_type]}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">{t('pdcValidation.certification')}:</span>{' '}
                  <Badge variant="outline">BDA-{reviewingEntry.certification_type}™</Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">{t('pdcValidation.activityDate')}:</span>{' '}
                  <span className="text-sm">{formatDate(reviewingEntry.activity_date)}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">{t('pdcValidation.creditsClaimed')}:</span>{' '}
                  <span className="text-sm font-bold">{reviewingEntry.credits_claimed}</span>
                </div>
                {reviewingEntry.activity_description && (
                  <div>
                    <span className="text-sm font-medium">{t('pdcValidation.description')}:</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {reviewingEntry.activity_description}
                    </p>
                  </div>
                )}
                {reviewingEntry.notes && (
                  <div>
                    <span className="text-sm font-medium">{t('pdcValidation.notes')}:</span>
                    <p className="text-sm text-muted-foreground mt-1">{reviewingEntry.notes}</p>
                  </div>
                )}
                {reviewingEntry.certificate_url && (
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const { data } = await supabase.storage
                            .from('resources')
                            .createSignedUrl(reviewingEntry.certificate_url!, 3600);

                          if (data?.signedUrl) {
                            window.open(data.signedUrl, '_blank');
                          } else {
                            toast.error(t('pdcValidation.failedToGenerateUrl'));
                          }
                        } catch (error) {
                          console.error('Download error:', error);
                          toast.error(t('pdcValidation.failedToDownload'));
                        }
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      {t('pdcValidation.viewCertificateProof')}
                    </Button>
                  </div>
                )}
              </div>

              {/* Review Form */}
              <div className="space-y-4">
                <div>
                  <Label>{t('pdcValidation.decision')} *</Label>
                  <Select
                    value={reviewForm.status}
                    onValueChange={(value) =>
                      setReviewForm({ ...reviewForm, status: value as 'approved' | 'rejected' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">{t('pdcValidation.approve')}</SelectItem>
                      <SelectItem value="rejected">{t('pdcValidation.reject')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {reviewForm.status === 'approved' && (
                  <div>
                    <Label>{t('pdcValidation.creditsToApprove')} *</Label>
                    <Input
                      type="number"
                      min={0}
                      max={reviewingEntry.credits_claimed}
                      value={reviewForm.credits_approved}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        const maxValue = reviewingEntry.credits_claimed;
                        // Ensure value doesn't exceed claimed credits
                        const validValue = Math.min(Math.max(0, value), maxValue);
                        setReviewForm({ ...reviewForm, credits_approved: validValue });
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('pdcValidation.adjustCreditsHint').replace('{max}', reviewingEntry.credits_claimed.toString())}
                    </p>
                  </div>
                )}

                {reviewForm.status === 'rejected' && (
                  <div>
                    <Label>{t('pdcValidation.rejectionReason')} *</Label>
                    <Textarea
                      value={reviewForm.rejection_reason}
                      onChange={(e) =>
                        setReviewForm({ ...reviewForm, rejection_reason: e.target.value })
                      }
                      placeholder={t('pdcValidation.rejectionPlaceholder')}
                      rows={4}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleReview}
              disabled={
                reviewMutation.isPending ||
                (reviewForm.status === 'rejected' && !reviewForm.rejection_reason)
              }
              variant={reviewForm.status === 'approved' ? 'default' : 'destructive'}
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {reviewForm.status === 'approved' ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('pdcValidation.approve')}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('pdcValidation.reject')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

PDCValidation.displayName = 'PDCValidation';
