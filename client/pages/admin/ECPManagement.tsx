/**
 * Admin ECP Management
 *
 * Dedicated management for ECP partners including:
 * - Partner overview with stats
 * - Voucher request approval
 * - Trainer approval workflow
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
import { Skeleton } from "@/components/ui/skeleton";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Building2,
  Ticket,
  UserCheck,
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Download,
  Users,
  Loader2,
  RefreshCw,
  Plus,
  Upload,
  Layers,
} from "lucide-react";

// Types
interface ECPPartnerWithStats {
  id: string;
  email: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  country_code?: string;
  created_at: string;
  partner_type?: string;
  license_status?: string;
  vouchers_total: number;
  vouchers_used: number;
  trainers_approved: number;
  trainers_pending: number;
  trainees_total: number;
  batches_total: number;
}

interface VoucherRequest {
  id: string;
  partner_id: string;
  certification_type: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: string;
  payment_method?: string;
  created_at: string;
  partner?: {
    email: string;
    company_name?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface TrainerApplication {
  id: string;
  partner_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  certifications: string[];
  bio?: string;
  created_at: string;
  partner?: {
    email: string;
    company_name?: string;
  };
}

// Fetch functions
async function fetchECPPartners(): Promise<ECPPartnerWithStats[]> {
  // Get all ECP partners from partners table
  const { data: partners, error: partnersError } = await supabase
    .from('partners')
    .select('*')
    .in('partner_type', ['ecp', 'dual_partner'])
    .order('created_at', { ascending: false });

  if (partnersError) throw partnersError;

  // Get stats for each partner
  const partnersWithStats = await Promise.all(
    (partners || []).map(async (partner: any) => {
      const partnerId = partner.id;

      // Get voucher stats from allocations
      const { data: allocations } = await supabase
        .from('ecp_voucher_allocations')
        .select('quantity, vouchers_used')
        .eq('partner_id', partnerId);

      const vouchersTotal = allocations?.reduce((sum, a) => sum + (a.quantity || 0), 0) || 0;
      const vouchersUsed = allocations?.reduce((sum, a) => sum + (a.vouchers_used || 0), 0) || 0;

      // Get trainer stats
      const { data: trainers } = await supabase
        .from('ecp_trainers')
        .select('status')
        .eq('partner_id', partnerId);

      const trainersApproved = trainers?.filter((t) => t.status === 'approved').length || 0;
      const trainersPending = trainers?.filter((t) => t.status === 'pending').length || 0;

      // Get trainee count
      const { count: traineesCount } = await supabase
        .from('ecp_trainees')
        .select('id', { count: 'exact', head: true })
        .eq('partner_id', partnerId);

      // Get batch count
      const { count: batchesCount } = await supabase
        .from('ecp_training_batches')
        .select('id', { count: 'exact', head: true })
        .eq('partner_id', partnerId);

      // Get license status
      const { data: license } = await supabase
        .from('ecp_licenses')
        .select('status')
        .eq('partner_id', partnerId)
        .maybeSingle();

      return {
        id: partner.id,
        email: partner.contact_email,
        company_name: partner.company_name,
        first_name: partner.contact_person || '',
        last_name: '',
        country_code: partner.country,
        created_at: partner.created_at,
        partner_type: partner.partner_type,
        license_status: license?.status || 'pending',
        vouchers_total: vouchersTotal,
        vouchers_used: vouchersUsed,
        trainers_approved: trainersApproved,
        trainers_pending: trainersPending,
        trainees_total: traineesCount || 0,
        batches_total: batchesCount || 0,
      };
    })
  );

  return partnersWithStats;
}

async function fetchVoucherRequests(): Promise<VoucherRequest[]> {
  const { data, error } = await supabase
    .from('ecp_voucher_requests')
    .select(`
      *,
      partners!ecp_voucher_requests_partner_id_fkey(
        id,
        company_name,
        contact_email,
        contact_person
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map to include partner info
  return (data || []).map((req: any) => ({
    ...req,
    partner: {
      email: req.partners?.contact_email || '',
      company_name: req.partners?.company_name || '',
      first_name: req.partners?.contact_person || '',
      last_name: '',
    }
  }));
}

async function fetchPendingTrainers(): Promise<TrainerApplication[]> {
  const { data, error } = await supabase
    .from('ecp_trainers')
    .select(`
      *,
      partners!ecp_trainers_partner_id_fkey(
        id,
        company_name,
        contact_email
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map to include partner info
  return (data || []).map((trainer: any) => ({
    ...trainer,
    partner: {
      email: trainer.partners?.contact_email || '',
      company_name: trainer.partners?.company_name || '',
    }
  }));
}

export default function ECPManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState("partners");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
    partnership_type: 'ecp' as 'ecp' | 'pdp' | 'dual_partner',
    pdp_tier: 'standard' as 'standard' | 'advanced' | 'premium',
  });

  // Upgrade to Dual Partner dialog state
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPartnerForUpgrade, setSelectedPartnerForUpgrade] = useState<ECPPartnerWithStats | null>(null);
  const [upgradePdpTier, setUpgradePdpTier] = useState<'standard' | 'advanced' | 'premium'>('standard');

  const [reviewVoucherDialogOpen, setReviewVoucherDialogOpen] = useState(false);
  const [selectedVoucherRequest, setSelectedVoucherRequest] = useState<VoucherRequest | null>(null);

  const [reviewTrainerDialogOpen, setReviewTrainerDialogOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Create License dialog state
  const [createLicenseDialogOpen, setCreateLicenseDialogOpen] = useState(false);
  const [selectedPartnerForLicense, setSelectedPartnerForLicense] = useState<ECPPartnerWithStats | null>(null);
  const [licenseForm, setLicenseForm] = useState({
    territories: '',
    programs: 'CP',
    durationMonths: 12,
  });

  // Queries
  const { data: partners, isLoading: partnersLoading, error: partnersError } = useQuery({
    queryKey: ['admin', 'ecp-partners'],
    queryFn: fetchECPPartners,
  });

  const { data: voucherRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['admin', 'ecp-voucher-requests'],
    queryFn: fetchVoucherRequests,
  });

  const { data: trainers, isLoading: trainersLoading } = useQuery({
    queryKey: ['admin', 'ecp-trainers'],
    queryFn: fetchPendingTrainers,
  });

  // Mutations
  // PDP tier → max_programs mapping
  const PDP_TIER_PROGRAMS: Record<string, number> = {
    standard: 5,
    advanced: 8,
    premium: 12,
  };

  const createPartnerMutation = useMutation({
    mutationFn: async (formData: typeof newPartnerForm) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const nameParts = formData.contact_person.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Determine base role: if dual, create as ecp first then upgrade
      const baseRole = formData.partnership_type === 'pdp' ? 'pdp' : 'ecp';

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
            role: baseRole,
            source: 'admin_created',
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create user');

      const userId = result.user_id;
      if (!userId) throw new Error('Failed to create user');

      // Update partner record with company info
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

      // If dual_partner: activate PDP partnership on top of ECP
      if (formData.partnership_type === 'dual_partner') {
        const maxPrograms = PDP_TIER_PROGRAMS[formData.pdp_tier] || 5;
        // Create PDP profile
        await supabase.from('pdp_partner_profiles').upsert({
          partner_id: userId,
          organization_name: formData.company_name,
          legal_name: formData.company_name,
          primary_contact_name: formData.contact_person,
          primary_contact_email: formData.email,
          primary_contact_phone: formData.contact_phone,
        }, { onConflict: 'partner_id' });

        // Create PDP license
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 12);
        const countryCode = formData.country?.toUpperCase() || 'XX';
        await supabase.from('pdp_licenses').insert({
          partner_id: userId,
          license_number: `PDP-LIC-${Date.now()}`,
          partner_code: `PDP-${countryCode}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          status: 'active',
          issue_date: new Date().toISOString(),
          expiry_date: expiryDate.toISOString(),
          max_programs: maxPrograms,
          programs_used: 0,
          program_submission_enabled: true,
        });

        // Update user role and partner_type to dual_partner
        await supabase.from('users').update({ role: 'dual_partner' }).eq('id', userId);
        await supabase.from('partners').update({ partner_type: 'dual_partner' }).eq('id', userId);
      }

      return { id: userId, type: formData.partnership_type };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ecp-partners'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pdp-partners'] });
      const typeLabel = data.type === 'dual_partner' ? 'ECP + PDP (Dual Partner)' : data.type === 'pdp' ? 'PDP' : 'ECP';
      toast({
        title: 'Partner Created',
        description: `${typeLabel} partner has been successfully created. They will receive login credentials via email.`
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
        partnership_type: 'ecp',
        pdp_tier: 'standard',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Creating Partner',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  // ─── Voucher Request Workflow Mutations ─────────────────────────────────────
  // Correct flow: pending → approved → paid → fulfilled
  // Each step is a separate action; vouchers are only created at 'fulfilled' stage
  // via fulfill_voucher_request() RPC which uses generate_voucher_code() for proper codes.

  const approveVoucherMutation = useMutation({
    mutationFn: async ({ requestId, adminNotes }: { requestId: string; adminNotes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('ecp_voucher_requests')
        .update({
          status: 'approved',
          admin_notes: adminNotes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'pending'); // safety: only approve pending requests
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ecp-voucher-requests'] });
      toast({ title: 'Request Approved', description: 'Partner will be notified to proceed with payment.' });
      setReviewVoucherDialogOpen(false);
      setSelectedVoucherRequest(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const markPaidVoucherMutation = useMutation({
    mutationFn: async ({ requestId, paymentReference }: { requestId: string; paymentReference?: string }) => {
      const { error } = await supabase
        .from('ecp_voucher_requests')
        .update({
          status: 'paid',
          payment_reference: paymentReference || null,
          paid_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'approved'); // safety: only mark approved requests as paid
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ecp-voucher-requests'] });
      toast({ title: 'Marked as Paid', description: 'You can now fulfil the request to generate vouchers.' });
      setReviewVoucherDialogOpen(false);
      setSelectedVoucherRequest(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const fulfillVoucherMutation = useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      // Uses fulfill_voucher_request() RPC which:
      // 1. Generates proper voucher codes via generate_voucher_code()
      // 2. Inserts rows into ecp_vouchers with correct partner_id, valid_until, etc.
      // 3. Updates the request status to 'fulfilled'
      const { data, error } = await supabase.rpc('fulfill_voucher_request', {
        p_request_id: requestId,
        p_admin_id: user?.id,
      });
      if (error) throw error;
      return data as number; // returns count of vouchers created
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ecp-voucher-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'ecp-partners'] });
      toast({
        title: 'Vouchers Generated',
        description: `${count} voucher${count !== 1 ? 's' : ''} created and are now available in the partner's account.`,
      });
      setReviewVoucherDialogOpen(false);
      setSelectedVoucherRequest(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const rejectVoucherMutation = useMutation({
    mutationFn: async ({ requestId, adminNotes }: { requestId: string; adminNotes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('ecp_voucher_requests')
        .update({
          status: 'cancelled',
          admin_notes: adminNotes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ecp-voucher-requests'] });
      toast({ title: 'Request Rejected', description: 'The voucher request has been cancelled.' });
      setReviewVoucherDialogOpen(false);
      setSelectedVoucherRequest(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const reviewTrainerMutation = useMutation({
    mutationFn: async ({ trainerId, status, notes }: { trainerId: string; status: string; notes?: string }) => {
      const { error } = await supabase
        .from('ecp_trainers')
        .update({
          status,
          // Could add admin_notes field if needed
        })
        .eq('id', trainerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ecp-trainers'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'ecp-partners'] });
      toast({ title: 'Trainer Updated', description: 'Trainer status has been updated.' });
      setReviewTrainerDialogOpen(false);
      setSelectedTrainer(null);
      setRejectionReason('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Create License mutation
  const createLicenseMutation = useMutation({
    mutationFn: async ({ partnerId, territories, programs, durationMonths }: {
      partnerId: string;
      territories: string;
      programs: string;
      durationMonths: number;
    }) => {
      // Get partner info for partner_code generation
      const { data: partner } = await supabase
        .from('partners')
        .select('country, company_name')
        .eq('id', partnerId)
        .single();

      // Generate license number and partner code
      const countryCode = partner?.country?.substring(0, 2)?.toUpperCase() || 'XX';
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-4);
      const licenseNumber = `BDA-ECP-${countryCode}-${year}-${timestamp}`;
      const partnerCode = `ECP-${countryCode}-${timestamp}`;

      // Calculate expiry date
      const issueDate = new Date().toISOString().split('T')[0];
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + durationMonths);
      const expiryDateStr = expiryDate.toISOString().split('T')[0];

      // Parse territories and programs
      const territoriesArray = territories.split(',').map(t => t.trim()).filter(Boolean);
      const programsArray = programs.split(',').map(p => p.trim()).filter(Boolean);

      // Create the license - NOTE: partner_id in ecp_licenses is the USER id, not partners.id
      // We need to get the user_id associated with this partner
      // For now, we'll use the partner.id directly since the FK might reference partners table
      const { error } = await supabase
        .from('ecp_licenses')
        .insert({
          partner_id: partnerId,
          license_number: licenseNumber,
          partner_code: partnerCode,
          status: 'active',
          issue_date: issueDate,
          expiry_date: expiryDateStr,
          territories: territoriesArray.length > 0 ? territoriesArray : [countryCode],
          programs: programsArray.length > 0 ? programsArray : ['CP'],
          renewal_requested: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ecp-partners'] });
      toast({
        title: 'License Created',
        description: 'ECP license has been successfully created for the partner.'
      });
      setCreateLicenseDialogOpen(false);
      setSelectedPartnerForLicense(null);
      setLicenseForm({ territories: '', programs: 'CP', durationMonths: 12 });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Creating License',
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  // ── Upgrade ECP → Dual Partner mutation ──────────────────────────────────
  const upgradePartnerMutation = useMutation({
    mutationFn: async ({ partnerId, tier }: { partnerId: string; tier: 'standard' | 'advanced' | 'premium' }) => {
      const maxPrograms = PDP_TIER_PROGRAMS[tier] || 5;

      // 1. Get partner info
      const { data: partnerData } = await supabase
        .from('partners')
        .select('company_name, contact_person, contact_email, contact_phone, country')
        .eq('id', partnerId)
        .single();

      if (!partnerData) throw new Error('Partner not found');

      // 2. Create PDP partner profile
      await supabase.from('pdp_partner_profiles').upsert({
        partner_id: partnerId,
        organization_name: partnerData.company_name,
        legal_name: partnerData.company_name,
        primary_contact_name: partnerData.contact_person,
        primary_contact_email: partnerData.contact_email,
        primary_contact_phone: partnerData.contact_phone,
      }, { onConflict: 'partner_id' });

      // 3. Create PDP license
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 12);
      const countryCode = partnerData.country?.toUpperCase() || 'XX';
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

      // 4. Update user role and partner_type
      await supabase.from('users').update({ role: 'dual_partner' }).eq('id', partnerId);
      const { error: ptErr } = await supabase.from('partners').update({ partner_type: 'dual_partner' }).eq('id', partnerId);
      if (ptErr) throw ptErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ecp-partners'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pdp-partners'] });
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

  // Stats calculations
  const totalPartners = partners?.length || 0;
  const totalVouchers = partners?.reduce((sum, p) => sum + p.vouchers_total, 0) || 0;
  const usedVouchers = partners?.reduce((sum, p) => sum + p.vouchers_used, 0) || 0;
  const pendingVoucherRequests = voucherRequests?.filter((r) => r.status === 'pending').length || 0;
  const pendingTrainerApps = trainers?.filter((t) => t.status === 'pending').length || 0;

  // Filtered data
  const filteredPartners = partners?.filter((p) => {
    const name = p.company_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email;
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.license_status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getPartnerName = (partner: any) => {
    return partner?.company_name ||
      `${partner?.first_name || ''} ${partner?.last_name || ''}`.trim() ||
      partner?.email || 'Unknown';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (partnersError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('ecp.errorLoadingData')}</AlertTitle>
          <AlertDescription>
            {t('ecp.unableToLoad')}
          </AlertDescription>
        </Alert>
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
            <h1 className="text-3xl font-bold">{t('ecp.title')}</h1>
            <p className="mt-2 opacity-90">
              {t('ecp.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('ecp.totalPartners')}</p>
                <p className="text-3xl font-bold">{totalPartners}</p>
              </div>
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('ecp.vouchersAllocated')}</p>
                <p className="text-3xl font-bold">{totalVouchers}</p>
                <p className="text-sm text-green-600">{usedVouchers} {t('ecp.used')}</p>
              </div>
              <Ticket className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className={pendingVoucherRequests > 0 ? 'border-amber-200' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('ecp.pendingVoucherRequests')}</p>
                <p className="text-3xl font-bold text-amber-600">{pendingVoucherRequests}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
        <Card className={pendingTrainerApps > 0 ? 'border-orange-200' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('ecp.trainerApplications')}</p>
                <p className="text-3xl font-bold text-orange-600">{pendingTrainerApps}</p>
              </div>
              <UserCheck className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="partners">{t('ecp.ecpPartnersTab')}</TabsTrigger>
          <TabsTrigger value="vouchers">
            {t('ecp.voucherRequestsTab')}
            {pendingVoucherRequests > 0 && (
              <Badge className="ml-2 bg-amber-500">{pendingVoucherRequests}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="trainers">
            {t('ecp.trainerApprovalsTab')}
            {pendingTrainerApps > 0 && (
              <Badge className="ml-2 bg-orange-500">{pendingTrainerApps}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Partners Tab */}
        <TabsContent value="partners" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('ecp.ecpPartnersTab')}</CardTitle>
                  <CardDescription>{t('ecp.manageDescription')}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/admin/users/bulk-upload')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('ecp.bulkUpload')}
                  </Button>
                  <Button
                    onClick={() => setAddPartnerDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('ecp.addPartner')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t('ecp.searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t('table.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('ecp.allStatus')}</SelectItem>
                    <SelectItem value="active">{t('common.active')}</SelectItem>
                    <SelectItem value="suspended">{t('ecp.suspended')}</SelectItem>
                    <SelectItem value="pending">{t('ecp.pending')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Partners Table */}
              {partnersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('partners.partner')}</TableHead>
                      <TableHead>{t('common.country')}</TableHead>
                      <TableHead>{t('table.status')}</TableHead>
                      <TableHead>{t('ecp.vouchers')}</TableHead>
                      <TableHead>{t('ecp.trainers')}</TableHead>
                      <TableHead>{t('ecp.trainees')}</TableHead>
                      <TableHead>{t('table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPartners.length > 0 ? (
                      filteredPartners.map((partner) => (
                        <TableRow key={partner.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{getPartnerName(partner)}</p>
                              <p className="text-sm text-gray-500">{partner.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{partner.country_code || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                partner.license_status === "active"
                                  ? "bg-green-100 text-green-700"
                                  : partner.license_status === "suspended"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }
                            >
                              {partner.license_status === 'active' ? t('common.active') : partner.license_status === 'suspended' ? t('ecp.suspended') : t('ecp.pending')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="font-medium">{partner.vouchers_used}</span>
                              <span className="text-gray-500">/{partner.vouchers_total}</span>
                            </div>
                            {partner.vouchers_total > 0 && (
                              <Progress
                                value={(partner.vouchers_used / partner.vouchers_total) * 100}
                                className="h-1 mt-1"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{partner.trainers_approved}</span>
                              {partner.trainers_pending > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  +{partner.trainers_pending} {t('ecp.pending')}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{partner.trainees_total}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/admin/ecp/${partner.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t('ecp.viewDetails')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/admin/ecp/${partner.id}/vouchers`)}>
                                  <Ticket className="h-4 w-4 mr-2" />
                                  {t('ecp.allocateVouchers')}
                                </DropdownMenuItem>
                                {partner.license_status !== 'active' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedPartnerForLicense(partner);
                                        setLicenseForm({
                                          territories: partner.country_code || '',
                                          programs: 'CP',
                                          durationMonths: 12,
                                        });
                                        setCreateLicenseDialogOpen(true);
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                      Create License
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {/* Upgrade to Dual Partner — only for pure ECP partners */}
                                {partner.partner_type === 'ecp' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedPartnerForUpgrade(partner);
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
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t('ecp.noPartnersFound')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voucher Requests Tab */}
        <TabsContent value="vouchers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('ecp.voucherRequests')}</CardTitle>
              <CardDescription>{t('ecp.voucherRequestsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('partners.partner')}</TableHead>
                      <TableHead>{t('ecp.type')}</TableHead>
                      <TableHead>{t('ecp.quantity')}</TableHead>
                      <TableHead>{t('ecp.amount')}</TableHead>
                      <TableHead>{t('ecp.requested')}</TableHead>
                      <TableHead>{t('table.status')}</TableHead>
                      <TableHead>{t('table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {voucherRequests && voucherRequests.length > 0 ? (
                      voucherRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            {getPartnerName(request.partner)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">BDA-{request.certification_type}</Badge>
                          </TableCell>
                          <TableCell>{request.quantity}</TableCell>
                          <TableCell>${request.total_amount?.toFixed(2) || '-'}</TableCell>
                          <TableCell>{formatDate(request.created_at)}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                request.status === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : request.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }
                            >
                              {request.status === 'approved' ? t('ecp.approve') : request.status === 'rejected' ? t('ecp.reject') : t('ecp.pending')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedVoucherRequest(request);
                                  setReviewVoucherDialogOpen(true);
                                }}
                              >
                                {t('ecp.review')}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t('ecp.noVoucherRequests')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trainer Approvals Tab */}
        <TabsContent value="trainers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('ecp.trainerApplicationsTitle')}</CardTitle>
              <CardDescription>{t('ecp.trainerApplicationsDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {trainersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('ecp.trainer')}</TableHead>
                      <TableHead>{t('partners.partner')}</TableHead>
                      <TableHead>{t('ecp.certifications')}</TableHead>
                      <TableHead>{t('ecp.submitted')}</TableHead>
                      <TableHead>{t('table.status')}</TableHead>
                      <TableHead>{t('table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainers && trainers.length > 0 ? (
                      trainers.map((trainer) => (
                        <TableRow key={trainer.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{trainer.first_name} {trainer.last_name}</p>
                              <p className="text-sm text-gray-500">{trainer.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{trainer.partner?.company_name || trainer.partner?.email || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {trainer.certifications?.map((cert: string) => (
                                <Badge key={cert} variant="outline" className="text-xs">
                                  {cert}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(trainer.created_at)}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                trainer.status === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : trainer.status === "suspended" || trainer.status === "inactive"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }
                            >
                              {trainer.status === 'approved' ? t('ecp.approve') : trainer.status === 'suspended' || trainer.status === 'inactive' ? t('ecp.suspended') : t('ecp.pending')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {trainer.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedTrainer(trainer);
                                  setReviewTrainerDialogOpen(true);
                                }}
                              >
                                {t('ecp.review')}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {t('ecp.noTrainerApplications')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Voucher Request Dialog — full workflow: pending → approved → paid → fulfilled */}
      <Dialog open={reviewVoucherDialogOpen} onOpenChange={(open) => {
        if (!open) {
          document.body.style.pointerEvents = '';
          document.body.style.overflow = '';
          setSelectedVoucherRequest(null);
        }
        setReviewVoucherDialogOpen(open);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Voucher Request</DialogTitle>
            <DialogDescription>
              From {getPartnerName(selectedVoucherRequest?.partner)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              <Badge
                className={
                  selectedVoucherRequest?.status === 'pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                  selectedVoucherRequest?.status === 'approved' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  selectedVoucherRequest?.status === 'paid' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                  selectedVoucherRequest?.status === 'fulfilled' ? 'bg-green-100 text-green-800 border-green-200' :
                  'bg-gray-100 text-gray-800'
                }
                variant="outline"
              >
                {selectedVoucherRequest?.status?.toUpperCase()}
              </Badge>
            </div>

            {/* Request details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Quantity</p>
                <p className="text-2xl font-bold">{selectedVoucherRequest?.quantity}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Certification</p>
                <p className="text-2xl font-bold">BDA-{selectedVoucherRequest?.certification_type}</p>
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-1">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-xl font-bold text-gray-900">
                ${selectedVoucherRequest?.total_amount?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-gray-500">
                Payment method: {selectedVoucherRequest?.payment_method || 'invoice'}
              </p>
            </div>

            {/* Workflow guidance */}
            {selectedVoucherRequest?.status === 'pending' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                ⚠️ Review the request and approve it. The partner will then be invoiced.
              </div>
            )}
            {selectedVoucherRequest?.status === 'approved' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                💳 Once payment is confirmed, mark as paid to proceed to voucher generation.
              </div>
            )}
            {selectedVoucherRequest?.status === 'paid' && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800">
                ✅ Payment confirmed. Click “Fulfil” to generate {selectedVoucherRequest.quantity} voucher codes.
              </div>
            )}
            {selectedVoucherRequest?.status === 'fulfilled' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                ✅ {selectedVoucherRequest.quantity} vouchers have been generated and are visible in the partner’s account.
              </div>
            )}
          </div>

          <DialogFooter className="flex-wrap gap-2">
            {/* Reject — available for pending and approved */}
            {(selectedVoucherRequest?.status === 'pending' || selectedVoucherRequest?.status === 'approved') && (
              <Button
                variant="outline"
                onClick={() => rejectVoucherMutation.mutate({ requestId: selectedVoucherRequest!.id })}
                disabled={rejectVoucherMutation.isPending}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            )}

            {/* Approve — only for pending */}
            {selectedVoucherRequest?.status === 'pending' && (
              <Button
                onClick={() => approveVoucherMutation.mutate({ requestId: selectedVoucherRequest!.id })}
                disabled={approveVoucherMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {approveVoucherMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            )}

            {/* Mark as Paid — only for approved */}
            {selectedVoucherRequest?.status === 'approved' && (
              <Button
                onClick={() => markPaidVoucherMutation.mutate({ requestId: selectedVoucherRequest!.id })}
                disabled={markPaidVoucherMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {markPaidVoucherMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Mark as Paid
              </Button>
            )}

            {/* Fulfil — only for paid */}
            {selectedVoucherRequest?.status === 'paid' && (
              <Button
                onClick={() => fulfillVoucherMutation.mutate({ requestId: selectedVoucherRequest!.id })}
                disabled={fulfillVoucherMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {fulfillVoucherMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CheckCircle className="h-4 w-4 mr-2" />
                Fulfil &amp; Generate Vouchers
              </Button>
            )}

            {/* Close for terminal states */}
            {(selectedVoucherRequest?.status === 'fulfilled' || selectedVoucherRequest?.status === 'cancelled') && (
              <Button variant="outline" onClick={() => setReviewVoucherDialogOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Trainer Dialog */}
      <Dialog open={reviewTrainerDialogOpen} onOpenChange={(open) => {
        if (!open) {
          // Force cleanup cursor issue
          document.body.style.pointerEvents = '';
          document.body.style.overflow = '';
          setSelectedTrainer(null);
          setRejectionReason('');
        }
        setReviewTrainerDialogOpen(open);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('ecp.reviewTrainerApplication')}</DialogTitle>
            <DialogDescription>
              {t('ecp.applicationFor')} {selectedTrainer?.first_name} {selectedTrainer?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-500">{t('partners.partner')}</Label>
                <p className="font-medium">
                  {selectedTrainer?.partner?.company_name || selectedTrainer?.partner?.email || '-'}
                </p>
              </div>
              <div>
                <Label className="text-gray-500">{t('common.email')}</Label>
                <p className="font-medium">{selectedTrainer?.email}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-gray-500">{t('ecp.certifications')}</Label>
                <div className="flex gap-1 mt-1">
                  {selectedTrainer?.certifications?.map((cert: string) => (
                    <Badge key={cert} variant="outline">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {selectedTrainer?.bio && (
              <div>
                <Label className="text-gray-500">{t('ecp.bio')}</Label>
                <p className="text-sm text-gray-700 mt-1">{selectedTrainer.bio}</p>
              </div>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('ecp.reviewChecklist')}</AlertTitle>
              <AlertDescription>
                <ul className="text-sm mt-2 space-y-1">
                  <li>- {t('ecp.verifyCertifications')}</li>
                  <li>- {t('ecp.checkExperience')}</li>
                  <li>- {t('ecp.reviewDeliveryExperience')}</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>{t('ecp.rejectionReason')}</Label>
              <Textarea
                placeholder={t('ecp.rejectionReasonPlaceholder')}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => reviewTrainerMutation.mutate({
                trainerId: selectedTrainer!.id,
                status: 'inactive',
                notes: rejectionReason,
              })}
              disabled={!rejectionReason || reviewTrainerMutation.isPending}
              className="text-red-600"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t('ecp.reject')}
            </Button>
            <Button
              onClick={() => reviewTrainerMutation.mutate({
                trainerId: selectedTrainer!.id,
                status: 'approved',
              })}
              disabled={reviewTrainerMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {reviewTrainerMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('ecp.approveTrainer')}
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
            partnership_type: 'ecp',
            pdp_tier: 'standard',
          });
        }
        setAddPartnerDialogOpen(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Partner</DialogTitle>
            <DialogDescription>
              Create a new partner account. You can assign ECP, PDP, or both partnerships at once.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {/* Partnership Type Selector */}
            <div className="col-span-2">
              <Label>Partnership Type *</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(['ecp', 'pdp', 'dual_partner'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewPartnerForm({ ...newPartnerForm, partnership_type: type })}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      newPartnerForm.partnership_type === type
                        ? 'border-[#0d2b5e] bg-[#0d2b5e] text-white'
                        : 'border-gray-200 text-gray-600 hover:border-[#0d2b5e]'
                    }`}
                  >
                    {type === 'ecp' ? 'ECP Only' : type === 'pdp' ? 'PDP Only' : 'ECP + PDP (Dual)'}
                  </button>
                ))}
              </div>
            </div>

            {/* PDP Tier — shown only when PDP or Dual */}
            {(newPartnerForm.partnership_type === 'pdp' || newPartnerForm.partnership_type === 'dual_partner') && (
              <div className="col-span-2">
                <Label>PDP Package *</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {([
                    { key: 'standard', label: 'Standard', programs: 5 },
                    { key: 'advanced', label: 'Advanced', programs: 8 },
                    { key: 'premium', label: 'Premium', programs: 12 },
                  ] as const).map((tier) => (
                    <button
                      key={tier.key}
                      type="button"
                      onClick={() => setNewPartnerForm({ ...newPartnerForm, pdp_tier: tier.key })}
                      className={`p-3 rounded-lg border-2 text-sm transition-all ${
                        newPartnerForm.pdp_tier === tier.key
                          ? 'border-[#0d2b5e] bg-blue-50 text-[#0d2b5e]'
                          : 'border-gray-200 text-gray-600 hover:border-[#0d2b5e]'
                      }`}
                    >
                      <div className="font-semibold">{tier.label}</div>
                      <div className="text-xs text-gray-500">{tier.programs} Programs</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="col-span-2">
              <Label htmlFor="email">{t('common.email')} *</Label>
              <Input
                id="email"
                type="email"
                placeholder="partner@example.com"
                value={newPartnerForm.email}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, email: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="company_name">{t('ecp.companyName')} *</Label>
              <Input
                id="company_name"
                placeholder="Acme Training Center"
                value={newPartnerForm.company_name}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, company_name: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="contact_person">{t('ecp.contactPerson')} *</Label>
              <Input
                id="contact_person"
                placeholder="John Smith"
                value={newPartnerForm.contact_person}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, contact_person: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="contact_phone">{t('ecp.phoneNumber')}</Label>
              <Input
                id="contact_phone"
                placeholder="+1234567890"
                value={newPartnerForm.contact_phone}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, contact_phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="country">{t('ecp.countryCode')}</Label>
              <Input
                id="country"
                placeholder="US"
                maxLength={2}
                value={newPartnerForm.country}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, country: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <Label htmlFor="city">{t('ecp.city')}</Label>
              <Input
                id="city"
                placeholder="New York"
                value={newPartnerForm.city}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, city: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="address">{t('ecp.address')}</Label>
              <Input
                id="address"
                placeholder="123 Main St"
                value={newPartnerForm.address}
                onChange={(e) => setNewPartnerForm({ ...newPartnerForm, address: e.target.value })}
              />
            </div>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('ecp.accountCreationNote')}
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
              className="bg-[#0d2b5e] hover:bg-[#1a3d7c]"
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
              Create Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade to Dual Partner Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={(open) => {
        if (!open) setSelectedPartnerForUpgrade(null);
        setUpgradeDialogOpen(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add PDP Partnership</DialogTitle>
            <DialogDescription>
              Upgrade <strong>{selectedPartnerForUpgrade?.company_name || selectedPartnerForUpgrade?.email}</strong> to a Dual Partner by adding a PDP partnership.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Select PDP Package</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'standard', label: 'Standard', programs: 5 },
                  { key: 'advanced', label: 'Advanced', programs: 8 },
                  { key: 'premium', label: 'Premium', programs: 12 },
                ] as const).map((tier) => (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => setUpgradePdpTier(tier.key)}
                    className={`p-3 rounded-lg border-2 text-sm transition-all ${
                      upgradePdpTier === tier.key
                        ? 'border-[#0d2b5e] bg-blue-50 text-[#0d2b5e]'
                        : 'border-gray-200 text-gray-600 hover:border-[#0d2b5e]'
                    }`}
                  >
                    <div className="font-semibold">{tier.label}</div>
                    <div className="text-xs text-gray-500">{tier.programs} Programs</div>
                  </button>
                ))}
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The partner will receive a PDP license with {upgradePdpTier === 'standard' ? 5 : upgradePdpTier === 'advanced' ? 8 : 12} program slots. Their role will be upgraded to Dual Partner and they will see a Workspace Switcher on next login.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)} disabled={upgradePartnerMutation.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-[#0d2b5e] hover:bg-[#1a3d7c]"
              onClick={() => upgradePartnerMutation.mutate({ partnerId: selectedPartnerForUpgrade!.id, tier: upgradePdpTier })}
              disabled={upgradePartnerMutation.isPending}
            >
              {upgradePartnerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Layers className="h-4 w-4 mr-2" />
              Upgrade to Dual Partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create License Dialog */}
      <Dialog open={createLicenseDialogOpen} onOpenChange={(open) => {
        if (!open) {
          document.body.style.pointerEvents = '';
          document.body.style.overflow = '';
          setSelectedPartnerForLicense(null);
          setLicenseForm({ territories: '', programs: 'CP', durationMonths: 12 });
        }
        setCreateLicenseDialogOpen(open);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create ECP License</DialogTitle>
            <DialogDescription>
              Create a new license for {selectedPartnerForLicense?.company_name || selectedPartnerForLicense?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Partner Information</p>
              <p className="text-sm mt-1">{selectedPartnerForLicense?.company_name}</p>
              <p className="text-sm text-gray-500">{selectedPartnerForLicense?.email}</p>
              <p className="text-sm text-gray-500">{selectedPartnerForLicense?.country_code || 'No country set'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="territories">Territories (comma-separated)</Label>
                <Input
                  id="territories"
                  placeholder="EG, SA, AE"
                  value={licenseForm.territories}
                  onChange={(e) => setLicenseForm({ ...licenseForm, territories: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">Countries where the partner can operate</p>
              </div>
              <div className="col-span-2">
                <Label htmlFor="programs">Programs (comma-separated)</Label>
                <Input
                  id="programs"
                  placeholder="CP, CBAP"
                  value={licenseForm.programs}
                  onChange={(e) => setLicenseForm({ ...licenseForm, programs: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">Certification programs the partner can offer</p>
              </div>
              <div className="col-span-2">
                <Label htmlFor="duration">License Duration</Label>
                <Select
                  value={licenseForm.durationMonths.toString()}
                  onValueChange={(v) => setLicenseForm({ ...licenseForm, durationMonths: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months (1 year)</SelectItem>
                    <SelectItem value="24">24 months (2 years)</SelectItem>
                    <SelectItem value="36">36 months (3 years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The license will be activated immediately and the partner will be able to access ECP features.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateLicenseDialogOpen(false)}
              disabled={createLicenseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createLicenseMutation.mutate({
                partnerId: selectedPartnerForLicense!.id,
                territories: licenseForm.territories,
                programs: licenseForm.programs,
                durationMonths: licenseForm.durationMonths,
              })}
              disabled={createLicenseMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {createLicenseMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <CheckCircle className="h-4 w-4 mr-2" />
              Create License
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
