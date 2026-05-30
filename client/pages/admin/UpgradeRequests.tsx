/**
 * UpgradeRequests.tsx
 *
 * Admin page to manage partner upgrade requests.
 * Allows admin to approve (activate upgrade) or reject requests.
 */

import { useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Layers, Crown, Zap, Star,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpgradeRequest {
  id: string;
  partner_id: string;
  current_type: string;
  current_tier: string | null;
  requested_type: string;
  requested_tier: string;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  partner?: {
    company_name: string;
    contact_email: string;
    country: string;
  };
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
  pdp: <Building2 className="h-4 w-4 text-[#0d2b5e]" />,
  dual_partner: <Layers className="h-4 w-4 text-[#0d2b5e]" />,
};

function formatPartnershipLabel(type: string, tier: string) {
  const typeLabel = type === "dual_partner" ? "Dual Partner" : type.toUpperCase();
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  return `${typeLabel} — ${tierLabel}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UpgradeRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // ── Fetch requests ─────────────────────────────────────────────────────────
  const { data: requests = [], isLoading, refetch } = useQuery<UpgradeRequest[]>({
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

  // ── Process request ────────────────────────────────────────────────────────
  const processRequest = async (request: UpgradeRequest, action: "approve" | "reject") => {
    setProcessing(true);
    try {
      if (action === "approve") {
        // Call activate_partnership function
        const { error: activateError } = await supabase.rpc("activate_partnership", {
          p_user_id: request.partner_id,
          p_product_id: null,
          p_order_id: `ADMIN-UPGRADE-${request.id}`,
          p_partner_type: request.requested_type === "dual_partner"
            ? (request.current_type === "ecp" ? "pdp" : "ecp")
            : request.requested_type,
          p_tier: request.requested_tier,
        });

        if (activateError) throw activateError;
      }

      // Update request status
      const { error: updateError } = await supabase
        .from("upgrade_requests")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          admin_notes: adminNotes.trim() || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      // Send notification email to partner
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            to: request.partner?.contact_email,
            subject: action === "approve"
              ? "Your Partnership Upgrade Has Been Activated — BDA"
              : "Update on Your Partnership Upgrade Request — BDA",
            html: action === "approve"
              ? `<p>Dear Partner,</p>
                 <p>We are pleased to inform you that your upgrade to <strong>${formatPartnershipLabel(request.requested_type, request.requested_tier)}</strong> has been activated.</p>
                 <p>Please log in to your portal to access your new features.</p>
                 <p>Best regards,<br/>BDA Team</p>`
              : `<p>Dear Partner,</p>
                 <p>Thank you for your upgrade request. After review, we are unable to process your request at this time.</p>
                 ${adminNotes ? `<p><strong>Note from BDA team:</strong> ${adminNotes}</p>` : ""}
                 <p>Please contact us at <a href="mailto:support@bda-global.org">support@bda-global.org</a> for more information.</p>
                 <p>Best regards,<br/>BDA Team</p>`,
          }),
        }).catch(() => {}); // Don't fail if email fails
      }

      toast({
        title: action === "approve" ? "Upgrade Activated" : "Request Rejected",
        description: action === "approve"
          ? `Partnership upgraded to ${formatPartnershipLabel(request.requested_type, request.requested_tier)} successfully.`
          : "The upgrade request has been rejected and the partner has been notified.",
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

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.partner?.company_name?.toLowerCase().includes(q) ||
      r.partner?.contact_email?.toLowerCase().includes(q) ||
      r.requested_type.toLowerCase().includes(q)
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
            <h1 className="text-2xl font-bold text-gray-900">Upgrade Requests</h1>
            <p className="text-gray-500 text-sm">Manage partner partnership upgrade requests</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => refetch()} size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Requests", value: stats?.total ?? 0, color: "text-gray-700" },
          { label: "Pending", value: stats?.pending ?? 0, color: "text-amber-600" },
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

      {/* Filters */}
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#0d2b5e]" />
            </div>
          ) : filtered.length === 0 ? (
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
                {filtered.map((req) => {
                  const statusCfg = statusConfig[req.status];
                  const StatusIcon = statusCfg.icon;
                  return (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {req.partner?.company_name ?? "—"}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {req.partner?.contact_email ?? "—"}
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
                          {tierIcons[req.requested_tier]}
                          <span className="capitalize">
                            {req.requested_type === "dual_partner" ? "Dual" : req.requested_type.toUpperCase()}
                            {" — "}{req.requested_tier}
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
                            {req.processed_at
                              ? format(new Date(req.processed_at), "dd MMM yyyy")
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

      {/* Confirm Dialog */}
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
                  The partner will be notified via email.
                </>
              ) : (
                <>
                  The upgrade request from{" "}
                  <strong>{selectedRequest?.partner?.company_name}</strong> will be rejected.
                  The partner will be notified via email.
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
