/**
 * Admin PDP Management
 *
 * Dedicated management for PDP partners including:
 * - Partner license management (create, update, renew)
 * - Program slot allocation
 * - License request handling
 * - Performance monitoring
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  Search,
  MoreHorizontal,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Layers,
  FileText,
  RefreshCw,
  Shield,
  Calendar,
  TrendingUp,
  Award,
  Loader2,
  Ban,
  Play,
  Upload,
  BookOpen,
  Power,
  PowerOff,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// Types
interface PDPPartner {
  id: string;
  email: string;
  company_name: string;
  contact_name: string;
  country: string;
  created_at: string;
  partner_type?: string;
  license?: PDPLicense;
}

interface PDPLicense {
  id: string;
  partner_id: string;
  license_number: string;
  partner_code: string;
  status: 'active' | 'suspended' | 'expired' | 'pending' | 'expiring_soon';
  issue_date: string;
  expiry_date: string;
  max_programs: number;
  programs_used: number;
  program_submission_enabled: boolean;
  renewal_requested: boolean;
  admin_notes?: string;
  created_at: string;
}

interface LicenseRequest {
  id: string;
  license_id: string;
  partner_id: string;
  request_type: 'renewal' | 'slot_increase' | 'scope_update' | 'suspension_appeal';
  requested_slots?: number;
  current_slots?: number;
  justification?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  created_at: string;
  partner?: { company_name: string; email: string };
}

interface PDPProgram {
  id: string;
  program_id: string;
  program_name: string;
  provider_id: string;
  provider_name: string;
  activity_type: string;
  max_pdc_credits: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'expired';
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  created_at: string;
}

// Fetch all PDP programs for admin
async function fetchAllPrograms(): Promise<PDPProgram[]> {
  const { data, error } = await supabase
    .from('pdp_programs')
    .select('id, program_id, program_name, provider_id, provider_name, activity_type, max_pdc_credits, status, is_active, valid_from, valid_until, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as PDPProgram[];
}

// Fetch PDP partners with licenses
async function fetchPDPPartners() {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .in('partner_type', ['pdp', 'dual_partner'])
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Fetch licenses for these partners
  const partnerIds = data?.map(p => p.id) || [];
  const { data: licenses } = await supabase
    .from('pdp_licenses')
    .select('*')
    .in('partner_id', partnerIds);

  const licenseMap = new Map(licenses?.map(l => [l.partner_id, l]) || []);

  return data?.map(p => ({
    id: p.id,
    email: p.contact_email,
    company_name: p.company_name,
    contact_name: p.contact_person || '',
    country: p.country || 'N/A',
    created_at: p.created_at,
    partner_type: p.partner_type,
    license: licenseMap.get(p.id),
  })) || [];
}

// Fetch license requests
async function fetchLicenseRequests() {
  const { data, error } = await supabase
    .from('pdp_license_requests')
    .select(`
      *,
      pdp_licenses!inner(partner_id)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Fetch partner info from partners table
  const partnerIds = [...new Set(data?.map(r => r.pdp_licenses?.partner_id) || [])];
  const { data: partners } = await supabase
    .from('partners')
    .select('id, contact_email, company_name')
    .in('id', partnerIds);

  const partnerMap = new Map(partners?.map(p => [p.id, {
    company_name: p.company_name || p.contact_email,
    email: p.contact_email
  }]) || []);

  return data?.map(r => ({
    ...r,
    partner_id: r.pdp_licenses?.partner_id,
    partner: partnerMap.get(r.pdp_licenses?.partner_id),
  })) || [];
}

export default function PDPManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("partners");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog states
  const [addPartnerDialogOpen, setAddPartnerDialogOpen] = useState(false);
  const [newPartnerForm, setNewPartnerForm] = useState({
    email: '',
    company_name: '',
    contact_person: '',
    contact_phone: '',
    country: '',
    city: '',
    address: '',
    pdp_tier: 'standard' as 'standard' | 'advanced' | 'premium',
  });

  // Upgrade PDP → Dual Partner dialog state
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPartnerForUpgrade, setSelectedPartnerForUpgrade] = useState<PDPPartner | null>(null);
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PDPPartner | null>(null);
  const [editLicenseOpen, setEditLicenseOpen] = useState(false);
  const [requestReviewOpen, setRequestReviewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LicenseRequest | null>(null);

  // Form states
  const [licenseForm, setLicenseForm] = useState({
    max_programs: 5,
    expiry_months: 12,
    admin_notes: '',
  });
  const [editForm, setEditForm] = useState({
    max_programs: 0,
    program_submission_enabled: true,
    status: 'active' as string,
    admin_notes: '',
  });
  const [reviewNotes, setReviewNotes] = useState('');

  // Queries
  const { data: partners, isLoading: partnersLoading } = useQuery({
    queryKey: ['admin', 'pdp-partners'],
    queryFn: fetchPDPPartners,
  });

  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ['admin', 'pdp-programs'],
    queryFn: fetchAllPrograms,
  });

  const { data: licenseRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['admin', 'pdp-license-requests'],
    queryFn: fetchLicenseRequests,
  });

  // Mutations
  const createPartnerMutation = useMutation({
    mutationFn: async (formData: typeof newPartnerForm) => {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Create user via Edge Function (secure - uses service role key on server)
      const nameParts = formData.contact_person.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorisation': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            first_name: firstName,
            last_name: lastName,
            phone: formData.contact_phone,
            country_code: formData.country,
            role: 'pdp',
            source: 'admin_created',
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      const userId = result.user_id;
      if (!userId) throw new Error('Failed to create user');

      // Partner record should be auto-created by trigger, update with company info
      const { error: partnerError } = await supabase
        .from('partners')
        .update({
          company_name: formData.company_name,
          contact_person: formData.contact_person,
          contact_email: formData.email,
          contact_phone: formData.contact_phone,
          country: formData.country,
          city: formData.city,
          address: formData.address,
        })
        .eq('id', userId);

      if (partnerError) throw partnerError;

      // Create PDP partner profile (auto-created by trigger, but ensure it exists)
      const { error: profileExistsError } = await supabase
        .from('pdp_partner_profiles')
        .upsert({
          partner_id: userId,
          organization_name: formData.company_name,
          legal_name: formData.company_name,
          primary_contact_name: formData.contact_person,
          primary_contact_email: formData.email,
          primary_contact_phone: formData.contact_phone,
        }, {
          onConflict: 'partner_id'
        });

      if (profileExistsError) throw profileExistsError;

      // Auto-create PDP license for the new partner (default: 5 programs, 12 months)
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 12);
      const countryCode = formData.country?.toUpperCase() || 'XX';

      const { error: licenseError } = await supabase
        .from('pdp_licenses')
        .insert({
          partner_id: userId,
          license_number: `PDP-LIC-${Date.now()}`,
          partner_code: `PDP-${countryCode}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          status: 'active',
          issue_date: new Date().toISOString(),
          expiry_date: expiryDate.toISOString(),
          max_programs: formData.pdp_tier === 'premium' ? 12 : formData.pdp_tier === 'advanced' ? 8 : 5,
          programs_used: 0,
          program_submission_enabled: true,
        });

      if (licenseError) {
        console.error('Failed to create license:', licenseError);
        // Don't throw - partner is created, license can be added manually
      }

      return { id: userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pdp-partners'] });
      toast({
        title: t('pdp.partnerCreated'),
        description: t('pdp.partnerCreatedDescription')
      });
      setAddPartnerDialogOpen(false);
      setNewPartnerForm({
        email: '',
        company_name: '',
        contact_person: '',
        contact_phone: '',
        country: '',
        city: '',
        address: '',
        pdp_tier: 'standard',
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('pdp.errorCreatingPartner'),
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const createLicenseMutation = useMutation({
    mutationFn: async ({ partnerId, form }: { partnerId: string; form: typeof licenseForm }) => {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + form.expiry_months);

      const { data, error } = await supabase
        .from('pdp_licenses')
        .insert({
          partner_id: partnerId,
          license_number: `PDP-LIC-${Date.now()}`,
          partner_code: `PDP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          status: 'active',
          issue_date: new Date().toISOString(),
          expiry_date: expiryDate.toISOString(),
          max_programs: form.max_programs,
          programs_used: 0,
          program_submission_enabled: true,
          admin_notes: form.admin_notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pdp-partners'] });
      toast({ title: t('pdp.licenseCreated'), description: t('pdp.licenseCreatedDescription') });
      setLicenseDialogOpen(false);
      setSelectedPartner(null);
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const updateLicenseMutation = useMutation({
    mutationFn: async ({ licenseId, form }: { licenseId: string; form: typeof editForm }) => {
      const { error } = await supabase
        .from('pdp_licenses')
        .update({
          max_programs: form.max_programs,
          program_submission_enabled: form.program_submission_enabled,
          status: form.status,
          admin_notes: form.admin_notes,
        })
        .eq('id', licenseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pdp-partners'] });
      toast({ title: t('pdp.licenseUpdated'), description: t('pdp.licenseUpdatedDescription') });
      setEditLicenseOpen(false);
      setSelectedPartner(null);
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const reviewRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, notes }: { requestId: string; status: string; notes: string }) => {
      const request = licenseRequests?.find(r => r.id === requestId);

      // Update request status
      const { error: requestError } = await supabase
        .from('pdp_license_requests')
        .update({
          status,
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // If approved slot increase, update the license
      if (status === 'approved' && request?.request_type === 'slot_increase' && request.requested_slots) {
        const { error: licenseError } = await supabase
          .from('pdp_licenses')
          .update({ max_programs: request.requested_slots })
          .eq('id', request.license_id);

        if (licenseError) throw licenseError;
      }

      // If approved renewal, extend expiry
      if (status === 'approved' && request?.request_type === 'renewal') {
        const newExpiry = new Date();
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);

        const { error: licenseError } = await supabase
          .from('pdp_licenses')
          .update({
            expiry_date: newExpiry.toISOString(),
            status: 'active',
            renewal_requested: false,
          })
          .eq('id', request.license_id);

        if (licenseError) throw licenseError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pdp-partners'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pdp-license-requests'] });
      toast({ title: t('pdp.requestProcessed'), description: t('pdp.requestProcessedDescription') });
      setRequestReviewOpen(false);
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  // Mutation to approve/activate a program
  const updateProgramMutation = useMutation({
    mutationFn: async ({ programId, updates }: { programId: string; updates: { status?: string; is_active?: boolean; valid_until?: string } }) => {
      const { error } = await supabase
        .from('pdp_programs')
        .update(updates)
        .eq('id', programId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pdp-programs'] });
      toast({ title: 'Success', description: 'Program updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  // ── Upgrade PDP → Dual Partner mutation ──────────────────────────────────
  const upgradePartnerMutation = useMutation({
    mutationFn: async ({ partnerId }: { partnerId: string }) => {
      // 1. Get partner info
      const { data: partnerData } = await supabase
        .from('partners')
        .select('company_name, contact_person, contact_email, contact_phone, country')
        .eq('id', partnerId)
        .single();

      if (!partnerData) throw new Error('Partner not found');

      // 2. Get current session for create-user call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // 3. Create ECP license for this partner
      const countryCode = partnerData.country?.toUpperCase() || 'XX';
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-4);
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 12);

      const { error: licErr } = await supabase.from('ecp_licenses').insert({
        partner_id: partnerId,
        license_number: `BDA-ECP-${countryCode}-${year}-${timestamp}`,
        partner_code: `ECP-${countryCode}-${timestamp}`,
        status: 'active',
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: expiryDate.toISOString().split('T')[0],
        territories: [countryCode],
        programs: ['CP'],
        renewal_requested: false,
      });
      if (licErr) throw licErr;

      // 4. Update user role and partner_type
      await supabase.from('users').update({ role: 'dual_partner' }).eq('id', partnerId);
      const { error: ptErr } = await supabase.from('partners').update({ partner_type: 'dual_partner' }).eq('id', partnerId);
      if (ptErr) throw ptErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pdp-partners'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'ecp-partners'] });
      toast({
        title: 'Partnership Upgraded',
        description: 'Partner now has both ECP and PDP partnerships. They will see a Workspace Switcher on next login.',
      });
      setUpgradeDialogOpen(false);
      setSelectedPartnerForUpgrade(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Upgrade Failed', description: error.message, variant: 'destructive' });
    },
  });

  // Function to approve and activate a program
  const handleApproveProgram = async (program: PDPProgram) => {
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    await updateProgramMutation.mutateAsync({
      programId: program.id,
      updates: {
        status: 'approved',
        is_active: true,
        valid_until: validUntil.toISOString().split('T')[0],
      },
    });
  };

  // Toggle program active status
  const handleToggleProgramActive = async (program: PDPProgram) => {
    await updateProgramMutation.mutateAsync({
      programId: program.id,
      updates: {
        is_active: !program.is_active,
      },
    });
  };

  // Helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">{t('common.active')}</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-700">{t('ecp.suspended')}</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-700">{t('membership.expired')}</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700">{t('ecp.pending')}</Badge>;
      case 'expiring_soon':
        return <Badge className="bg-orange-100 text-orange-700">{t('pdp.expiringSoon')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700">{t('ecp.pending')}</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-100 text-blue-700">{t('pdp.underReview')}</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-700">{t('pdp.approved')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700">{t('pdp.rejected')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-700">{t('pdp.cancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const openCreateLicense = (partner: PDPPartner) => {
    setSelectedPartner(partner);
    setLicenseForm({ max_programs: 5, expiry_months: 12, admin_notes: '' });
    setLicenseDialogOpen(true);
  };

  const openEditLicense = (partner: PDPPartner) => {
    if (!partner.license) return;
    setSelectedPartner(partner);
    setEditForm({
      max_programs: partner.license.max_programs,
      program_submission_enabled: partner.license.program_submission_enabled,
      status: partner.license.status,
      admin_notes: partner.license.admin_notes || '',
    });
    setEditLicenseOpen(true);
  };

  const openRequestReview = (request: LicenseRequest) => {
    setSelectedRequest(request);
    setReviewNotes('');
    setRequestReviewOpen(true);
  };

  // Filter logic
  const filteredPartners = partners?.filter(p => {
    const matchesSearch = p.company_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'licensed' && p.license) ||
      (statusFilter === 'unlicensed' && !p.license) ||
      (p.license?.status === statusFilter);
    return matchesSearch && matchesStatus;
  }) || [];

  const pendingRequests = licenseRequests?.filter(r => r.status === 'pending' || r.status === 'under_review') || [];

  // Stats
  const totalPartners = partners?.length || 0;
  const licensedPartners = partners?.filter(p => p.license).length || 0;
  const activePartners = partners?.filter(p => p.license?.status === 'active').length || 0;
  const pendingRequestsCount = pendingRequests.length;

  if (partnersLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
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
          <Building2 className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">{t('pdp.title')}</h1>
            <p className="mt-2 opacity-90">
              {t('pdp.subtitle')}
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
                <p className="text-sm text-gray-500">{t('pdp.totalPartners')}</p>
                <p className="text-3xl font-bold">{totalPartners}</p>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('pdp.licensed')}</p>
                <p className="text-3xl font-bold text-green-600">{licensedPartners}</p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('common.active')}</p>
                <p className="text-3xl font-bold text-blue-600">{activePartners}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className={pendingRequestsCount > 0 ? "border-amber-200" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('pdp.pendingRequests')}</p>
                <p className="text-3xl font-bold text-amber-600">{pendingRequestsCount}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="partners">
                <Building2 className="h-4 w-4 mr-2" />
                {t('pdp.partnersLicensesTab')}
              </TabsTrigger>
              <TabsTrigger value="requests">
                <FileText className="h-4 w-4 mr-2" />
                {t('pdp.licenseRequestsTab')}
                {pendingRequestsCount > 0 && (
                  <Badge className="ml-2 bg-amber-500">{pendingRequestsCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="programs">
                <BookOpen className="h-4 w-4 mr-2" />
                Programs
                <Badge className="ml-2" variant="outline">{programs?.length || 0}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {activeTab === "partners" && (
            <>
              {/* Filters and Actions */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t('pdp.searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('pdp.filterByStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('pdp.allPartners')}</SelectItem>
                    <SelectItem value="licensed">{t('pdp.licensed')}</SelectItem>
                    <SelectItem value="unlicensed">{t('pdp.unlicensed')}</SelectItem>
                    <SelectItem value="active">{t('common.active')}</SelectItem>
                    <SelectItem value="suspended">{t('ecp.suspended')}</SelectItem>
                    <SelectItem value="expired">{t('membership.expired')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/users/bulk-upload')}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t('pdp.bulkUpload')}
                </Button>
                <Button
                  onClick={() => setAddPartnerDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('pdp.addPartner')}
                </Button>
              </div>

              {/* Partners Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('partners.partner')}</TableHead>
                    <TableHead>{t('pdp.license')}</TableHead>
                    <TableHead>{t('pdp.programSlots')}</TableHead>
                    <TableHead>{t('pdp.expiry')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead>{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.length > 0 ? (
                    filteredPartners.map((partner) => (
                      <TableRow key={partner.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{partner.company_name}</p>
                            <p className="text-sm text-gray-500">{partner.email}</p>
                            <p className="text-xs text-gray-400">{partner.country}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {partner.license ? (
                            <div>
                              <p className="font-mono text-sm">{partner.license.license_number}</p>
                              <p className="text-xs text-gray-500">{partner.license.partner_code}</p>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">{t('pdp.noLicense')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {partner.license ? (
                            <div className="w-32">
                              <div className="flex justify-between text-sm mb-1">
                                <span>{partner.license.programs_used}</span>
                                <span>/ {partner.license.max_programs}</span>
                              </div>
                              <Progress
                                value={(partner.license.programs_used / partner.license.max_programs) * 100}
                                className="h-2"
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {partner.license ? (
                            <div>
                              <p className="text-sm">{formatDate(partner.license.expiry_date)}</p>
                              {partner.license.renewal_requested && (
                                <Badge variant="outline" className="text-xs text-amber-600">
                                  {t('pdp.renewalRequested')}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {partner.license ? (
                            <div className="space-y-1">
                              {getStatusBadge(partner.license.status)}
                              {!partner.license.program_submission_enabled && (
                                <Badge variant="outline" className="text-xs text-red-600 block">
                                  {t('pdp.submissionDisabled')}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline">{t('pdp.unlicensed')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/pdp/${partner.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('partners.viewDetails')}
                              </DropdownMenuItem>
                              {partner.license ? (
                                <DropdownMenuItem onClick={() => navigate(`/admin/pdp/${partner.id}/license`)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t('pdp.manageLicense')}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => openCreateLicense(partner)}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  {t('pdp.createLicense')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => navigate(`/admin/partners/${partner.id}/edit`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t('partners.editPartner')}
                              </DropdownMenuItem>
                              {/* Upgrade to Dual Partner — only for pure PDP partners */}
                              {partner.partner_type === 'pdp' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedPartnerForUpgrade(partner);
                                      setUpgradeDialogOpen(true);
                                    }}
                                    className="text-[#0d2b5e] font-medium"
                                  >
                                    <Layers className="h-4 w-4 mr-2 text-[#0d2b5e]" />
                                    Add ECP Partnership
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
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        {t('pdp.noPartnersFound')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}

          {activeTab === "requests" && (
            <>
              {requestsLoading ? (
                <Skeleton className="h-48" />
              ) : licenseRequests && licenseRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('partners.partner')}</TableHead>
                      <TableHead>{t('pdp.requestType')}</TableHead>
                      <TableHead>{t('pdp.details')}</TableHead>
                      <TableHead>{t('ecp.submitted')}</TableHead>
                      <TableHead>{t('table.status')}</TableHead>
                      <TableHead>{t('table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenseRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.partner?.company_name}</p>
                            <p className="text-sm text-gray-500">{request.partner?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {request.request_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.request_type === 'slot_increase' ? (
                            <span>
                              {request.current_slots} → {request.requested_slots} {t('pdp.slots')}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500 truncate max-w-xs block">
                              {request.justification || '-'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(request.created_at)}</TableCell>
                        <TableCell>{getRequestStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {(request.status === 'pending' || request.status === 'under_review') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRequestReview(request)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {t('ecp.review')}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t('pdp.noLicenseRequests')}</p>
                </div>
              )}
            </>
          )}

          {/* Programs Tab */}
          {activeTab === "programs" && (
            <>
              {programsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : programs && programs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>PDCs</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((program) => (
                      <TableRow key={program.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{program.program_name}</p>
                            <p className="text-sm text-gray-500">{program.program_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>{program.provider_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Award className="h-3 w-3 mr-1" />
                            {program.max_pdc_credits}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {program.status === 'approved' ? (
                            <Badge className="bg-green-100 text-green-700">Approved</Badge>
                          ) : program.status === 'submitted' ? (
                            <Badge className="bg-blue-100 text-blue-700">Submitted</Badge>
                          ) : program.status === 'draft' ? (
                            <Badge className="bg-gray-100 text-gray-700">Draft</Badge>
                          ) : program.status === 'rejected' ? (
                            <Badge className="bg-red-100 text-red-700">Rejected</Badge>
                          ) : (
                            <Badge variant="outline">{program.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {program.is_active ? (
                            <Badge className="bg-green-100 text-green-700">
                              <Power className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-700">
                              <PowerOff className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={new Date(program.valid_until) < new Date() ? 'text-red-600' : ''}>
                            {new Date(program.valid_until).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {(program.status !== 'approved' || !program.is_active) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveProgram(program)}
                                disabled={updateProgramMutation.isPending}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve & Activate
                              </Button>
                            )}
                            {program.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleProgramActive(program)}
                                disabled={updateProgramMutation.isPending}
                              >
                                {program.is_active ? (
                                  <PowerOff className="h-4 w-4 text-orange-600" />
                                ) : (
                                  <Power className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No programs found</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create License Dialog */}
      <Dialog open={licenseDialogOpen} onOpenChange={(open) => {
        if (!open) {
          document.body.style.pointerEvents = '';
          document.body.style.overflow = '';
        }
        setLicenseDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pdp.createLicense')}</DialogTitle>
            <DialogDescription>
              {t('pdp.createLicenseFor')} {selectedPartner?.company_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('pdp.maxProgramSlots')}</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={licenseForm.max_programs}
                onChange={(e) => setLicenseForm({ ...licenseForm, max_programs: parseInt(e.target.value) || 5 })}
              />
              <p className="text-xs text-gray-500">{t('pdp.defaultMaxNote')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('pdp.licenseDuration')}</Label>
              <Select
                value={licenseForm.expiry_months.toString()}
                onValueChange={(v) => setLicenseForm({ ...licenseForm, expiry_months: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">{t('pdp.sixMonths')}</SelectItem>
                  <SelectItem value="12">{t('pdp.twelveMonths')}</SelectItem>
                  <SelectItem value="24">{t('pdp.twentyFourMonths')}</SelectItem>
                  <SelectItem value="36">{t('pdp.thirtySixMonths')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('pdp.adminNotesOptional')}</Label>
              <Textarea
                value={licenseForm.admin_notes}
                onChange={(e) => setLicenseForm({ ...licenseForm, admin_notes: e.target.value })}
                placeholder={t('pdp.internalNotes')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLicenseDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => selectedPartner && createLicenseMutation.mutate({
                partnerId: selectedPartner.id,
                form: licenseForm
              })}
              disabled={createLicenseMutation.isPending}
            >
              {createLicenseMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('pdp.createLicenseButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit License Dialog */}
      <Dialog open={editLicenseOpen} onOpenChange={(open) => {
        if (!open) {
          document.body.style.pointerEvents = '';
          document.body.style.overflow = '';
        }
        setEditLicenseOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pdp.editLicense')}</DialogTitle>
            <DialogDescription>
              {t('pdp.updateLicenseFor')} {selectedPartner?.company_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('pdp.maxProgramSlots')}</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={editForm.max_programs}
                onChange={(e) => setEditForm({ ...editForm, max_programs: parseInt(e.target.value) || 5 })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('pdp.licenseStatus')}</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm({ ...editForm, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('common.active')}</SelectItem>
                  <SelectItem value="suspended">{t('ecp.suspended')}</SelectItem>
                  <SelectItem value="expired">{t('membership.expired')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('pdp.programSubmissionEnabled')}</Label>
              <Switch
                checked={editForm.program_submission_enabled}
                onCheckedChange={(v) => setEditForm({ ...editForm, program_submission_enabled: v })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('pdp.adminNotes')}</Label>
              <Textarea
                value={editForm.admin_notes}
                onChange={(e) => setEditForm({ ...editForm, admin_notes: e.target.value })}
                placeholder={t('pdp.internalNotes')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLicenseOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => selectedPartner?.license && updateLicenseMutation.mutate({
                licenseId: selectedPartner.license.id,
                form: editForm
              })}
              disabled={updateLicenseMutation.isPending}
            >
              {updateLicenseMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('pdp.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Request Dialog */}
      <Dialog open={requestReviewOpen} onOpenChange={(open) => {
        if (!open) {
          document.body.style.pointerEvents = '';
          document.body.style.overflow = '';
          setSelectedRequest(null);
        }
        setRequestReviewOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pdp.reviewLicenseRequest')}</DialogTitle>
            <DialogDescription>
              {selectedRequest?.request_type.replace('_', ' ')} request from {selectedRequest?.partner?.company_name}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('pdp.requestTypeLabel')}</span>
                  <Badge variant="outline" className="capitalize">
                    {selectedRequest.request_type.replace('_', ' ')}
                  </Badge>
                </div>
                {selectedRequest.request_type === 'slot_increase' && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('pdp.requestedSlots')}</span>
                    <span className="font-medium">
                      {selectedRequest.current_slots} → {selectedRequest.requested_slots}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('pdp.submittedLabel')}</span>
                  <span>{formatDate(selectedRequest.created_at)}</span>
                </div>
              </div>
              {selectedRequest.justification && (
                <div>
                  <Label className="text-gray-500">{t('pdp.justification')}</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded text-sm">
                    {selectedRequest.justification}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>{t('pdp.adminNotesLabel')}</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={t('pdp.addNotesPlaceholder')}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="text-red-600"
              onClick={() => selectedRequest && reviewRequestMutation.mutate({
                requestId: selectedRequest.id,
                status: 'rejected',
                notes: reviewNotes,
              })}
              disabled={reviewRequestMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t('ecp.reject')}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedRequest && reviewRequestMutation.mutate({
                requestId: selectedRequest.id,
                status: 'approved',
                notes: reviewNotes,
              })}
              disabled={reviewRequestMutation.isPending}
            >
              {reviewRequestMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('ecp.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Partner Dialog */}
      <Dialog open={addPartnerDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setNewPartnerForm({
            email: '',
            company_name: '',
            contact_person: '',
            contact_phone: '',
            country: '',
            city: '',
            address: '',
          });
        }
        setAddPartnerDialogOpen(open);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('pdp.addNewPartner')}</DialogTitle>
            <DialogDescription>
              {t('pdp.createNewPartnerDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="email">{t('common.email')} *</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('ecp.contactPerson')}
                value={newPartnerForm.email}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, email: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="company_name">{t('pdp.organizationName')} *</Label>
              <Input
                id="company_name"
                placeholder={t('pdp.organizationPlaceholder')}
                value={newPartnerForm.company_name}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, company_name: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="contact_person">{t('partners.contactPerson')} *</Label>
              <Input
                id="contact_person"
                placeholder={t('pdp.contactPersonPlaceholder')}
                value={newPartnerForm.contact_person}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, contact_person: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="contact_phone">{t('ecp.phoneNumber')}</Label>
              <Input
                id="contact_phone"
                placeholder={t('pdp.phoneNumberPlaceholder')}
                value={newPartnerForm.contact_phone}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, contact_phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="country">{t('ecp.countryCode')}</Label>
              <Input
                id="country"
                placeholder={t('pdp.countryCodePlaceholder')}
                maxLength={2}
                value={newPartnerForm.country}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, country: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <Label htmlFor="city">{t('ecp.city')}</Label>
              <Input
                id="city"
                placeholder={t('pdp.cityPlaceholder')}
                value={newPartnerForm.city}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, city: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="address">{t('ecp.address')}</Label>
              <Input
                id="address"
                placeholder={t('pdp.addressPlaceholder')}
                value={newPartnerForm.address}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, address: e.target.value })}
              />
            </div>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('pdp.accountCreationNote')}
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddPartnerDialogOpen(false)}
              disabled={createPartnerMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => createPartnerMutation.mutate(newPartnerForm)}
              disabled={
                !newPartnerForm.email ||
                !newPartnerForm.company_name ||
                !newPartnerForm.contact_person ||
                createPartnerMutation.isPending
              }
            >
              {createPartnerMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Plus className="h-4 w-4 mr-2" />
              {t('pdp.createPartnerButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
