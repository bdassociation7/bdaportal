/**
 * Admin — BDA Certified Instructor Management
 * Route: /admin/instructors
 *
 * Allows admins to:
 * - View all certified instructors (from all partners + independent)
 * - Grant certification to an existing trainer user
 * - Suspend / reactivate / revoke instructor certifications
 * - See Instructor ID, partner, status, expiry
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/config/supabase.config';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  Plus,
  Search,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  Send,
  ShieldOff,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthContext } from '@/app/providers/AuthProvider';

// ─── Types ────────────────────────────────────────────────────────────────────
interface InstructorCert {
  id: string;
  instructor_id: string;
  level: string;
  certified_at: string;
  expires_at: string;
  status: 'active' | 'suspended' | 'expired' | 'revoked';
  approved_programmes: string[];
  notes: string | null;
  partner_id: string | null;
  user_id: string | null;
  trainer_id: string | null;
  // joined
  partner_name?: string;
  user_email?: string;
  user_first_name?: string;
  user_last_name?: string;
}

interface TrainerUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; cls: string; icon: any }> = {
  active:    { label: 'Active',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
  suspended: { label: 'Suspended', cls: 'bg-amber-50 text-amber-700 border-amber-200',       icon: ShieldOff  },
  expired:   { label: 'Expired',   cls: 'bg-red-50 text-red-600 border-red-200',             icon: Clock      },
  revoked:   { label: 'Revoked',   cls: 'bg-gray-100 text-gray-500 border-gray-200',         icon: XCircle    },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function InstructorManagement() {
  const { user: currentUser } = useAuthContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [grantForm, setGrantForm] = useState({
    email: '',
    notes: '',
    approved_programmes: 'BDA Business Development Foundation,BDA-CP Preparation',
  });
  const [grantError, setGrantError] = useState<string | null>(null);
  const [grantLoading, setGrantLoading] = useState(false);

  // ── Fetch all instructor certifications ──────────────────────────────────
  const { data: certs = [], isLoading } = useQuery({
    queryKey: ['admin-instructor-certs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instructor_certifications')
        .select(`
          *,
          partners (company_name, contact_person),
          users!instructor_certifications_user_id_fkey (email, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        partner_name: row.partners?.company_name || row.partners?.contact_person || null,
        user_email: row.users?.email || null,
        user_first_name: row.users?.first_name || null,
        user_last_name: row.users?.last_name || null,
      })) as InstructorCert[];
    },
  });

  // ── Update status mutation ───────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('instructor_certifications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-instructor-certs'] }),
  });

  // ── Grant certification ──────────────────────────────────────────────────
  const handleGrantCert = async () => {
    setGrantError(null);
    setGrantLoading(true);
    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role')
        .eq('email', grantForm.email.trim().toLowerCase())
        .single();

      if (userError || !userData) {
        setGrantError('No user found with this email address.');
        return;
      }

      // Check if user has trainer role
      if (userData.role !== 'trainer') {
        setGrantError(`This user has role "${userData.role}". Please change their role to "BDA Certified Instructor" in User Management first.`);
        return;
      }

      // Check if already has active cert
      const { data: existing } = await supabase
        .from('instructor_certifications')
        .select('id, status')
        .eq('user_id', userData.id)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        setGrantError('This user already has an active instructor certification.');
        return;
      }

      // Grant certification
      const programmes = grantForm.approved_programmes
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);

      const { error: insertError } = await supabase
        .from('instructor_certifications')
        .insert({
          user_id: userData.id,
          approved_programmes: programmes,
          notes: grantForm.notes || null,
          created_by: currentUser?.id,
        });

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['admin-instructor-certs'] });
      setIsGrantOpen(false);
      setGrantForm({ email: '', notes: '', approved_programmes: 'BDA Business Development Foundation,BDA-CP Preparation' });
    } catch (err: any) {
      setGrantError(err.message || 'Failed to grant certification.');
    } finally {
      setGrantLoading(false);
    }
  };

  // ── Send invite to trainer ───────────────────────────────────────────────
  const handleSendInvite = async (cert: InstructorCert) => {
    if (!cert.user_id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Find trainer_id for this user
      const { data: trainerRow } = await supabase
        .from('ecp_trainers')
        .select('id')
        .eq('user_id', cert.user_id)
        .maybeSingle();

      if (!trainerRow) {
        alert('No trainer record found for this user. Please add them as a trainer under an ECP partner first.');
        return;
      }

      await fetch('/api/trainers/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ trainer_id: trainerRow.id }),
      });
      alert(`Invite sent to ${cert.user_email}`);
    } catch (err) {
      alert('Failed to send invite.');
    }
  };

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = certs.filter(c => {
    const matchSearch =
      !search ||
      c.instructor_id.toLowerCase().includes(search.toLowerCase()) ||
      (c.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.user_first_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.user_last_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.partner_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">BDA Certified Instructors</h1>
              <p className="mt-1 opacity-80 text-sm">
                Manage instructor certifications — grant, suspend, revoke, and track renewal
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsGrantOpen(true)}
            className="bg-white text-[#0d1f4e] hover:bg-blue-50 font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Grant Certification
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['active', 'suspended', 'expired', 'revoked'] as const).map(s => {
          const count = certs.filter(c => c.status === s).length;
          const { label, cls, icon: Icon } = STATUS_BADGE[s];
          return (
            <Card key={s} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(s)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cls}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0d1f4e]">{count}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, Instructor ID, or partner..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Instructor Certifications</CardTitle>
          <CardDescription>{filtered.length} instructor{filtered.length !== 1 ? 's' : ''} found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#0f91e0]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No instructor certifications found</p>
              <p className="text-sm mt-1">Grant a certification to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Instructor ID</TableHead>
                  <TableHead>Partner Organisation</TableHead>
                  <TableHead>Certified</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(cert => {
                  const { label, cls, icon: StatusIcon } = STATUS_BADGE[cert.status] || STATUS_BADGE.revoked;
                  const fullName = [cert.user_first_name, cert.user_last_name].filter(Boolean).join(' ') || '—';
                  return (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#0d1f4e]">{fullName}</p>
                          <p className="text-xs text-slate-400">{cert.user_email || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-[#f0f6ff] text-[#1C4A8B] px-2 py-1 rounded font-mono">
                          {cert.instructor_id}
                        </code>
                      </TableCell>
                      <TableCell>
                        {cert.partner_name ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {cert.partner_name}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Independent (BDA Direct)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(cert.certified_at)}</TableCell>
                      <TableCell className="text-sm">{formatDate(cert.expires_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${cls} text-xs`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {cert.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => updateStatus.mutate({ id: cert.id, status: 'suspended' })}
                                className="text-amber-600"
                              >
                                <ShieldOff className="w-4 h-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            )}
                            {cert.status === 'suspended' && (
                              <DropdownMenuItem
                                onClick={() => updateStatus.mutate({ id: cert.id, status: 'active' })}
                                className="text-emerald-600"
                              >
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                            {cert.status !== 'revoked' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => updateStatus.mutate({ id: cert.id, status: 'revoked' })}
                                  className="text-red-600"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Revoke Certification
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleSendInvite(cert)}>
                              <Send className="w-4 h-4 mr-2" />
                              Resend Portal Invite
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Grant Certification Dialog */}
      <Dialog open={isGrantOpen} onOpenChange={setIsGrantOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#0f91e0]" />
              Grant Instructor Certification
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-[#f0f6ff] border border-[#dbeafe] rounded-xl p-3 text-xs text-[#1C4A8B]">
              The user must already have the role <strong>BDA Certified Instructor</strong> in User Management before granting a certification.
            </div>

            <div className="space-y-2">
              <Label>User Email <span className="text-red-500">*</span></Label>
              <Input
                placeholder="instructor@example.com"
                value={grantForm.email}
                onChange={e => setGrantForm({ ...grantForm, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Approved Programmes</Label>
              <Input
                placeholder="Programme 1, Programme 2"
                value={grantForm.approved_programmes}
                onChange={e => setGrantForm({ ...grantForm, approved_programmes: e.target.value })}
              />
              <p className="text-xs text-slate-400">Comma-separated list of programmes this instructor is authorised to deliver.</p>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Internal notes..."
                value={grantForm.notes}
                onChange={e => setGrantForm({ ...grantForm, notes: e.target.value })}
              />
            </div>

            {grantError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                {grantError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGrantOpen(false)}>Cancel</Button>
            <Button
              onClick={handleGrantCert}
              disabled={grantLoading || !grantForm.email}
              style={{ background: 'linear-gradient(135deg, #0f91e0 0%, #0d1f4e 100%)' }}
              className="text-white"
            >
              {grantLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Granting...</> : 'Grant Certification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
