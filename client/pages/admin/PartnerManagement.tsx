/**
 * Admin Partner Management
 *
 * Enhanced management for ECP and PDP partners with type-specific features
 * Partner details and editing now use dedicated pages instead of modals
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Building2,
  GraduationCap,
  Edit,
  Search,
  UserCheck,
  UserX,
  Eye,
  MoreHorizontal,
  Layers,
  Loader2,
} from 'lucide-react';
import {
  usePartners,
  usePartnerStats,
  useTogglePartnerStatus,
} from '@/entities/partners';
import type {
  Partner,
  PartnerFilters,
  PartnerType,
} from '@/entities/partners';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const PARTNER_TYPE_COLORS: Record<PartnerType, string> = {
  ecp: 'purple',
  pdp: 'green',
  dual_partner: 'indigo',
};

const PARTNER_TYPE_ICONS: Record<PartnerType, any> = {
  ecp: Building2,
  pdp: GraduationCap,
  dual_partner: Building2,
};

const PDP_TIER_PROGRAMS: Record<string, number> = {
  standard: 5,
  advanced: 8,
  premium: 12,
};

export default function PartnerManagement() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PartnerFilters>({});
  const [search, setSearch] = useState('');

  // Upgrade dialog state
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [upgradeEcpTier] = useState<string>('standard');
  const [upgradePdpTier, setUpgradePdpTier] = useState<'standard' | 'advanced' | 'premium'>('standard');

  const { data: partners, isLoading } = usePartners({ ...filters, search });
  const { data: stats } = usePartnerStats();

  const toggleStatusMutation = useTogglePartnerStatus();

  const handleToggleStatus = async (partnerId: string, currentStatus: boolean) => {
    await toggleStatusMutation.mutateAsync({ id: partnerId, is_active: !currentStatus });
  };

  // Upgrade mutation — adds the missing partnership type
  const upgradeMutation = useMutation({
    mutationFn: async ({ partner, addType }: { partner: Partner; addType: 'ecp' | 'pdp' }) => {
      const partnerId = partner.id;

      if (addType === 'pdp') {
        // ECP partner → add PDP → dual_partner
        const maxPrograms = PDP_TIER_PROGRAMS[upgradePdpTier] || 5;
        const countryCode = partner.country?.toUpperCase() || 'XX';
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        // Upsert PDP profile
        await supabase.from('pdp_partner_profiles').upsert({
          partner_id: partnerId,
          organization_name: partner.company_name,
          legal_name: partner.company_name,
          primary_contact_name: partner.contact_person || '',
          primary_contact_email: partner.contact_email,
          primary_contact_phone: partner.contact_phone || '',
        }, { onConflict: 'partner_id' });

        // Create PDP license
        const { error: licErr } = await supabase.from('pdp_licenses').insert({
          partner_id: partnerId,
          license_number: `PDP-LIC-${Date.now()}`,
          partner_code: `PDP-${countryCode}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          status: 'active',
          issue_date: new Date().toISOString(),
          expiry_date: expiryDate.toISOString(),
          max_programs: maxPrograms,
          programs_used: 0,
          program_submission_enabled: true,
        });
        if (licErr) throw licErr;

        // Update role & partner_type
        const { error: uErr } = await supabase.from('users').update({ role: 'dual_partner' }).eq('id', partnerId);
        if (uErr) throw uErr;
        const { error: pErr } = await supabase.from('partners').update({ partner_type: 'dual_partner' }).eq('id', partnerId);
        if (pErr) throw pErr;

      } else {
        // PDP partner → add ECP → dual_partner
        const countryCode = partner.country?.toUpperCase() || 'XX';
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        // Create ECP license
        const { error: licErr } = await supabase.from('ecp_licenses').insert({
          partner_id: partnerId,
          license_number: `ECP-LIC-${Date.now()}`,
          partner_code: `ECP-${countryCode}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          status: 'active',
          issue_date: new Date().toISOString(),
          expiry_date: expiryDate.toISOString(),
          territories: [countryCode],
          programs: ['CP'],
        });
        if (licErr) throw licErr;

        // Update role & partner_type
        const { error: uErr } = await supabase.from('users').update({ role: 'dual_partner' }).eq('id', partnerId);
        if (uErr) throw uErr;
        const { error: pErr } = await supabase.from('partners').update({ partner_type: 'dual_partner' }).eq('id', partnerId);
        if (pErr) throw pErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'ecp-partners'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pdp-partners'] });
      toast({
        title: 'Partnership Upgraded',
        description: 'Partner now has both ECP and PDP partnerships. They will see a Workspace Switcher on next login.',
      });
      setUpgradeDialogOpen(false);
      setSelectedPartner(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Upgrade Failed', description: error.message, variant: 'destructive' });
    },
  });

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
          <Building2 className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">{t('partners.title')}</h1>
            <p className="mt-2 opacity-90">
              {t('partners.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('partners.ecpPartners')}</p>
                <p className="text-3xl font-bold text-purple-600">{stats?.ecp_partners || 0}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('partners.pdpPartners')}</p>
                <p className="text-3xl font-bold text-green-600">{stats?.pdp_partners || 0}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-indigo-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Dual Partners</p>
                <p className="text-3xl font-bold text-indigo-600">{stats?.dual_partners || 0}</p>
              </div>
              <Building2 className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('partners.activePartners')}</p>
                <p className="text-3xl font-bold text-green-600">{stats?.active_partners || 0}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('partners.inactivePartners')}</p>
                <p className="text-3xl font-bold text-gray-600">{(stats?.total_partners || 0) - (stats?.active_partners || 0)}</p>
              </div>
              <UserX className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('partners.allPartners')}</CardTitle>
              <CardDescription>{t('partners.manageDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('partners.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.partner_type || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, partner_type: value === 'all' ? undefined : (value as PartnerType) })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('membership.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('membership.allTypes')}</SelectItem>
                <SelectItem value="ecp">{t('partners.ecpPartners')}</SelectItem>
                <SelectItem value="pdp">{t('partners.pdpPartners')}</SelectItem>
                <SelectItem value="dual_partner">Dual Partners (ECP + PDP)</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  isActive: value === 'all' ? undefined : value === 'active',
                })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('filters.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
                <SelectItem value="active">{t('common.active')}</SelectItem>
                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('partners.partner')}</TableHead>
                  <TableHead>{t('membership.type')}</TableHead>
                  <TableHead>{t('partners.contactPerson')}</TableHead>
                  <TableHead>{t('common.email')}</TableHead>
                  <TableHead>{t('common.country')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead>{t('table.joined')}</TableHead>
                  <TableHead>{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners && partners.length > 0 ? (
                  partners.map((partner) => {
                    const Icon = PARTNER_TYPE_ICONS[partner.partner_type];
                    return (
                      <TableRow key={partner.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 text-${PARTNER_TYPE_COLORS[partner.partner_type]}-600`} />
                            <span className="font-medium">{partner.company_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                            <Badge
                            className={
                              partner.partner_type === 'ecp'
                                ? 'bg-purple-100 text-purple-700'
                                : partner.partner_type === 'pdp'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-indigo-100 text-indigo-700'
                            }
                          >
                            {partner.partner_type === 'dual_partner' ? 'ECP + PDP' : partner.partner_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{partner.contact_person || '—'}</TableCell>
                        <TableCell>{partner.contact_email}</TableCell>
                        <TableCell>{partner.country || '—'}</TableCell>
                        <TableCell>
                          <Badge className={partner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {partner.is_active ? t('common.active') : t('common.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(partner.created_at)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/partners/${partner.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('partners.viewDetails')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/admin/partners/${partner.id}/edit`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t('partners.editPartner')}
                              </DropdownMenuItem>
                              {/* Upgrade to Dual Partner */}
                              {partner.partner_type === 'ecp' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedPartner(partner);
                                      setUpgradePdpTier('standard');
                                      setUpgradeDialogOpen(true);
                                    }}
                                    className="text-[#0d2b5e] font-medium"
                                  >
                                    <Layers className="h-4 w-4 mr-2 text-[#0d2b5e]" />
                                    Add PDP Partnership
                                  </DropdownMenuItem>
                                </>
                              )}
                              {partner.partner_type === 'pdp' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedPartner(partner);
                                      setUpgradeDialogOpen(true);
                                    }}
                                    className="text-[#0d2b5e] font-medium"
                                  >
                                    <Layers className="h-4 w-4 mr-2 text-[#0d2b5e]" />
                                    Add ECP Partnership
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(partner.id, partner.is_active)}
                                disabled={toggleStatusMutation.isPending}
                              >
                                {partner.is_active ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-2" />
                                    {t('userMgmt.deactivate')}
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    {t('partners.activate')}
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      {t('partners.noPartners')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upgrade to Dual Partner Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#0d2b5e]" />
              {selectedPartner?.partner_type === 'ecp' ? 'Add PDP Partnership' : 'Add ECP Partnership'}
            </DialogTitle>
            <DialogDescription>
              {selectedPartner?.partner_type === 'ecp'
                ? `Add a PDP partnership to ${selectedPartner?.company_name}. They will become a Dual Partner with access to both ECP and PDP workspaces.`
                : `Add an ECP partnership to ${selectedPartner?.company_name}. They will become a Dual Partner with access to both ECP and PDP workspaces.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
              <strong>Partner:</strong> {selectedPartner?.company_name}<br />
              <strong>Current type:</strong> {selectedPartner?.partner_type?.toUpperCase()}<br />
              <strong>After upgrade:</strong> Dual Partner (ECP + PDP)
            </div>

            {selectedPartner?.partner_type === 'ecp' && (
              <div className="space-y-2">
                <Label>PDP Tier for New License</Label>
                <Select value={upgradePdpTier} onValueChange={(v) => setUpgradePdpTier(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (up to 5 programs)</SelectItem>
                    <SelectItem value="advanced">Advanced (up to 8 programs)</SelectItem>
                    <SelectItem value="premium">Premium (up to 12 programs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0d2b5e] hover:bg-[#1a3f7a] text-white"
              onClick={() => {
                if (!selectedPartner) return;
                const addType = selectedPartner.partner_type === 'ecp' ? 'pdp' : 'ecp';
                upgradeMutation.mutate({ partner: selectedPartner, addType });
              }}
              disabled={upgradeMutation.isPending}
            >
              {upgradeMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Upgrading...</>
              ) : (
                <><Layers className="h-4 w-4 mr-2" /> Confirm Upgrade</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

PartnerManagement.displayName = 'PartnerManagement';
