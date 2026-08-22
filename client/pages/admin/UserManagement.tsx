import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Users,
  Loader2,
  Edit,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  Building2,
  GraduationCap,
  Upload,
  Eye,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useUsers,
  useUserStats,
  useUpdateUser,
  useToggleUserStatus,
  usePermanentDeleteUser,
  useCountryCodes,
} from '@/entities/users';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { useConfirm } from '@/contexts/ConfirmDialogContext';
import { impersonationService } from '@/services/impersonation.service';
import type {
  User,
  UserFilters,
  UpdateUserDTO,
  UserRole,
} from '@/entities/users';
import { useLanguage } from '@/contexts/LanguageContext';

const ROLE_ICONS: Record<string, any> = {
  individual: UserCheck,
  ecp: Building2,
  pdp: GraduationCap,
  pdp_partner: GraduationCap, // Legacy role name
  admin: Shield,
  super_admin: ShieldCheck,
};

const ROLE_COLORS: Record<string, string> = {
  individual: 'blue',
  ecp: 'purple',
  pdp: 'green',
  pdp_partner: 'green', // Legacy role name
  admin: 'orange',
  super_admin: 'red',
};

export default function UserManagement() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuthContext();
  const { confirm } = useConfirm();
  const navigate = useNavigate();

  // Get role label translation
  const getRoleLabel = (role: string): string => {
    const roleMap: Record<string, string> = {
      individual: t('roles.individual'),
      ecp: t('roles.ecpPartner'),
      pdp: t('roles.pdpPartner'),
      pdp_partner: t('roles.pdpPartner'), // Legacy role name
      trainer: 'BDA Certified Instructor',
      admin: t('roles.admin'),
      super_admin: t('roles.superAdmin'),
    };
    return roleMap[role] || role;
  };
  const [filters, setFilters] = useState<UserFilters>({});
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const { data: users, isLoading } = useUsers({ ...filters, search });
  const { data: stats } = useUserStats();
  const { data: countryCodes } = useCountryCodes();

  const updateMutation = useUpdateUser();
  const toggleStatusMutation = useToggleUserStatus();
  const permanentDeleteMutation = usePermanentDeleteUser();

  const handleImpersonate = async (targetUser: User) => {
    const confirmed = await confirm({
      title: t('impersonation.confirmTitle'),
      description: `${t('impersonation.confirmDescription')} ${targetUser.first_name || ''} ${targetUser.last_name || ''} (${targetUser.email})`,
      confirmText: t('impersonation.start'),
      variant: 'warning',
    });
    if (!confirmed || !currentUser) return;
    try {
      await impersonationService.startImpersonation(
        { id: targetUser.id, email: targetUser.email, first_name: targetUser.first_name, last_name: targetUser.last_name },
        { id: currentUser.id, email: currentUser.email || '', first_name: currentUser.profile?.first_name, last_name: currentUser.profile?.last_name }
      );
      // Auth state change will route to the target user's dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Impersonation failed:', err);
    }
  };

  const [editForm, setEditForm] = useState<UpdateUserDTO>({});

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditForm({
      role: user.role,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      country_code: user.country_code || '',
      job_title: user.job_title || '',
      company_name: user.company_name || '',
      industry: user.industry || '',
      experience_years: user.experience_years || 0,
      preferred_language: user.preferred_language,
      timezone: user.timezone,
      notifications_enabled: user.notifications_enabled,
      is_active: user.is_active,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    // Validate country code (must be empty or exactly 2 letters)
    if (editForm.country_code && editForm.country_code.length !== 2) {
      alert('Country code must be exactly 2 letters (e.g., US, GB, EG)');
      return;
    }

    // Clean the form data: convert empty strings to null for optional fields
    const cleanedDto: UpdateUserDTO = {
      ...editForm,
      country_code: editForm.country_code?.trim() || null,
      phone: editForm.phone?.trim() || null,
      job_title: editForm.job_title?.trim() || null,
      company_name: editForm.company_name?.trim() || null,
      industry: editForm.industry?.trim() || null,
    };

    await updateMutation.mutateAsync({ id: editingUser.id, dto: cleanedDto });
    setIsEditOpen(false);
    setEditingUser(null);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    await toggleStatusMutation.mutateAsync({ id: userId, is_active: !currentStatus });
  };

  const canPermanentlyDelete = (user: User) => {
    const currentRole = currentUser?.profile?.role || '';
    if (!['admin', 'super_admin'].includes(currentRole) || user.id === currentUser?.id) return false;
    return currentRole === 'super_admin' || !['admin', 'super_admin'].includes(user.role);
  };

  const openPermanentDeleteDialog = (user: User) => {
    setDeletingUser(user);
    setDeleteConfirmation('');
  };

  const handlePermanentDelete = async () => {
    if (!deletingUser || deleteConfirmation !== 'DELETE') return;
    await permanentDeleteMutation.mutateAsync({ id: deletingUser.id });
    setDeletingUser(null);
    setDeleteConfirmation('');
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">{t('userMgmt.title')}</h1>
              <p className="mt-2 opacity-90">{t('userMgmt.subtitle')}</p>
            </div>
          </div>
          <Link to="/admin/users/bulk-upload">
            <Button variant="secondary" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {t('userMgmt.bulkUpload')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.totalUsers')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_users}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.active')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.active_users}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.profileComplete')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.profile_completion_rate.toFixed(0)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.newThisMonth')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.new_users_this_month}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t('stats.admins')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{(stats.by_role?.admin || 0) + (stats.by_role?.super_admin || 0)}</div>
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
                  placeholder={t('filters.searchUsers')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-full md:w-48">
              <Select
                value={filters.role || 'all'}
                onValueChange={(value) =>
                  setFilters({ ...filters, role: value === 'all' ? undefined : (value as UserRole) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.allRoles')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allRoles')}</SelectItem>
                  <SelectItem value="individual">{getRoleLabel('individual')}</SelectItem>
                  <SelectItem value="ecp">{getRoleLabel('ecp')}</SelectItem>
                  <SelectItem value="pdp">{getRoleLabel('pdp')}</SelectItem>
                  <SelectItem value="trainer">BDA Certified Instructor</SelectItem>
                  <SelectItem value="admin">{getRoleLabel('admin')}</SelectItem>
                  <SelectItem value="super_admin">{getRoleLabel('super_admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Select
                value={
                  filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'
                }
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    is_active: value === 'all' ? undefined : value === 'active',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('common.active')}</SelectItem>
                  <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Select
                value={
                  filters.profile_completed === undefined
                    ? 'all'
                    : filters.profile_completed
                    ? 'complete'
                    : 'incomplete'
                }
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    profile_completed: value === 'all' ? undefined : value === 'complete',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.allProfiles')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allProfiles')}</SelectItem>
                  <SelectItem value="complete">{t('common.complete')}</SelectItem>
                  <SelectItem value="incomplete">{t('common.incomplete')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('userMgmt.allUsers')}</CardTitle>
          <CardDescription>{t('userMgmt.manageDescription')}</CardDescription>
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
                  <TableHead>{t('table.user')}</TableHead>
                  <TableHead>{t('table.role')}</TableHead>
                  <TableHead>{t('common.company')}</TableHead>
                  <TableHead>{t('common.country')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead>{t('common.profile')}</TableHead>
                  <TableHead>{t('table.joined')}</TableHead>
                  <TableHead>{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((user) => {
                    const RoleIcon = ROLE_ICONS[user.role] || UserCheck;
                    const roleColor = ROLE_COLORS[user.role] || 'gray';

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : t('common.noName')}
                            </div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`bg-${roleColor}-50 text-${roleColor}-700 border-${roleColor}-200`}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.company_name || '—'}</TableCell>
                        <TableCell>{user.country_code || '—'}</TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                              {t('common.active')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-700">
                              {t('common.inactive')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.profile_completed ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {t('common.complete')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              {t('common.incomplete')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)} title={t('common.edit')}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(user.id, user.is_active)}
                              disabled={toggleStatusMutation.isPending}
                              title={user.is_active ? t('userMgmt.deactivate') : t('userMgmt.activate')}
                            >
                              {user.is_active ? (
                                <UserX className="h-4 w-4 text-red-600" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            {['admin', 'super_admin'].includes(currentUser?.profile?.role || '') && !['admin', 'super_admin'].includes(user.role) && user.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleImpersonate(user)}
                                title={t('userMgmt.impersonate')}
                              >
                                <Eye className="h-4 w-4 text-amber-600" />
                              </Button>
                            )}
                            {canPermanentlyDelete(user) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openPermanentDeleteDialog(user)}
                                title="Permanently delete account"
                                className="hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {t('table.noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('form.editUser')}</DialogTitle>
            <DialogDescription>{t('form.editUserDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('common.firstName')}</Label>
                <Input
                  value={editForm.first_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('common.lastName')}</Label>
                <Input
                  value={editForm.last_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('common.phone')}</Label>
                <Input
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('common.countryCode')}</Label>
                <Input
                  value={editForm.country_code || ''}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                    setEditForm({ ...editForm, country_code: value });
                  }}
                  placeholder="US, GB, EG"
                  maxLength={2}
                  className={
                    editForm.country_code && editForm.country_code.length !== 2
                      ? 'border-red-500'
                      : ''
                  }
                />
                {editForm.country_code && editForm.country_code.length !== 2 && (
                  <p className="text-xs text-red-500 mt-1">{t('form.countryCodeError')}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('common.jobTitle')}</Label>
                <Input
                  value={editForm.job_title || ''}
                  onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('common.company')}</Label>
                <Input
                  value={editForm.company_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('common.industry')}</Label>
                <Input
                  value={editForm.industry || ''}
                  onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('common.experienceYears')}</Label>
                <Input
                  type="number"
                  value={editForm.experience_years || 0}
                  onChange={(e) => setEditForm({ ...editForm, experience_years: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={70}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>{t('common.role')}</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) => setEditForm({ ...editForm, role: value as UserRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                                      <SelectItem value="individual">{getRoleLabel('individual')}</SelectItem>
                  <SelectItem value="ecp">{getRoleLabel('ecp')}</SelectItem>
                  <SelectItem value="pdp">{getRoleLabel('pdp')}</SelectItem>
                  <SelectItem value="trainer">BDA Certified Instructor</SelectItem>
                  <SelectItem value="admin">{getRoleLabel('admin')}</SelectItem>
                  <SelectItem value="super_admin">{getRoleLabel('super_admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

              <div>
                <Label>{t('common.language')}</Label>
                <Select
                  value={editForm.preferred_language}
                  onValueChange={(value) => setEditForm({ ...editForm, preferred_language: value as 'en' | 'ar' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t('common.english')}</SelectItem>
                    <SelectItem value="ar">{t('common.arabic')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('common.status')}</Label>
                <Select
                  value={editForm.is_active ? 'active' : 'inactive'}
                  onValueChange={(value) => setEditForm({ ...editForm, is_active: value === 'active' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('common.active')}</SelectItem>
                    <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('form.updateUser')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingUser)} onOpenChange={(open) => {
        if (!open && !permanentDeleteMutation.isPending) {
          setDeletingUser(null);
          setDeleteConfirmation('');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <DialogTitle>Permanently delete account?</DialogTitle>
            <DialogDescription className="leading-6">
              This action cannot be undone. The portal account for <strong>{deletingUser?.email}</strong>, its access and associated portal data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-confirmation">Type <strong>DELETE</strong> to confirm</Label>
            <Input
              id="delete-confirmation"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              disabled={permanentDeleteMutation.isPending}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)} disabled={permanentDeleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={deleteConfirmation !== 'DELETE' || permanentDeleteMutation.isPending}
              className="gap-2"
            >
              {permanentDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Permanently delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

UserManagement.displayName = 'UserManagement';
