import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Award,
  Loader2,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  CalendarPlus,
  Ban,
  Play,
  FileText,
  UserPlus,
  ShieldX,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  useAllCertifications,
  useGlobalCertificationStats,
  useRevokeCertification,
  useSuspendCertification,
  useReinstateCertification,
  useExtendCertification,
  useReassignCertification,
  useReissueCertificate,
  CertificationsService,
} from '@/entities/certifications';
import type { CertificationFilters, CertificationStatus, UserCertification } from '@/entities/certifications';
import { useUsers } from '@/entities/users';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Certification Management Admin Page
 * US24: Admin Certification Management - Revoke/Extend/Reassign
 */

type CertificationWithUser = UserCertification & { user_name: string; user_email: string };

export default function CertificationManagement() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [filters, setFilters] = useState<CertificationFilters & { expiring_soon?: boolean }>({});
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Dialog states
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [selectedCertification, setSelectedCertification] = useState<CertificationWithUser | null>(null);

  // Form states
  const [revokeReason, setRevokeReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [extendMonths, setExtendMonths] = useState(12);
  const [reassignUserId, setReassignUserId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  // Build filters based on tab
  const buildFilters = (): CertificationFilters & { expiring_soon?: boolean } => {
    const baseFilters: CertificationFilters & { expiring_soon?: boolean } = { ...filters };
    if (search) baseFilters.search = search;

    switch (activeTab) {
      case 'active':
        baseFilters.status = 'active';
        break;
      case 'expired':
        baseFilters.status = 'expired';
        break;
      case 'expiring':
        baseFilters.expiring_soon = true;
        break;
      case 'revoked':
        baseFilters.status = 'revoked';
        break;
      case 'suspended':
        baseFilters.status = 'suspended';
        break;
      case 'cp':
        baseFilters.certification_type = 'CP';
        break;
      case 'scp':
        baseFilters.certification_type = 'SCP';
        break;
    }

    return baseFilters;
  };

  // Queries
  const { data: certificationsResult, isLoading } = useAllCertifications(buildFilters());
  const { data: statsResult } = useGlobalCertificationStats();
  const { data: allUsers } = useUsers({});

  const certifications = certificationsResult?.data || [];
  const stats = statsResult?.data;

  // Mutations
  const revokeMutation = useRevokeCertification();
  const suspendMutation = useSuspendCertification();
  const reinstateMutation = useReinstateCertification();
  const extendMutation = useExtendCertification();
  const reassignMutation = useReassignCertification();
  const reissueMutation = useReissueCertificate();

  // Handlers
  const handleRevoke = async () => {
    if (!selectedCertification || !currentUser?.id || !revokeReason.trim()) {
      toast.error(t('certMgmt.provideRevokeReason'));
      return;
    }

    try {
      const result = await revokeMutation.mutateAsync({
        certificationId: selectedCertification.id,
        reason: revokeReason,
        adminId: currentUser.id,
      });

      if (result.error) throw result.error;

      toast.success(t('certMgmt.revokedSuccess'));
      setIsRevokeOpen(false);
      setSelectedCertification(null);
      setRevokeReason('');
    } catch (error: any) {
      toast.error(error.message || t('certMgmt.revokeFailed'));
    }
  };

  const handleSuspend = async () => {
    if (!selectedCertification || !currentUser?.id || !suspendReason.trim()) {
      toast.error(t('certMgmt.provideSuspendReason'));
      return;
    }

    try {
      const result = await suspendMutation.mutateAsync({
        certificationId: selectedCertification.id,
        reason: suspendReason,
        adminId: currentUser.id,
      });

      if (result.error) throw result.error;

      toast.success(t('certMgmt.suspendedSuccess'));
      setIsSuspendOpen(false);
      setSelectedCertification(null);
      setSuspendReason('');
    } catch (error: any) {
      toast.error(error.message || t('certMgmt.suspendFailed'));
    }
  };

  const handleReinstate = async (cert: CertificationWithUser) => {
    if (!currentUser?.id) return;

    try {
      const result = await reinstateMutation.mutateAsync({
        certificationId: cert.id,
        adminId: currentUser.id,
      });

      if (result.error) throw result.error;

      toast.success(t('certMgmt.reinstatedSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('certMgmt.reinstateFailed'));
    }
  };

  const handleExtend = async () => {
    if (!selectedCertification || !currentUser?.id) return;

    try {
      const result = await extendMutation.mutateAsync({
        certificationId: selectedCertification.id,
        additionalMonths: extendMonths,
        adminId: currentUser.id,
      });

      if (result.error) throw result.error;

      toast.success(t('certMgmt.extendedSuccess').replace('{months}', extendMonths.toString()));
      setIsExtendOpen(false);
      setSelectedCertification(null);
      setExtendMonths(12);
    } catch (error: any) {
      toast.error(error.message || t('certMgmt.extendFailed'));
    }
  };

  const handleReassign = async () => {
    if (!selectedCertification || !currentUser?.id || !reassignUserId || !reassignReason.trim()) {
      toast.error(t('certMgmt.selectUserAndReason'));
      return;
    }

    try {
      const result = await reassignMutation.mutateAsync({
        certificationId: selectedCertification.id,
        newUserId: reassignUserId,
        reason: reassignReason,
        adminId: currentUser.id,
      });

      if (result.error) throw result.error;

      toast.success(t('certMgmt.reassignedSuccess'));
      setIsReassignOpen(false);
      setSelectedCertification(null);
      setReassignUserId('');
      setReassignReason('');
    } catch (error: any) {
      toast.error(error.message || t('certMgmt.reassignFailed'));
    }
  };

  const handleReissueCertificate = async (cert: CertificationWithUser) => {
    if (!currentUser?.id) return;

    try {
      const result = await reissueMutation.mutateAsync({
        certificationId: cert.id,
        adminId: currentUser.id,
      });

      if (result.error) throw result.error;

      toast.success(t('certMgmt.reissueSuccess'));
    } catch (error: any) {
      toast.error(error.message || t('certMgmt.reissueFailed'));
    }
  };

  const getStatusBadge = (status: CertificationStatus) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('common.active')}
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-300">
            <Clock className="h-3 w-3 mr-1" />
            {t('certMgmt.expired')}
          </Badge>
        );
      case 'revoked':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            {t('certMgmt.revoked')}
          </Badge>
        );
      case 'suspended':
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('certMgmt.suspended')}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysRemaining = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <Award className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">{t('certMgmt.title')}</h1>
            <p className="mt-2 opacity-90">{t('certMgmt.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('common.total')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_certifications}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('common.active')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active_certifications}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">BDA-CP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.cp_certifications}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">BDA-SCP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.scp_certifications}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('certMgmt.expiring')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.expiring_soon}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('certMgmt.expired')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{stats.expired_certifications}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('certMgmt.revoked')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.revoked_certifications}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('certMgmt.suspended')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.suspended_certifications}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('certMgmt.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <Select
                value={filters.certification_type || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, certification_type: value === 'all' ? undefined : (value as 'CP' | 'SCP') })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('certMgmt.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('certMgmt.allTypes')}</SelectItem>
                  <SelectItem value="CP">BDA-CP</SelectItem>
                  <SelectItem value="SCP">BDA-SCP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value === 'all' ? undefined : (value as CertificationStatus) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('certMgmt.allStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('certMgmt.allStatus')}</SelectItem>
                  <SelectItem value="active">{t('common.active')}</SelectItem>
                  <SelectItem value="expired">{t('certMgmt.expired')}</SelectItem>
                  <SelectItem value="revoked">{t('certMgmt.revoked')}</SelectItem>
                  <SelectItem value="suspended">{t('certMgmt.suspended')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs and Table */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
              <TabsTrigger value="active">{t('common.active')}</TabsTrigger>
              <TabsTrigger value="expiring">{t('certMgmt.expiringSoon')}</TabsTrigger>
              <TabsTrigger value="expired">{t('certMgmt.expired')}</TabsTrigger>
              <TabsTrigger value="revoked">{t('certMgmt.revoked')}</TabsTrigger>
              <TabsTrigger value="suspended">{t('certMgmt.suspended')}</TabsTrigger>
              <TabsTrigger value="cp">BDA-CP</TabsTrigger>
              <TabsTrigger value="scp">BDA-SCP</TabsTrigger>
            </TabsList>
          </Tabs>
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
                  <TableHead>{t('certMgmt.holder')}</TableHead>
                  <TableHead>{t('certMgmt.credentialId')}</TableHead>
                  <TableHead>{t('certMgmt.type')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('certMgmt.issued')}</TableHead>
                  <TableHead>{t('certMgmt.expires')}</TableHead>
                  <TableHead>{t('certMgmt.daysLeft')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certifications.length > 0 ? (
                  certifications.map((cert) => {
                    const daysLeft = getDaysRemaining(cert.expiry_date);
                    const isExpiringSoon = daysLeft > 0 && daysLeft <= 60;

                    return (
                      <TableRow key={cert.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{cert.user_name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{cert.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {cert.credential_id}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cert.certification_type === 'SCP' ? 'border-purple-300 bg-purple-50' : 'border-blue-300 bg-blue-50'}>
                            BDA-{cert.certification_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(cert.status)}</TableCell>
                        <TableCell>{formatDate(cert.issued_date)}</TableCell>
                        <TableCell>{formatDate(cert.expiry_date)}</TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${
                              daysLeft <= 0
                                ? 'text-red-600'
                                : isExpiringSoon
                                ? 'text-orange-600'
                                : 'text-green-600'
                            }`}
                          >
                            {daysLeft <= 0 ? t('certMgmt.expired') : `${daysLeft} ${t('certMgmt.days')}`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {/* Extend */}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCertification(cert);
                                  setIsExtendOpen(true);
                                }}
                              >
                                <CalendarPlus className="h-4 w-4 mr-2" />
                                {t('certMgmt.extendCertification')}
                              </DropdownMenuItem>

                              {/* Reassign */}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCertification(cert);
                                  setIsReassignOpen(true);
                                }}
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                {t('certMgmt.reassignToUser')}
                              </DropdownMenuItem>

                              {/* Re-issue Certificate */}
                              <DropdownMenuItem onClick={() => handleReissueCertificate(cert)}>
                                <FileText className="h-4 w-4 mr-2" />
                                {t('certMgmt.reissueCertificate')}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* Status Actions */}
                              {cert.status === 'active' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedCertification(cert);
                                      setIsSuspendOpen(true);
                                    }}
                                    className="text-orange-600"
                                  >
                                    <ShieldX className="h-4 w-4 mr-2" />
                                    {t('certMgmt.suspend')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedCertification(cert);
                                      setIsRevokeOpen(true);
                                    }}
                                    className="text-red-600"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    {t('certMgmt.revoke')}
                                  </DropdownMenuItem>
                                </>
                              )}

                              {(cert.status === 'revoked' || cert.status === 'suspended') && (
                                <DropdownMenuItem
                                  onClick={() => handleReinstate(cert)}
                                  className="text-green-600"
                                >
                                  <ShieldCheck className="h-4 w-4 mr-2" />
                                  {t('certMgmt.reinstate')}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t('certMgmt.noCertificationsFound')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Revoke Dialog */}
      <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">{t('certMgmt.revokeCertification')}</DialogTitle>
            <DialogDescription>
              {t('certMgmt.revokeDesc').replace('{name}', selectedCertification?.user_name || '')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>{t('common.warning')}:</strong> {t('certMgmt.revokeWarning')}
              </p>
            </div>
            <div>
              <Label>{t('certMgmt.revocationReason')}</Label>
              <Textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder={t('certMgmt.revocationPlaceholder')}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevokeOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revokeMutation.isPending || !revokeReason.trim()}
            >
              {revokeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('certMgmt.revokeCertification')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={isSuspendOpen} onOpenChange={setIsSuspendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-orange-600">{t('certMgmt.suspendCertification')}</DialogTitle>
            <DialogDescription>
              {t('certMgmt.suspendDesc').replace('{name}', selectedCertification?.user_name || '')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('certMgmt.suspensionReason')}</Label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder={t('certMgmt.suspensionPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSuspendOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleSuspend}
              disabled={suspendMutation.isPending || !suspendReason.trim()}
            >
              {suspendMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('certMgmt.suspendCertification')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog */}
      <Dialog open={isExtendOpen} onOpenChange={setIsExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('certMgmt.extendCertification')}</DialogTitle>
            <DialogDescription>
              {t('certMgmt.extendDesc').replace('{name}', selectedCertification?.user_name || '')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('certMgmt.currentExpiry')}:</span>
                  <p className="font-semibold">
                    {selectedCertification ? formatDate(selectedCertification.expiry_date) : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">{t('certMgmt.daysRemaining')}:</span>
                  <p className="font-semibold">
                    {selectedCertification ? getDaysRemaining(selectedCertification.expiry_date) : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>{t('certMgmt.extensionPeriod')}</Label>
              <Select
                value={extendMonths.toString()}
                onValueChange={(value) => setExtendMonths(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">{t('certMgmt.months6')}</SelectItem>
                  <SelectItem value="12">{t('certMgmt.months12')}</SelectItem>
                  <SelectItem value="24">{t('certMgmt.months24')}</SelectItem>
                  <SelectItem value="36">{t('certMgmt.months36')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleExtend} disabled={extendMutation.isPending}>
              {extendMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('certMgmt.extendBy').replace('{months}', extendMonths.toString())}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={isReassignOpen} onOpenChange={setIsReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('certMgmt.reassignCertification')}</DialogTitle>
            <DialogDescription>
              {t('certMgmt.reassignDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>{t('common.note')}:</strong> {t('certMgmt.reassignNote')
                  .replace('{credential}', selectedCertification?.credential_id || '')
                  .replace('{name}', selectedCertification?.user_name || '')}
              </p>
            </div>

            <div>
              <Label>{t('certMgmt.selectNewHolder')}</Label>
              <Select value={reassignUserId} onValueChange={setReassignUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('certMgmt.selectUser')} />
                </SelectTrigger>
                <SelectContent>
                  {allUsers
                    ?.filter((u) => u.id !== selectedCertification?.user_id)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name && user.last_name
                          ? `${user.first_name} ${user.last_name} (${user.email})`
                          : user.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('certMgmt.reassignReason')}</Label>
              <Textarea
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder={t('certMgmt.reassignPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReassignOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleReassign}
              disabled={reassignMutation.isPending || !reassignUserId || !reassignReason.trim()}
            >
              {reassignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('certMgmt.reassignCertification')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

CertificationManagement.displayName = 'CertificationManagement';
