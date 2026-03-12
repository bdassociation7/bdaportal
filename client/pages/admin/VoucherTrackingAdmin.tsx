/**
 * Voucher Tracking Admin Page
 *
 * Shows candidates with unused vouchers during open exam windows,
 * reminder history, and scheduling status.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Ticket,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  RefreshCw,
  Filter,
  Search,
  Mail,
  Bell,
  BellOff,
  Globe,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/shared/config/supabase.config';
import { cn } from '@/shared/utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoucherRow {
  voucher_id: string;
  voucher_code: string;
  certification_type: string;
  exam_language: string | null;
  user_id: string;
  user_email: string;
  user_first_name: string | null;
  user_last_name: string | null;
  user_country_code: string | null;
  voucher_status: string;
  expires_at: string;
  booking_id: string | null;
  booking_status: string | null;
  scheduled_date: string | null;
  window_id: string | null;
  window_name: string | null;
  window_start: string | null;
  window_end: string | null;
  reminders_sent: number;
  last_reminder_type: string | null;
  last_reminder_at: string | null;
}

type TrackingFilter = 'all' | 'unused_no_booking' | 'scheduled' | 'used' | 'expired';

const REMINDER_ORDER = ['window_open', 'day_5', 'day_minus_3', 'day_minus_1'];
const REMINDER_LABELS: Record<string, string> = {
  window_open: 'Window Open',
  day_5: 'Day 5',
  day_minus_3: '3 Days Left',
  day_minus_1: 'Last Day',
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function useVoucherTracking(
  certType: string,
  countryCode: string,
  status: string,
) {
  return useQuery({
    queryKey: ['voucher-tracking', certType, countryCode, status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_voucher_tracking_data', {
        p_cert_type:    certType   === 'all' ? null : certType,
        p_country_code: countryCode === 'all' ? null : countryCode,
        p_status:       status     === 'all' ? null : status,
      });
      if (error) throw error;
      return (data as VoucherRow[]) ?? [];
    },
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(d: string | null) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
  return diff;
}

function ReminderDots({ sent, last }: { sent: number; last: string | null }) {
  const lastIdx = last ? REMINDER_ORDER.indexOf(last) : -1;
  return (
    <div className="flex gap-1 items-center">
      {REMINDER_ORDER.map((type, i) => (
        <span
          key={type}
          title={REMINDER_LABELS[type]}
          className={cn(
            'w-2.5 h-2.5 rounded-full border',
            i <= lastIdx
              ? 'bg-blue-500 border-blue-600'
              : 'bg-gray-200 border-gray-300',
          )}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{sent}/4</span>
    </div>
  );
}

function StatusBadge({ row }: { row: VoucherRow }) {
  if (row.voucher_status === 'used') {
    return <Badge className="bg-green-100 text-green-700 border-green-300">Used</Badge>;
  }
  if (row.voucher_status === 'expired' || (row.expires_at && new Date(row.expires_at) < new Date())) {
    return <Badge className="bg-gray-100 text-gray-500 border-gray-300">Expired</Badge>;
  }
  if (row.booking_id) {
    return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Scheduled</Badge>;
  }
  if (row.window_id) {
    const days = daysUntil(row.window_end);
    if (days !== null && days <= 3) {
      return <Badge className="bg-red-100 text-red-700 border-red-300">Urgent — {days}d left</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-700 border-amber-300">Window Open</Badge>;
  }
  return <Badge className="bg-gray-100 text-gray-600 border-gray-300">No Window</Badge>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VoucherTrackingAdmin() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [certType,    setCertType]    = useState('all');
  const [countryCode, setCountryCode] = useState('all');
  const [status,      setStatus]      = useState<TrackingFilter>('all');
  const [search,      setSearch]      = useState('');

  const { data = [], isLoading, refetch, isFetching } = useVoucherTracking(certType, countryCode, status);

  // Filter by search client-side
  const filtered = search.trim()
    ? data.filter(r =>
        r.user_email.toLowerCase().includes(search.toLowerCase()) ||
        (r.user_first_name + ' ' + r.user_last_name).toLowerCase().includes(search.toLowerCase()) ||
        r.voucher_code.toLowerCase().includes(search.toLowerCase()),
      )
    : data;

  // Summary stats
  const stats = {
    total:          data.length,
    unusedNoWindow: data.filter(r => r.voucher_status === 'unused' && !r.booking_id && !r.window_id).length,
    unusedInWindow: data.filter(r => r.voucher_status === 'unused' && !r.booking_id && !!r.window_id).length,
    scheduled:      data.filter(r => !!r.booking_id).length,
    urgent:         data.filter(r => {
      const days = daysUntil(r.window_end);
      return r.voucher_status === 'unused' && !r.booking_id && !!r.window_id && days !== null && days <= 3;
    }).length,
  };

  // Collect unique countries for filter
  const countries = Array.from(new Set(data.map(r => r.user_country_code).filter(Boolean))).sort() as string[];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-blue-600" />
            Voucher Reminder Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor unused exam vouchers and automated reminder status
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Ticket className="w-3 h-3" /> Total vouchers
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">{stats.unusedInWindow}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Bell className="w-3 h-3" /> Unused in open window
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Urgent (&le;3 days left)
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.scheduled}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Scheduled
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <Input
                placeholder="Search by name, email or code…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9"
              />
            </div>
            <Select value={certType} onValueChange={setCertType}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Cert Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CP">BDA-CP™</SelectItem>
                <SelectItem value="SCP">BDA-SCP™</SelectItem>
              </SelectContent>
            </Select>
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={v => setStatus(v as TrackingFilter)}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unused_no_booking">Unused / Not Booked</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <Ticket className="w-8 h-8" />
              <span className="text-sm">No vouchers match the current filters</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-medium">Candidate</th>
                    <th className="px-4 py-3 text-left font-medium">Voucher</th>
                    <th className="px-4 py-3 text-left font-medium">Exam Window</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Reminders Sent</th>
                    <th className="px-4 py-3 text-left font-medium">Scheduled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(row => (
                    <tr
                      key={row.voucher_id}
                      className={cn(
                        'hover:bg-gray-50 transition-colors',
                        row.voucher_status === 'unused' && !row.booking_id && row.window_id &&
                          daysUntil(row.window_end) !== null && (daysUntil(row.window_end) as number) <= 3
                          ? 'bg-red-50'
                          : '',
                      )}
                    >
                      {/* Candidate */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {row.user_first_name} {row.user_last_name}
                        </div>
                        <div className="text-xs text-gray-400">{row.user_email}</div>
                        {row.user_country_code && (
                          <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Globe className="w-3 h-3" />
                            {row.user_country_code}
                          </div>
                        )}
                      </td>
                      {/* Voucher */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded inline-block mb-1">
                          {row.voucher_code}
                        </div>
                        <div className="text-xs text-gray-500">
                          BDA-{row.certification_type}™
                          {row.exam_language && <span className="ml-1 uppercase">({row.exam_language})</span>}
                        </div>
                        <div className="text-xs text-gray-400">
                          Expires {formatDate(row.expires_at)}
                        </div>
                      </td>
                      {/* Window */}
                      <td className="px-4 py-3">
                        {row.window_id ? (
                          <>
                            <div className="font-medium text-gray-700 text-xs">{row.window_name}</div>
                            <div className="text-xs text-gray-400">
                              {formatDate(row.window_start)} → {formatDate(row.window_end)}
                            </div>
                            {daysUntil(row.window_end) !== null && (
                              <div className={cn(
                                'text-xs font-medium mt-0.5',
                                (daysUntil(row.window_end) as number) <= 3 ? 'text-red-600' : 'text-amber-600',
                              )}>
                                {daysUntil(row.window_end)} day{(daysUntil(row.window_end) as number) !== 1 ? 's' : ''} left
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">No open window</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge row={row} />
                      </td>
                      {/* Reminders */}
                      <td className="px-4 py-3">
                        {row.window_id ? (
                          <>
                            <ReminderDots sent={row.reminders_sent} last={row.last_reminder_type} />
                            {row.last_reminder_at && (
                              <div className="text-xs text-gray-400 mt-1">
                                Last: {formatDate(row.last_reminder_at)}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      {/* Scheduled */}
                      <td className="px-4 py-3">
                        {row.scheduled_date ? (
                          <div className="flex items-center gap-1.5 text-xs text-green-700">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(row.scheduled_date)}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not scheduled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t text-xs text-gray-400 text-right">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-600">Reminder Schedule</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-600 inline-block" />
              <strong>Window Open</strong> — sent on the day the exam window opens
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-600 inline-block" />
              <strong>Day 5</strong> — sent 5 days after window opens
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-600 inline-block" />
              <strong>3 Days Left</strong> — sent when 3 days remain in window
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-blue-600 inline-block" />
              <strong>Last Day</strong> — sent 1 day before window closes
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Reminders run automatically every day at 09:00 UTC via pg_cron.
            Only candidates with unused vouchers and no active booking receive reminders.
            Each reminder is sent at most once per voucher per window.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
