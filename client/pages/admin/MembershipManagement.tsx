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
  Crown,
  Loader2,
  Search,
  Star,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Download,
  CalendarPlus,
  Ban,
  Play,
  FileText,
  Users,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  useAllMemberships,
  useMembershipStats,
  useCreateMembership,
  useExtendMembership,
  useDeactivateMembership,
  useReactivateMembership,
  useReissueCertificate,
  useBulkActivateMemberships,
  MembershipService,
} from '@/entities/membership';
import type {
  UserMembership,
  MembershipFilters,
  MembershipType,
  MembershipStatus,
} from '@/entities/membership';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Membership Management Admin Page
 * US7: Admin Panel: Membership Control
 */

export default function MembershipManagement() {
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [filters, setFilters] = useState<MembershipFilters>({});
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<UserMembership | null>(null);

  // Form states - US1: Email-based assignment (not user dropdown)
  const [createForm, setCreateForm] = useState({
    user_email: '', // US1: Use email instead of user_id
    membership_type: 'basic' as MembershipType,
    duration_months: 12,
    notes: '',
    start_date: '', // Optional: for backdating memberships
  });

  // US2: Bulk activation state
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkType, setBulkType] = useState<MembershipType>('basic');
  const [bulkDuration, setBulkDuration] = useState(12);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkNotes, setBulkNotes] = useState('');
  const [showBulkResults, setShowBulkResults] = useState(false);
  const [bulkResults, setBulkResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{ email: string; success: boolean; error?: string }>;
  } | null>(null);

  const [extendMonths, setExtendMonths] = useState(12);
  const [extendNotes, setExtendNotes] = useState('');
  const [deactivateReason, setDeactivateReason] = useState('');

  // Build filters based on tab
  const buildFilters = (): MembershipFilters => {
    const baseFilters: MembershipFilters = { ...filters };
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
      case 'basic':
        baseFilters.membership_type = 'basic';
        baseFilters.status = 'active';
        break;
      case 'professional':
        baseFilters.membership_type = 'professional';
        baseFilters.status = 'active';
        break;
    }

    return baseFilters;
  };

  // Queries
  const { data: membershipsResult, isLoading } = useAllMemberships(buildFilters());
  const { data: statsResult } = useMembershipStats();
  // US1: Removed useUsers - no longer needed with email input

  const memberships = membershipsResult?.data || [];
  const stats = statsResult?.data;

  // Mutations
  const createMutation = useCreateMembership();
  const extendMutation = useExtendMembership();
  const deactivateMutation = useDeactivateMembership();
  const reactivateMutation = useReactivateMembership();
  const reissueMutation = useReissueCertificate();
  const bulkActivateMutation = useBulkActivateMemberships();

  // Handlers - US1: Email-based membership creation
  const handleCreate = async () => {
    if (!createForm.user_email || !currentUser?.id) {
      toast.error('Please enter user email');
      return;
    }

    try {
      // US1: Look up user by email first
      const { data: usersData } = await supabase
        .from('users')
        .select('id')
        .ilike('email', createForm.user_email.trim())
        .maybeSingle();

      if (!usersData) {
        toast.error('No user found with this email');
        return;
      }

      const result = await createMutation.mutateAsync({
        params: {
          user_id: usersData.id,
          membership_type: createForm.membership_type,
          duration_months: createForm.duration_months,
          notes: createForm.notes || undefined,
          start_date: createForm.start_date || undefined, // Pass start_date for backdating
        },
        adminId: currentUser.id,
      });

      if (result.error) throw result.error;

      toast.success('Membership created successfully');
      setIsCreateOpen(false);
      setCreateForm({ user_email: '', membership_type: 'basic', duration_months: 12, notes: '', start_date: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create membership');
    }
  };

  const handleExtend = async () => {
    if (!selectedMembership || !currentUser?.id) return;

    try {
      const result = await extendMutation.mutateAsync({
        params: {
          membership_id: selectedMembership.id,
          additional_months: extendMonths,
          notes: extendNotes || undefined,
        },
        adminId: currentUser.id,
      });

      if (result.error) throw result.error;

      toast.success(`Membership extended by ${extendMonths} months`);
      setIsExtendOpen(false);
      setSelectedMembership(null);
      setExtendMonths(12);
      setExtendNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to extend membership');
    }
  };

  const handleDeactivate = async () => {
    if (!selectedMembership || !currentUser?.id) return;

    try {
      const result = await deactivateMutation.mutateAsync({
        params: {
          membership_id: selectedMembership.id,
          reason: deactivateReason || undefined,
        },
        adminId: currentUser.id,
      });

      if (result.error) throw result.error;

      toast.success('Membership deactivated');
      setIsDeactivateOpen(false);
      setSelectedMembership(null);
      setDeactivateReason('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate membership');
    }
  };

  const handleReactivate = async (membership: UserMembership) => {
    if (!currentUser?.id) return;

    try {
      const result = await reactivateMutation.mutateAsync({
        membershipId: membership.id,
        adminId: currentUser.id,
      });

      if (result.error) throw result.error;

      toast.success('Membership reactivated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reactivate membership');
    }
  };

  const handleReissueCertificate = async (membership: UserMembership) => {
    if (!currentUser?.id) return;

    try {
      const result = await reissueMutation.mutateAsync({
        membershipId: membership.id,
        adminId: currentUser.id,
      });

      if (result.error) throw result.error;

      toast.success('Certificate re-issue requested. It will be generated shortly.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to re-issue certificate');
    }
  };

  // US2: Bulk activation handler
  const handleBulkActivate = async () => {
    if (!bulkEmails.trim() || !currentUser?.id) {
      toast.error('Please enter at least one email address');
      return;
    }

    try {
      // Parse emails from textarea (support both newlines and commas)
      const emailList = bulkEmails
        .split(/[\n,]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0);

      if (emailList.length === 0) {
        toast.error('No valid email addresses found');
        return;
      }

      toast.info(`Processing ${emailList.length} email(s)...`);

      const result = await bulkActivateMutation.mutateAsync({
        params: {
          emails: emailList,
          membership_type: bulkType,
          duration_months: bulkDuration,
          notes: bulkNotes || undefined,
        },
        adminId: currentUser.id,
      });

      if (result.error) throw result.error;

      // Show results
      setBulkResults(result.data);
      setShowBulkResults(true);

      if (result.data) {
        if (result.data.failed === 0) {
          toast.success(`Successfully activated ${result.data.successful} membership(s)!`);
        } else {
          toast.warning(
            `Completed: ${result.data.successful} successful, ${result.data.failed} failed`
          );
        }

        // Reset form if all succeeded
        if (result.data.failed === 0) {
          setBulkEmails('');
          setBulkNotes('');
          setIsBulkOpen(false);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Bulk activation failed');
      console.error('Bulk activation error:', error);
    }
  };

  const getStatusBadge = (status: MembershipStatus) => {
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
            {t('membership.expired')}
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            {t('membership.cancelled')}
          </Badge>
        );
      case 'suspended':
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('membership.suspended')}
          </Badge>
        );
    }
  };

  const getMembershipIcon = (type: MembershipType) => {
    return type === 'professional' ? (
      <Crown className="h-4 w-4 text-yellow-500" />
    ) : (
      <Star className="h-4 w-4 text-blue-500" />
    );
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

  // US1: No longer need usersWithoutMembership - using email input instead

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 via-royal-600 to-navy-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">{t('membership.title')}</h1>
              <p className="mt-2 opacity-90">{t('membership.subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('membership.createMembership')}
            </Button>
            <Button
              className="bg-royal-600 hover:bg-royal-700 text-white"
              onClick={() => setIsBulkOpen(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              {t('membership.bulkActivate')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('membership.totalMembers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_members}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('common.active')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.active_members}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('membership.basic')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-blue-500" />
                <span className="text-3xl font-bold">{stats.basic_members}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('membership.professional')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span className="text-3xl font-bold">{stats.professional_members}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('membership.expiringSoon')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.expiring_soon}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('membership.expired')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-500">{stats.expired_members}</div>
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
                  placeholder={t('membership.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <Select
                value={filters.membership_type || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, membership_type: value === 'all' ? undefined : (value as MembershipType) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('membership.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('membership.allTypes')}</SelectItem>
                  <SelectItem value="basic">{t('membership.basic')}</SelectItem>
                  <SelectItem value="professional">{t('membership.professional')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value === 'all' ? undefined : (value as MembershipStatus) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('common.active')}</SelectItem>
                  <SelectItem value="expired">{t('membership.expired')}</SelectItem>
                  <SelectItem value="cancelled">{t('membership.cancelled')}</SelectItem>
                  <SelectItem value="suspended">{t('membership.suspended')}</SelectItem>
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
            <TabsList>
              <TabsTrigger value="all">{t('membership.tabAll')}</TabsTrigger>
              <TabsTrigger value="active">{t('common.active')}</TabsTrigger>
              <TabsTrigger value="expiring">{t('membership.expiringSoon')}</TabsTrigger>
              <TabsTrigger value="expired">{t('membership.expired')}</TabsTrigger>
              <TabsTrigger value="basic">{t('membership.basic')}</TabsTrigger>
              <TabsTrigger value="professional">{t('membership.professional')}</TabsTrigger>
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
                  <TableHead>{t('membership.member')}</TableHead>
                  <TableHead>{t('membership.membershipId')}</TableHead>
                  <TableHead>{t('membership.type')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead>{t('membership.startDate')}</TableHead>
                  <TableHead>{t('membership.expiryDate')}</TableHead>
                  <TableHead>{t('membership.daysLeft')}</TableHead>
                  <TableHead>{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.length > 0 ? (
                  memberships.map((membership) => {
                    const daysLeft = getDaysRemaining(membership.expiry_date);
                    const isExpiringSoon = daysLeft > 0 && daysLeft <= 30;

                    return (
                      <TableRow key={membership.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {membership.user?.first_name && membership.user?.last_name
                                ? `${membership.user.first_name} ${membership.user.last_name}`
                                : t('membership.unknownUser')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {membership.user?.email || '—'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {membership.membership_id}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMembershipIcon(membership.membership_type)}
                            <span className="capitalize">{membership.membership_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(membership.status)}</TableCell>
                        <TableCell>{formatDate(membership.start_date)}</TableCell>
                        <TableCell>{formatDate(membership.expiry_date)}</TableCell>
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
                            {daysLeft <= 0 ? t('membership.expired') : `${daysLeft} ${t('membership.days')}`}
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
                              <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              {/* Extend */}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedMembership(membership);
                                  setIsExtendOpen(true);
                                }}
                              >
                                <CalendarPlus className="h-4 w-4 mr-2" />
                                {t('membership.extendMembership')}
                              </DropdownMenuItem>

                              {/* Deactivate / Reactivate */}
                              {membership.status === 'active' ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedMembership(membership);
                                    setIsDeactivateOpen(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  {t('membership.deactivate')}
                                </DropdownMenuItem>
                              ) : membership.status === 'cancelled' || membership.status === 'suspended' ? (
                                <DropdownMenuItem
                                  onClick={() => handleReactivate(membership)}
                                  className="text-green-600"
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  {t('membership.reactivate')}
                                </DropdownMenuItem>
                              ) : null}

                              {/* Re-issue Certificate (Professional only) */}
                              {membership.membership_type === 'professional' && (
                                <DropdownMenuItem
                                  onClick={() => handleReissueCertificate(membership)}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  {t('membership.reissueCertificate')}
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
                      {t('membership.noMemberships')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Membership Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('membership.createMembership')}</DialogTitle>
            <DialogDescription>
              {t('membership.createDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('membership.userEmail')}</Label>
              <Input
                type="email"
                value={createForm.user_email}
                onChange={(e) => setCreateForm({ ...createForm, user_email: e.target.value })}
                placeholder="user@example.com"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('membership.emailValidationNote')}
              </p>
            </div>

            <div>
              <Label>{t('membership.membershipType')}</Label>
              <Select
                value={createForm.membership_type}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, membership_type: value as MembershipType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-blue-500" />
                      {t('membership.basicMember')}
                    </div>
                  </SelectItem>
                  <SelectItem value="professional">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-yellow-500" />
                      {t('membership.professionalMember')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('membership.duration')}</Label>
              <Select
                value={createForm.duration_months.toString()}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, duration_months: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('membership.oneMonth')}</SelectItem>
                  <SelectItem value="3">{t('membership.threeMonths')}</SelectItem>
                  <SelectItem value="6">{t('membership.sixMonths')}</SelectItem>
                  <SelectItem value="12">{t('membership.twelveMonths')}</SelectItem>
                  <SelectItem value="24">{t('membership.twentyFourMonths')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('membership.startDate')} ({t('common.optional')})</Label>
              <Input
                type="date"
                value={createForm.start_date}
                onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('membership.startDateHint') || 'Leave empty for today. Use this to backdate memberships.'}
              </p>
            </div>

            <div>
              <Label>{t('membership.notes')}</Label>
              <Textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder={t('membership.notesPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('membership.createMembership')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Membership Dialog */}
      <Dialog open={isExtendOpen} onOpenChange={setIsExtendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('membership.extendMembership')}</DialogTitle>
            <DialogDescription>
              {t('membership.extendFor')} {selectedMembership?.user?.first_name} {selectedMembership?.user?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">{t('membership.currentExpiry')}:</span>
                  <p className="font-semibold">
                    {selectedMembership ? formatDate(selectedMembership.expiry_date) : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">{t('membership.daysRemaining')}:</span>
                  <p className="font-semibold">
                    {selectedMembership ? getDaysRemaining(selectedMembership.expiry_date) : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>{t('membership.extensionPeriod')}</Label>
              <Select
                value={extendMonths.toString()}
                onValueChange={(value) => setExtendMonths(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('membership.oneMonth')}</SelectItem>
                  <SelectItem value="3">{t('membership.threeMonths')}</SelectItem>
                  <SelectItem value="6">{t('membership.sixMonths')}</SelectItem>
                  <SelectItem value="12">{t('membership.twelveMonths')}</SelectItem>
                  <SelectItem value="24">{t('membership.twentyFourMonths')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('membership.notes')}</Label>
              <Textarea
                value={extendNotes}
                onChange={(e) => setExtendNotes(e.target.value)}
                placeholder={t('membership.extensionReason')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleExtend} disabled={extendMutation.isPending}>
              {extendMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('membership.extendBy')} {extendMonths} {t('membership.months')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Membership Dialog */}
      <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('membership.deactivateMembership')}</DialogTitle>
            <DialogDescription>
              {t('membership.deactivateWarning')} {selectedMembership?.user?.first_name}{' '}
              {selectedMembership?.user?.last_name}. {t('membership.loseAccess')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('membership.deactivateReason')}</Label>
              <Textarea
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                placeholder={t('membership.deactivateReasonPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeactivateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('membership.deactivateMembership')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* US2: Bulk Membership Activation Dialog */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('membership.bulkActivation')}</DialogTitle>
            <DialogDescription>
              {t('membership.bulkDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('membership.emailAddresses')}</Label>
              <Textarea
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder={t('membership.emailsPlaceholder')}
                rows={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('membership.emailsNote')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('membership.membershipType')}</Label>
                <Select value={bulkType} onValueChange={(v) => setBulkType(v as MembershipType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">{t('membership.basicMember')}</SelectItem>
                    <SelectItem value="professional">{t('membership.professionalMember')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('membership.duration')}</Label>
                <Select value={bulkDuration.toString()} onValueChange={(v) => setBulkDuration(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">{t('membership.twelveMonthsShort')}</SelectItem>
                    <SelectItem value="24">{t('membership.twentyFourMonthsShort')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t('membership.notes')}</Label>
              <Textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder={t('membership.bulkNotesPlaceholder')}
                rows={2}
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{t('common.note')}:</strong> {t('membership.validationNote')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={handleBulkActivate}
              disabled={bulkActivateMutation.isPending || !bulkEmails.trim()}
            >
              {bulkActivateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('membership.activating')}
                </>
              ) : (
                <>{t('membership.validateActivate')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Activation Results Dialog */}
      <Dialog open={showBulkResults} onOpenChange={setShowBulkResults}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('membership.bulkResults')}</DialogTitle>
            <DialogDescription>
              {t('membership.activationSummary')}
            </DialogDescription>
          </DialogHeader>
          {bulkResults && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{bulkResults.total}</p>
                      <p className="text-sm text-gray-600">{t('membership.total')}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{bulkResults.successful}</p>
                      <p className="text-sm text-gray-600">{t('membership.successful')}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{bulkResults.failed}</p>
                      <p className="text-sm text-gray-600">{t('membership.failed')}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Results */}
              <div>
                <h3 className="font-semibold mb-2">{t('membership.detailedResults')}:</h3>
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.email')}</TableHead>
                        <TableHead>{t('table.status')}</TableHead>
                        <TableHead>{t('membership.details')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkResults.results.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{result.email}</TableCell>
                          <TableCell>
                            {result.success ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {t('membership.success')}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                {t('membership.failed')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {result.success ? (
                              <span className="text-gray-600">
                                {t('membership.membershipId')}: {result.membership_id?.substring(0, 8)}...
                              </span>
                            ) : (
                              <span className="text-red-600">{result.error}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => {
              setShowBulkResults(false);
              setBulkResults(null);
            }}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

MembershipManagement.displayName = 'MembershipManagement';
