/**
 * UpgradePartnership.tsx
 *
 * Shared upgrade page for ECP and PDP partners.
 * Shows upgrade options based on current partnership type/tier.
 * Submits a request to the admin via notify-upgrade-request edge function.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle, ArrowUpCircle, Layers, Loader2,
  Star, Zap, Crown, Shield, Clock, AlertTriangle,
} from "lucide-react";
import { useAuthContext } from "@/app/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpgradeOption {
  id: string;
  type: "ecp" | "pdp" | "dual_partner";
  tier: string;
  label: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  highlight?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCurrentTierFromLicense(
  partnerType: string,
  ecpLicense: { tier?: string } | null,
  pdpLicense: { max_programs?: number } | null
): string | null {
  if (partnerType === "ecp" || partnerType === "dual_partner") {
    return ecpLicense?.tier ?? "standard";
  }
  if (partnerType === "pdp") {
    const mp = pdpLicense?.max_programs ?? 5;
    return mp <= 5 ? "standard" : mp <= 8 ? "advanced" : "premium";
  }
  return null;
}

function getUpgradeOptions(
  partnerType: string,
  currentTier: string | null
): UpgradeOption[] {
  const options: UpgradeOption[] = [];

  // ── ECP upgrades ──────────────────────────────────────────────────────────
  if (partnerType === "ecp" || partnerType === "dual_partner") {
    if (currentTier === "standard") {
      options.push({
        id: "ecp-advanced",
        type: "ecp",
        tier: "advanced",
        label: "ECP Advanced",
        description: "Upgrade your ECP partnership to the Advanced tier for expanded exam delivery capabilities.",
        features: [
          "All ECP Standard features",
          "Priority exam scheduling",
          "Dedicated account manager",
          "Advanced reporting & analytics",
          "Marketing co-branding materials",
        ],
        icon: <Crown className="h-6 w-6 text-amber-500" />,
        highlight: true,
      });
    }
  }

  // ── PDP upgrades ──────────────────────────────────────────────────────────
  if (partnerType === "pdp" || partnerType === "dual_partner") {
    if (currentTier === "standard") {
      options.push({
        id: "pdp-advanced",
        type: "pdp",
        tier: "advanced",
        label: "PDP Advanced",
        description: "Increase your program capacity from 5 to 8 approved programs.",
        features: [
          "Up to 8 approved programs",
          "All PDP Standard features",
          "Priority review queue",
        ],
        icon: <Zap className="h-6 w-6 text-blue-500" />,
      });
      options.push({
        id: "pdp-premium",
        type: "pdp",
        tier: "premium",
        label: "PDP Premium",
        description: "Maximum capacity — up to 12 approved programs for high-volume training providers.",
        features: [
          "Up to 12 approved programs",
          "All PDP Advanced features",
          "Dedicated support channel",
          "Annual performance review",
        ],
        icon: <Crown className="h-6 w-6 text-purple-500" />,
        highlight: true,
      });
    }
    if (currentTier === "advanced") {
      options.push({
        id: "pdp-premium",
        type: "pdp",
        tier: "premium",
        label: "PDP Premium",
        description: "Upgrade from 8 to 12 approved programs.",
        features: [
          "Up to 12 approved programs",
          "All PDP Advanced features",
          "Dedicated support channel",
          "Annual performance review",
        ],
        icon: <Crown className="h-6 w-6 text-purple-500" />,
        highlight: true,
      });
    }
  }

  // ── Add second partnership ─────────────────────────────────────────────────
  if (partnerType === "ecp") {
    options.push({
      id: "add-pdp-standard",
      type: "dual_partner",
      tier: "standard",
      label: "Add PDP Standard Partnership",
      description: "Expand your offering by becoming a Professional Development Partner — submit up to 5 CPD programs.",
      features: [
        "Up to 5 approved CPD programs",
        "Workspace Switcher (ECP ↔ PDP)",
        "Unified partner account",
        "PDP portal access",
      ],
      icon: <Layers className="h-6 w-6 text-[#0d2b5e]" />,
    });
    options.push({
      id: "add-pdp-advanced",
      type: "dual_partner",
      tier: "advanced",
      label: "Add PDP Advanced Partnership",
      description: "Become a PDP partner with capacity for up to 8 CPD programs.",
      features: [
        "Up to 8 approved CPD programs",
        "Workspace Switcher (ECP ↔ PDP)",
        "Unified partner account",
        "Priority review queue",
      ],
      icon: <Layers className="h-6 w-6 text-[#0d2b5e]" />,
      highlight: true,
    });
    options.push({
      id: "add-pdp-premium",
      type: "dual_partner",
      tier: "premium",
      label: "Add PDP Premium Partnership",
      description: "Maximum PDP capacity — up to 12 CPD programs alongside your ECP partnership.",
      features: [
        "Up to 12 approved CPD programs",
        "Workspace Switcher (ECP ↔ PDP)",
        "Unified partner account",
        "Dedicated support channel",
      ],
      icon: <Layers className="h-6 w-6 text-[#0d2b5e]" />,
    });
  }

  if (partnerType === "pdp") {
    options.push({
      id: "add-ecp-standard",
      type: "dual_partner",
      tier: "standard",
      label: "Add ECP Standard Partnership",
      description: "Expand into exam delivery by becoming an Exam Centre Partner (Standard tier).",
      features: [
        "Authorised exam delivery centre",
        "Workspace Switcher (PDP ↔ ECP)",
        "Unified partner account",
        "ECP portal access",
      ],
      icon: <Shield className="h-6 w-6 text-[#0d2b5e]" />,
    });
    options.push({
      id: "add-ecp-advanced",
      type: "dual_partner",
      tier: "advanced",
      label: "Add ECP Advanced Partnership",
      description: "Become an ECP Advanced partner with expanded exam delivery capabilities.",
      features: [
        "All ECP Standard features",
        "Priority exam scheduling",
        "Dedicated account manager",
        "Workspace Switcher (PDP ↔ ECP)",
      ],
      icon: <Shield className="h-6 w-6 text-[#0d2b5e]" />,
      highlight: true,
    });
  }

  return options;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UpgradePartnership() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedOption, setSelectedOption] = useState<UpgradeOption | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch current licenses
  const { data: ecpLicense } = useQuery({
    queryKey: ["ecp-license-upgrade", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ecp_licenses")
        .select("tier, status, max_programs")
        .eq("partner_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: pdpLicense } = useQuery({
    queryKey: ["pdp-license-upgrade", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pdp_licenses")
        .select("max_programs, status")
        .eq("partner_id", user!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Check for existing pending request
  const { data: pendingRequest } = useQuery({
    queryKey: ["pending-upgrade-request", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("upgrade_requests")
        .select("id, requested_type, requested_tier, created_at")
        .eq("partner_id", user!.id)
        .eq("status", "pending")
        .limit(1)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const partnerType = user?.profile?.role ?? "ecp";
  const currentTier = getCurrentTierFromLicense(partnerType, ecpLicense ?? null, pdpLicense ?? null);
  const options = getUpgradeOptions(partnerType, currentTier);

  const handleSubmit = async () => {
    if (!selectedOption || !user) return;
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/notify-upgrade-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          requested_type: selectedOption.type,
          requested_tier: selectedOption.tier,
          notes: notes.trim() || null,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to submit request");

      setSubmitted(true);
      setConfirmOpen(false);
      toast({
        title: "Request Submitted",
        description: "Your upgrade request has been sent to the BDA team. You will be notified within 1–2 business days.",
      });
    } catch (err) {
      toast({
        title: "Submission Failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Request Submitted Successfully</h2>
          <p className="text-gray-600 mb-2">
            Your upgrade request has been received by the BDA team.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            A confirmation email has been sent to your registered email address.
            Our team will review your request and contact you within <strong>1–2 business days</strong>.
          </p>
          <Button
            onClick={() => navigate(-1)}
            className="bg-[#0d2b5e] hover:bg-[#1a3a7a] text-white"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#0d2b5e] rounded-lg flex items-center justify-center">
            <ArrowUpCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Upgrade Partnership</h1>
            <p className="text-gray-500 text-sm">
              Expand your BDA partnership capabilities
            </p>
          </div>
        </div>
      </div>

      {/* Current status */}
      <Card className="border-[#0d2b5e]/20 bg-[#0d2b5e]/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[#0d2b5e]" />
            <div>
              <p className="text-sm font-medium text-[#0d2b5e]">Current Partnership</p>
              <p className="text-gray-600 text-sm capitalize">
                {partnerType === "ecp" && `ECP – ${currentTier ?? "Standard"}`}
                {partnerType === "pdp" && `PDP – ${currentTier ?? "Standard"} (${pdpLicense?.max_programs ?? 5} programs)`}
                {partnerType === "dual_partner" && "ECP + PDP (Dual Partnership)"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending request warning */}
      {pendingRequest && (
        <Alert className="border-amber-200 bg-amber-50">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            You have a pending upgrade request submitted on{" "}
            {new Date(pendingRequest.created_at).toLocaleDateString()}.
            Please wait for the BDA team to review it before submitting a new one.
          </AlertDescription>
        </Alert>
      )}

      {/* No options */}
      {options.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              You are on the highest tier
            </h3>
            <p className="text-gray-500">
              No further upgrades are available for your current partnership type.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upgrade options */}
      {options.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {options.map((option) => (
            <Card
              key={option.id}
              className={`relative cursor-pointer transition-all border-2 ${
                selectedOption?.id === option.id
                  ? "border-[#0d2b5e] shadow-lg"
                  : option.highlight
                  ? "border-[#0d2b5e]/30 shadow-md"
                  : "border-gray-200 hover:border-[#0d2b5e]/40"
              }`}
              onClick={() => !pendingRequest && setSelectedOption(option)}
            >
              {option.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#0d2b5e] text-white text-xs px-3">
                    Recommended
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    {option.icon}
                  </div>
                  {selectedOption?.id === option.id && (
                    <CheckCircle className="h-5 w-5 text-[#0d2b5e] ml-auto" />
                  )}
                </div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  {option.label}
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  {option.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2">
                  {option.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submit button */}
      {options.length > 0 && (
        <div className="flex justify-end">
          <Button
            disabled={!selectedOption || !!pendingRequest}
            onClick={() => setConfirmOpen(true)}
            className="bg-[#0d2b5e] hover:bg-[#1a3a7a] text-white px-8"
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Request Upgrade
          </Button>
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Upgrade Request</DialogTitle>
            <DialogDescription>
              You are requesting to upgrade to <strong>{selectedOption?.label}</strong>.
              The BDA team will review your request and contact you within 1–2 business days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information for the BDA team..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#0d2b5e] hover:bg-[#1a3a7a] text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
