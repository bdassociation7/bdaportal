/**
 * UpgradeRequests.tsx
 *
 * Admin page to manage:
 *   1. New Partnership Applications  — users who registered as ECP/PDP (ecp_pending / pdp_pending)
 *   2. Partner Upgrade Requests      — existing partners requesting a tier/type upgrade
 *
 * Approve → calls activate_partnership RPC
 * Reject  → updates status, optionally sends email
 */

import { useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpCircle, CheckCircle, XCircle, Clock,
  Loader2, Search, RefreshCw, Building2, Shield,
  Layers, Crown, Zap, Star, UserPlus, Mail,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpgradeRequest {
  id: string;
  partner_id: string;
  partner_email?: string;
  partner_name?: string;
  current_type: string;
  current_tier: string | null;
  requested_type: string;
  requested_tier: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  reviewed_at: string | null;
  request_type?: "upgrade" | "new_application";
  applicant_user_id?: string;
  partner?: {
    company_name: string;
    contact_email: string;
    country: string;
  };
}

interface NewApplication {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  role: string;
  created_at: string;
  country_code: string | null;
  phone: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-200", icon: XCircle },
};

const tierIcons: Record<string, React.ReactNode> = {
  standard: <Star className="h-4 w-4 text-gray-500" />,
  advanced: <Zap className="h-4 w-4 text-blue-500" />,
  premium: <Crown className="h-4 w-4 text-purple-500" />,
};

const typeIcons: Record<string, React.ReactNode> = {
  ecp: <Shield className="h-4 w-4 text-[#0d2b5e]" />,
  ecp_pending: <Shield className="h-4 w-4 text-amber-500" />,
  pdp: <Building2 className="h-4 w-4 text-[#0d2b5e]" />,
  pdp_pending: <Building2 className="h-4 w-4 text-amber-500" />,
  dual_partner: <Layers className="h-4 w-4 text-[#0d2b5e]" />,
};

function formatPartnershipLabel(type: string, tier?: string) {
  const clean = type.replace("_pending", "");
  const typeLabel = clean === "dual_partner" ? "Dual Partner" : clean.toUpperCase();
  if (!tier) return typeLabel;
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  return `${typeLabel} — ${tierLabel}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UpgradeRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upgrade requests state
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // New applications state
  const [appSearch, setAppSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<NewApplication | null>(null);
  const [appAction, setAppAction] = useState<"approve" | "reject" | null>(null);
  const [appNotes, setAppNotes] = useState("");
  const [appProcessing, setAppProcessing] = useState(false);

  // ── Fetch upgrade requests ─────────────────────────────────────────────────
  const { data: requests = [], isLoading: reqLoading, refetch: refetchReq } = useQuery<UpgradeRequest[]>({
    queryKey: ["upgrade-requests", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("upgrade_requests")
        .select(`
          *,
          partner:partners!upgrade_requests_partner_id_fkey(
            company_name, contact_email, country
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Fetch new applications (ecp_pending / pdp_pending users) ──────────────
  const { data: applications = [], isLoading: appLoading, refetch: refetchApps } = useQuery<NewApplication[]>({
    queryKey: ["partnership-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, first_name, last_name, company_name, role, created_at, country_code, phone")
        .in("role", ["ecp_pending", "pdp_pending"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ["upgrade-requests-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("upgrade_requests")
        .select("status");
      const all = data ?? [];
      return {
        pending: all.filter((r) => r.status === "pending").length,
        approved: all.filter((r) => r.status === "approved").length,
        rejected: all.filter((r) => r.status === "rejected").length,
        total: all.length,
      };
    },
  });

  // ── Process upgrade request ────────────────────────────────────────────────
  const processRequest = async (request: UpgradeRequest, action: "approve" | "reject") => {
    setProcessing(true);
    try {
      if (action === "approve") {
        const { error: activateError } = await supabase.rpc("activate_partnership", {
          p_user_id: request.partner_id,
          p_partnership_type: request.requested_type === "dual_partner"
            ? (request.current_type === "ecp" ? "pdp" : "ecp")
            : request.requested_type,
          p_notes: adminNotes.trim() || null,
        });
        if (activateError) throw activateError;
      }

      const { error: updateError } = await supabase
        .from("upgrade_requests")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          admin_notes: adminNotes.trim() || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);
      if (updateError) throw updateError;

      // Notify partner via email
      await sendNotificationEmail(
        request.partner?.contact_email ?? request.partner_email ?? "",
        request.partner?.company_name ?? request.partner_name ?? "Partner",
        action,
        formatPartnershipLabel(request.requested_type, request.requested_tier),
        adminNotes
      );

      toast({
        title: action === "approve" ? "Upgrade Activated" : "Request Rejected",
        description: action === "approve"
          ? `Partnership upgraded to ${formatPartnershipLabel(request.requested_type, request.requested_tier)} successfully.`
          : "The upgrade request has been rejected.",
      });

      queryClient.invalidateQueries({ queryKey: ["upgrade-requests"] });
      queryClient.invalidateQueries({ queryKey: ["upgrade-requests-stats"] });
      setSelectedRequest(null);
      setActionType(null);
      setAdminNotes("");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // ── Process new application ────────────────────────────────────────────────
  const processApplication = async (app: NewApplication, action: "approve" | "reject") => {
    setAppProcessing(true);
    try {
      const partnershipType = app.role.replace("_pending", "") as "ecp" | "pdp";

      if (action === "approve") {
        // Activate partnership — this sets role to ecp/pdp and creates all records
        const { error: activateError } = await supabase.rpc("activate_partnership", {
          p_user_id: app.id,
          p_partnership_type: partnershipType,
          p_notes: appNotes.trim() || `Approved via admin portal — new application`,
        });
        if (activateError) throw activateError;
      } else {
        // Reject: downgrade role to 'individual' so they can still use the portal
        const { error: roleError } = await supabase
          .from("users")
          .update({ role: "individual", updated_at: new Date().toISOString() })
          .eq("id", app.id);
        if (roleError) throw roleError;
      }

      // Notify applicant via email
      await sendNotificationEmail(
        app.email,
        app.first_name + " " + app.last_name,
        action,
        partnershipType.toUpperCase() + " Partnership",
        appNotes
      );

      toast({
        title: action === "approve" ? "Application Approved" : "Application Rejected",
        description: action === "approve"
          ? `${app.first_name} ${app.last_name} is now an active ${partnershipType.toUpperCase()} partner.`
          : `Application rejected. User role reverted to Individual.`,
      });

      queryClient.invalidateQueries({ queryKey: ["partnership-applications"] });
      setSelectedApp(null);
      setAppAction(null);
      setAppNotes("");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to process application",
        variant: "destructive",
      });
    } finally {
      setAppProcessing(false);
    }
  };

  // ── Email helper ───────────────────────────────────────────────────────────
  const sendNotificationEmail = async (
    to: string,
    name: string,
    action: "approve" | "reject",
    partnershipLabel: string,
    notes: string
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !to) return;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          to,
          subject: action === "approve"
            ? `Your ${partnershipLabel} Has Been Activated — BDA`
            : `Update on Your Partnership Application — BDA`,
          html: action === "approve"
            ? `<p>Dear ${name},</p>
               <p>We are pleased to inform you that your <strong>${partnershipLabel}</strong> has been activated.</p>
               ${notes ? `<p><strong>Note from BDA team:</strong> ${notes}</p>` : ""}
               <p>Please log in to your portal to access your new features: <a href="https://portal.bda-global.org">portal.bda-global.org</a></p>
               <p>Best regards,<br/>BDA Partnerships Team</p>`
            : `<p>Dear ${name},</p>
               <p>Thank you for your interest in the <strong>${partnershipLabel}</strong>. After review, we are unable to approve your application at this time.</p>
               ${notes ? `<p><strong>Note from BDA team:</strong> ${notes}</p>` : ""}
               <p>For more information, please contact us at <a href="mailto:partnerships@bda-global.org">partnerships@bda-global.org</a>.</p>
               <p>Best regards,<br/>BDA Partnerships Team</p>`,
        }),
      });
    } catch {
      // Don't fail the main action if email fails
    }
  };

  // ── Filter helpers ─────────────────────────────────────────────────────────
  const filteredRequests = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.partner?.company_name?.toLowerCase().includes(q) ||
      r.partner?.contact_email?.toLowerCase().includes(q) ||
      r.requested_type.toLowerCase().includes(q)
    );
  });

  const filteredApps = applications.filter((a) => {
    if (!appSearch) return true;
    const q = appSearch.toLowerCase();
    return (
      a.email.toLowerCase().includes(q) ||
      a.first_name.toLowerCase().includes(q) ||
      a.last_name.toLowerCase().includes(q) ||
      (a.company_name?.toLowerCase().includes(q) ?? false)
    );
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0d2b5e] rounded-lg flex items-center justify-center">
            <ArrowUpCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Partnership Requests</h1>
            <p className="text-gray-500 text-sm">
              Manage new partnership applications and upgrade requests
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => { refetchReq(); refetchApps(); }} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "New Applications", value: applications.length, color: "text-amber-600" },
          { label: "Pending Upgrades", value: stats?.pending ?? 0, color: "text-blue-600" },
          { label: "Approved", value: stats?.approved ?? 0, color: "text-green-600" },
          { label: "Rejected", value: stats?.rejected ?? 0, color: "text-red-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="applications">
        <TabsList className="mb-4">
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            New Applications
            {applications.length > 0 && (
              <Badge className="bg-amber-500 text-white text-xs ml-1 px-1.5 py-0">
                {applications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upgrades" className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4" />
            Upgrade Requests
            {(stats?.pending ?? 0) > 0 && (
              <Badge className="bg-blue-500 text-white text-xs ml-1 px-1.5 py-0">
                {stats?.pending}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: New Applications ─────────────────────────────────────── */}
        <TabsContent value="applications">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or company..."
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Card>
              <CardContent className="p-0">
                {appLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0d2b5e]" />
                  </div>
                ) : filteredApps.length === 0 ? (
                  <div className="text-center py-12">
                    <UserPlus className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No pending applications</p>
                    <p className="text-gray-400 text-sm mt-1">
                      New ECP/PDP applicants will appear here
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Partnership Type</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApps.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {app.first_name} {app.last_name}
                              </p>
                              <p className="text-gray-500 text-xs flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {app.email}
                              </p>
                              {app.company_name && (
                                <p className="text-gray-400 text-xs">{app.company_name}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {typeIcons[app.role]}
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 border text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {app.role === "ecp_pending" ? "ECP" : "PDP"} — Pending
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {app.country_code ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {format(new Date(app.created_at), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setAppAction("approve");
                                }}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setAppAction("reject");
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 2: Upgrade Requests ─────────────────────────────────────── */}
        <TabsContent value="upgrades">
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by company or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                {reqLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#0d2b5e]" />
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <ArrowUpCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No upgrade requests found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((req) => {
                        const statusCfg = statusConfig[req.status];
                        const StatusIcon = statusCfg.icon;
                        return (
                          <TableRow key={req.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">
                                  {req.partner?.company_name ?? req.partner_name ?? "—"}
                                </p>
                                <p className="text-gray-500 text-xs">
                                  {req.partner?.contact_email ?? req.partner_email ?? "—"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                {typeIcons[req.current_type]}
                                <span className="capitalize">
                                  {req.current_type === "dual_partner" ? "Dual" : req.current_type.toUpperCase()}
                                  {req.current_tier ? ` — ${req.current_tier}` : ""}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-sm font-medium text-[#0d2b5e]">
                                {typeIcons[req.requested_type]}
                                {req.requested_tier && tierIcons[req.requested_tier]}
                                <span className="capitalize">
                                  {req.requested_type === "dual_partner" ? "Dual" : req.requested_type.toUpperCase()}
                                  {req.requested_tier ? ` — ${req.requested_tier}` : ""}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {format(new Date(req.created_at), "dd MMM yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusCfg.color} border text-xs`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {req.status === "pending" ? (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                                    onClick={() => {
                                      setSelectedRequest(req);
                                      setActionType("approve");
                                    }}
                                  >
                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50 h-8 px-3"
                                    onClick={() => {
                                      setSelectedRequest(req);
                                      setActionType("reject");
                                    }}
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  {req.reviewed_at
                                    ? format(new Date(req.reviewed_at), "dd MMM yyyy")
                                    : "—"}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Confirm Dialog: New Application ─────────────────────────────────── */}
      <Dialog
        open={!!selectedApp && !!appAction}
        onOpenChange={() => {
          setSelectedApp(null);
          setAppAction(null);
          setAppNotes("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {appAction === "approve" ? "Approve Partnership Application" : "Reject Application"}
            </DialogTitle>
            <DialogDescription>
              {appAction === "approve" ? (
                <>
                  This will activate the{" "}
                  <strong>
                    {selectedApp?.role === "ecp_pending" ? "ECP" : "PDP"} Partnership
                  </strong>{" "}
                  for{" "}
                  <strong>
                    {selectedApp?.first_name} {selectedApp?.last_name}
                  </strong>{" "}
                  ({selectedApp?.email}).
                  A licence will be created and the applicant will be notified.
                </>
              ) : (
                <>
                  The application from{" "}
                  <strong>
                    {selectedApp?.first_name} {selectedApp?.last_name}
                  </strong>{" "}
                  will be rejected. Their account will be reverted to Individual.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="app-notes">
              Notes to applicant {appAction === "reject" ? "(recommended)" : "(optional)"}
            </Label>
            <Textarea
              id="app-notes"
              placeholder={
                appAction === "approve"
                  ? "Welcome message or onboarding instructions..."
                  : "Reason for rejection (will be sent to applicant)..."
              }
              value={appNotes}
              onChange={(e) => setAppNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedApp(null);
                setAppAction(null);
                setAppNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedApp && appAction && processApplication(selectedApp, appAction)}
              disabled={appProcessing}
              className={
                appAction === "approve"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {appProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {appAction === "approve" ? "Confirm & Activate" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Dialog: Upgrade Request ─────────────────────────────────── */}
      <Dialog
        open={!!selectedRequest && !!actionType}
        onOpenChange={() => {
          setSelectedRequest(null);
          setActionType(null);
          setAdminNotes("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Upgrade Request" : "Reject Upgrade Request"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" ? (
                <>
                  This will activate the{" "}
                  <strong>
                    {selectedRequest && formatPartnershipLabel(
                      selectedRequest.requested_type,
                      selectedRequest.requested_tier
                    )}
                  </strong>{" "}
                  partnership for{" "}
                  <strong>{selectedRequest?.partner?.company_name}</strong>.
                </>
              ) : (
                <>
                  The upgrade request from{" "}
                  <strong>{selectedRequest?.partner?.company_name}</strong> will be rejected.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest?.notes && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-1">Partner Notes:</p>
              <p>{selectedRequest.notes}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin-notes">
              Admin Notes {actionType === "reject" ? "(recommended)" : "(optional)"}
            </Label>
            <Textarea
              id="admin-notes"
              placeholder={
                actionType === "approve"
                  ? "Any notes for the partner..."
                  : "Reason for rejection (will be sent to partner)..."
              }
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setActionType(null);
                setAdminNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedRequest && actionType && processRequest(selectedRequest, actionType)}
              disabled={processing}
              className={
                actionType === "approve"
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === "approve" ? "Confirm & Activate" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
