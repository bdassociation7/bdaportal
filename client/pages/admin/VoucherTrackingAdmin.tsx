/**
 * Voucher Tracking Admin Page
 * Rewritten to use direct Supabase queries instead of complex RPC
 */
import { useState, useEffect } from 'react';
import {
  Ticket, AlertTriangle, CheckCircle, Clock, Calendar,
  RefreshCw, Search, Mail, Globe, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/shared/config/supabase.config';
import { cn } from '@/shared/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────
interface VoucherRow {
  id: string;
  code: string;
  status: string;
  certification_type: string;
  exam_language: string;
  expires_at: string;
  created_at: string;
  user_id: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  user_country_code: string;
  booking_id?: string;
  booking_status?: string;
  scheduled_date?: string;
  reminders_sent: number;
  last_reminder_type?: string;
  last_reminder_at?: string;
  next_window_name?: string;
  next_window_start?: string;
  next_window_end?: string;
}

interface ExamWindow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function statusColor(status: string) {
  switch (status) {
    case 'available': return 'bg-green-100 text-green-800';
    case 'assigned':  return 'bg-blue-100 text-blue-800';
    case 'used':      return 'bg-gray-100 text-gray-600';
    case 'expired':   return 'bg-red-100 text-red-700';
    default:          return 'bg-gray-100 text-gray-600';
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VoucherTrackingAdmin() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [vouchers, setVouchers]           = useState<VoucherRow[]>([]);
  const [windows, setWindows]             = useState<ExamWindow[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [certFilter, setCertFilter]       = useState('all');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [sortField, setSortField]         = useState<string>('expires_at');
  const [sortAsc, setSortAsc]             = useState(true);

  // ── Fetch all data directly ──────────────────────────────────────────────
  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch vouchers with user info via join
      const { data: voucherData, error: vErr } = await supabase
        .from('exam_vouchers')
        .select(`
          id, code, status, certification_type, exam_language,
          expires_at, created_at, user_id,
          users!exam_vouchers_user_id_fkey(email, first_name, last_name, country_code)
        `)
        .order('created_at', { ascending: false });

      if (vErr) throw new Error(`Vouchers error: ${vErr.message}`);
      if (!voucherData || voucherData.length === 0) {
        setVouchers([]);
        setLoading(false);
        return;
      }

      // 2. Fetch exam windows
      const { data: windowData } = await supabase
        .from('certification_exam_windows')
        .select('id, name, start_date, end_date, is_active')
        .eq('is_active', true)
        .order('start_date', { ascending: true });

      // 3. Fetch bookings for these vouchers
      const voucherIds = voucherData.map((v: any) => v.id);
      const bookingMap: Record<string, any> = {};

      const { data: bookingData } = await supabase
        .from('exam_bookings')
        .select('id, voucher_id, status, scheduled_start_time')
        .in('voucher_id', voucherIds)
        .not('status', 'in', '("cancelled","no_show")')
        .order('scheduled_start_time', { ascending: false });

      (bookingData || []).forEach((b: any) => {
        if (!bookingMap[b.voucher_id]) bookingMap[b.voucher_id] = b;
      });

      // 4. Fetch reminder logs
      const reminderMap: Record<string, { count: number; last_type?: string; last_sent?: string }> = {};

      const { data: reminderData } = await supabase
        .from('voucher_reminder_logs')
        .select('voucher_id, reminder_type, sent_at')
        .in('voucher_id', voucherIds)
        .order('sent_at', { ascending: false });

      (reminderData || []).forEach((r: any) => {
        if (!reminderMap[r.voucher_id]) {
          reminderMap[r.voucher_id] = { count: 0 };
        }
        reminderMap[r.voucher_id].count++;
        if (!reminderMap[r.voucher_id].last_type) {
          reminderMap[r.voucher_id].last_type = r.reminder_type;
          reminderMap[r.voucher_id].last_sent = r.sent_at;
        }
      });

      // 5. Find next upcoming window
      const today = new Date().toISOString().split('T')[0];
      const nextWindow = (windowData || []).find((w: any) => w.start_date > today);

      // 6. Combine all data
      const rows: VoucherRow[] = voucherData.map((v: any) => {
        const user = v.users;
        const booking = bookingMap[v.id];
        const reminder = reminderMap[v.id] || { count: 0 };
        return {
          id: v.id,
          code: v.code,
          status: v.status,
          certification_type: v.certification_type,
          exam_language: v.exam_language || '',
          expires_at: v.expires_at,
          created_at: v.created_at,
          user_id: v.user_id,
          user_email: user?.email || '',
          user_first_name: user?.first_name || '',
          user_last_name: user?.last_name || '',
          user_country_code: user?.country_code || '',
          booking_id: booking?.id,
          booking_status: booking?.status,
          scheduled_date: booking?.scheduled_start_time,
          reminders_sent: reminder.count,
          last_reminder_type: reminder.last_type,
          last_reminder_at: reminder.last_sent,
          next_window_name: nextWindow?.name,
          next_window_start: nextWindow?.start_date,
          next_window_end: nextWindow?.end_date,
        };
      });

      setVouchers(rows);
      setWindows(windowData || []);
    } catch (err: any) {
      console.error('Voucher tracking error:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // ── Filter & Sort ────────────────────────────────────────────────────────
  const filtered = vouchers.filter(v => {
    const matchSearch = !search.trim() || [
      v.user_email, v.user_first_name, v.user_last_name, v.code,
    ].some(s => s.toLowerCase().includes(search.toLowerCase()));

    const matchCert    = certFilter   === 'all' || v.certification_type === certFilter;
    const matchStatus  = statusFilter === 'all' || v.status === statusFilter;
    const matchCountry = countryFilter === 'all' || v.user_country_code === countryFilter;

    return matchSearch && matchCert && matchStatus && matchCountry;
  }).sort((a, b) => {
    const av: any = (a as any)[sortField] ?? '';
    const bv: any = (b as any)[sortField] ?? '';
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = {
    total:     vouchers.length,
    available: vouchers.filter(v => v.status === 'available').length,
    assigned:  vouchers.filter(v => v.status === 'assigned').length,
    used:      vouchers.filter(v => v.status === 'used').length,
    expired:   vouchers.filter(v => v.status === 'expired').length,
    urgent:    vouchers.filter(v => {
      const days = daysUntil(v.expires_at);
      return (v.status === 'available' || v.status === 'assigned') && days !== null && days <= 30;
    }).length,
  };

  // ── Unique countries for filter ──────────────────────────────────────────
  const countries = Array.from(
    new Set(vouchers.map(v => v.user_country_code).filter(Boolean))
  ).sort() as string[];

  // ── Sort toggle ──────────────────────────────────────────────────────────
  function toggleSort(field: string) {
    if (sortField === field) setSortAsc(p => !p);
    else { setSortField(field); setSortAsc(true); }
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return null;
    return sortAsc
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : <ChevronDown className="w-3 h-3 inline ml-1" />;
  }

  // ── Next window info ─────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const nextWindow = windows.find(w => w.start_date > today);
  const daysToNext = nextWindow ? daysUntil(nextWindow.start_date) : null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="w-7 h-7 text-blue-600" />
            Voucher Reminders
          </h1>
          <p className="text-sm text-gray-500 mt-1">Monitor all exam vouchers and candidate status</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex items-center gap-2">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <strong>Error loading data:</strong> {error}
            <Button variant="link" size="sm" className="ml-2 text-red-600 p-0 h-auto" onClick={fetchData}>
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* Next Window Banner */}
      {nextWindow && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <span className="font-medium text-blue-800">Next Exam Window: </span>
            <span className="text-blue-700">{nextWindow.name}</span>
            <span className="text-blue-600 text-sm ml-2">
              ({formatDate(nextWindow.start_date)} – {formatDate(nextWindow.end_date)})
            </span>
            {daysToNext !== null && (
              <Badge className="ml-2 bg-blue-100 text-blue-800 border-0">
                {daysToNext > 0 ? `in ${daysToNext} days` : 'Open now'}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total',        value: stats.total,     color: 'text-gray-900',   icon: Ticket },
          { label: 'Available',    value: stats.available, color: 'text-green-700',  icon: CheckCircle },
          { label: 'Assigned',     value: stats.assigned,  color: 'text-blue-700',   icon: Clock },
          { label: 'Used',         value: stats.used,      color: 'text-gray-500',   icon: CheckCircle },
          { label: 'Expired',      value: stats.expired,   color: 'text-red-600',    icon: XCircle },
          { label: 'Expiring ≤30d', value: stats.urgent,   color: 'text-orange-600', icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className={cn(stats.urgent > 0 && label === 'Expiring ≤30d' ? 'border-orange-300' : '')}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className={cn('text-2xl font-bold', color)}>{loading ? '—' : value}</div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email or code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={certFilter} onValueChange={setCertFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CP">CP</SelectItem>
                <SelectItem value="SCP">SCP</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || certFilter !== 'all' || statusFilter !== 'all' || countryFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => {
                setSearch(''); setCertFilter('all'); setStatusFilter('all'); setCountryFilter('all');
              }}>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {loading ? 'Loading...' : `${filtered.length} voucher${filtered.length !== 1 ? 's' : ''}`}
            {!loading && filtered.length !== vouchers.length && ` (filtered from ${vouchers.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mr-3" />
              <span>Loading vouchers...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
              <Ticket className="w-10 h-10" />
              <span className="text-sm">No vouchers match the current filters</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th
                      className="px-4 py-3 text-left font-medium cursor-pointer hover:text-gray-700"
                      onClick={() => toggleSort('user_email')}
                    >
                      Candidate <SortIcon field="user_email" />
                    </th>
                    <th
                      className="px-4 py-3 text-left font-medium cursor-pointer hover:text-gray-700"
                      onClick={() => toggleSort('code')}
                    >
                      Voucher Code <SortIcon field="code" />
                    </th>
                    <th
                      className="px-4 py-3 text-left font-medium cursor-pointer hover:text-gray-700"
                      onClick={() => toggleSort('certification_type')}
                    >
                      Type <SortIcon field="certification_type" />
                    </th>
                    <th
                      className="px-4 py-3 text-left font-medium cursor-pointer hover:text-gray-700"
                      onClick={() => toggleSort('status')}
                    >
                      Status <SortIcon field="status" />
                    </th>
                    <th
                      className="px-4 py-3 text-left font-medium cursor-pointer hover:text-gray-700"
                      onClick={() => toggleSort('expires_at')}
                    >
                      Expires <SortIcon field="expires_at" />
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Booking</th>
                    <th className="px-4 py-3 text-left font-medium">Next Window</th>
                    <th
                      className="px-4 py-3 text-left font-medium cursor-pointer hover:text-gray-700"
                      onClick={() => toggleSort('reminders_sent')}
                    >
                      Reminders <SortIcon field="reminders_sent" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(v => {
                    const daysExp = daysUntil(v.expires_at);
                    const isUrgent = (v.status === 'available' || v.status === 'assigned') && daysExp !== null && daysExp <= 30;
                    return (
                      <tr
                        key={v.id}
                        className={cn('hover:bg-gray-50 transition-colors', isUrgent && 'bg-orange-50/30')}
                      >
                        {/* Candidate */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {v.user_first_name} {v.user_last_name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {v.user_email}
                          </div>
                          {v.user_country_code && (
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Globe className="w-3 h-3" />
                              {v.user_country_code}
                            </div>
                          )}
                        </td>
                        {/* Voucher Code */}
                        <td className="px-4 py-3">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{v.code}</code>
                          <div className="text-xs text-gray-400 mt-1">{v.exam_language?.toUpperCase()}</div>
                        </td>
                        {/* Type */}
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs font-semibold">
                            {v.certification_type}
                          </Badge>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', statusColor(v.status))}>
                            {v.status}
                          </span>
                        </td>
                        {/* Expires */}
                        <td className="px-4 py-3">
                          <div className={cn('text-sm', isUrgent ? 'text-orange-600 font-medium' : 'text-gray-700')}>
                            {formatDate(v.expires_at)}
                          </div>
                          {daysExp !== null && v.status !== 'used' && v.status !== 'expired' && (
                            <div className={cn('text-xs mt-0.5', daysExp <= 30 ? 'text-orange-500' : 'text-gray-400')}>
                              {daysExp > 0 ? `${daysExp}d left` : 'Expired'}
                            </div>
                          )}
                        </td>
                        {/* Booking */}
                        <td className="px-4 py-3">
                          {v.booking_id ? (
                            <div>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                {v.booking_status}
                              </span>
                              {v.scheduled_date && (
                                <div className="text-xs text-gray-500 mt-1">{formatDate(v.scheduled_date)}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No booking</span>
                          )}
                        </td>
                        {/* Next Window */}
                        <td className="px-4 py-3">
                          {v.next_window_name ? (
                            <div>
                              <div className="text-xs font-medium text-gray-700">{v.next_window_name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {formatDate(v.next_window_start)} – {formatDate(v.next_window_end)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        {/* Reminders */}
                        <td className="px-4 py-3">
                          {v.reminders_sent > 0 ? (
                            <div>
                              <span className="text-sm font-medium text-gray-700">{v.reminders_sent}</span>
                              {v.last_reminder_type && (
                                <div className="text-xs text-gray-400 mt-0.5">Last: {v.last_reminder_type}</div>
                              )}
                              {v.last_reminder_at && (
                                <div className="text-xs text-gray-400">{formatDate(v.last_reminder_at)}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">None sent</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Schedule Info */}
      <Card className="bg-gray-50">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Reminder Schedule</p>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span><span className="w-2 h-2 rounded-full bg-blue-500 inline-block mr-1.5" />Window Open — sent on the day the exam window opens</span>
            <span><span className="w-2 h-2 rounded-full bg-blue-500 inline-block mr-1.5" />Day 5 — sent 5 days after window opens</span>
            <span><span className="w-2 h-2 rounded-full bg-blue-500 inline-block mr-1.5" />3 Days Left — sent when 3 days remain in window</span>
            <span><span className="w-2 h-2 rounded-full bg-blue-500 inline-block mr-1.5" />Last Day — sent 1 day before window closes</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Reminders run automatically every day at 09:00 UTC via pg_cron. Only candidates with unused vouchers and no active booking receive reminders. Each reminder is sent at most once per voucher per window.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
