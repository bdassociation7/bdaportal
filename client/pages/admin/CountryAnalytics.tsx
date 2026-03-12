/**
 * Country Analytics Dashboard
 *
 * Bar/pie charts showing certifications, memberships, and exam activity
 * broken down by country. Includes date range filter, service filter, and CSV export.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import {
  Globe,
  RefreshCw,
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  Table,
  Award,
  Crown,
  Ticket,
  Users,
} from 'lucide-react';
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
import { supabase } from '@/shared/config/supabase.config';
import { cn } from '@/shared/utils/cn';

// ---------------------------------------------------------------------------
// Types & colours
// ---------------------------------------------------------------------------

interface CountryRow {
  country_code: string;
  total_users: number;
  active_members: number;
  basic_members: number;
  professional_members: number;
  total_certifications: number;
  cp_certifications: number;
  scp_certifications: number;
  unused_vouchers: number;
  used_vouchers: number;
  mock_attempts: number;
  cert_attempts: number;
}

type ViewMode = 'bar' | 'pie' | 'table';
type ServiceFilter = 'all' | 'membership' | 'certification' | 'mock_exam' | 'voucher';
type MetricKey = 'total_users' | 'active_members' | 'total_certifications' | 'used_vouchers' | 'cert_attempts';

const CHART_COLORS = [
  '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd',
  '#0d9488', '#14b8a6', '#2dd4bf', '#7c3aed', '#a855f7',
];

const METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
  { value: 'total_users',         label: 'Total Users' },
  { value: 'active_members',      label: 'Active Members' },
  { value: 'total_certifications',label: 'Certifications Issued' },
  { value: 'used_vouchers',       label: 'Vouchers Used' },
  { value: 'cert_attempts',       label: 'Exam Attempts' },
];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function useCountryAnalytics(from: string, to: string, service: string, certType: string) {
  return useQuery({
    queryKey: ['country-analytics', from, to, service, certType],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_country_analytics', {
        p_from:      from      || null,
        p_to:        to        || null,
        p_service:   service   === 'all' ? null : service,
        p_cert_type: certType  === 'all' ? null : certType,
      });
      if (error) throw error;
      return (data as CountryRow[]) ?? [];
    },
    staleTime: 120_000,
  });
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function exportCSV(rows: CountryRow[]) {
  const headers = [
    'Country', 'Total Users', 'Active Members', 'Basic Members', 'Professional Members',
    'Total Certifications', 'CP Certifications', 'SCP Certifications',
    'Unused Vouchers', 'Used Vouchers', 'Mock Attempts', 'Cert Attempts',
  ];
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      r.country_code, r.total_users, r.active_members, r.basic_members, r.professional_members,
      r.total_certifications, r.cp_certifications, r.scp_certifications,
      r.unused_vouchers, r.used_vouchers, r.mock_attempts, r.cert_attempts,
    ].join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bda-country-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BarChartView({ data, metric }: { data: CountryRow[]; metric: MetricKey }) {
  const top10 = data.slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={top10} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="country_code" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{ borderRadius: 8, fontSize: 13 }}
          formatter={(val: number) => [val.toLocaleString(), METRIC_OPTIONS.find(m => m.value === metric)?.label ?? metric]}
        />
        <Bar dataKey={metric} radius={[4, 4, 0, 0]}>
          {top10.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieChartView({ data, metric }: { data: CountryRow[]; metric: MetricKey }) {
  const top8 = data
    .filter(r => r[metric] > 0)
    .slice(0, 8);
  const total = top8.reduce((sum, r) => sum + r[metric], 0);
  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={top8}
          dataKey={metric}
          nameKey="country_code"
          cx="50%"
          cy="50%"
          outerRadius={120}
          label={({ country_code, percent }) =>
            percent > 0.03 ? `${country_code} (${(percent * 100).toFixed(0)}%)` : ''
          }
        >
          {top8.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(val: number) => [val.toLocaleString(), METRIC_OPTIONS.find(m => m.value === metric)?.label ?? metric]}
        />
        <Legend
          formatter={(value) => <span className="text-xs">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function TableView({ data }: { data: CountryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-2 text-left">Country</th>
            <th className="px-4 py-2 text-right">Users</th>
            <th className="px-4 py-2 text-right">Members</th>
            <th className="px-4 py-2 text-right">Certs</th>
            <th className="px-4 py-2 text-right">CP</th>
            <th className="px-4 py-2 text-right">SCP</th>
            <th className="px-4 py-2 text-right">Vouchers Used</th>
            <th className="px-4 py-2 text-right">Mock Exams</th>
            <th className="px-4 py-2 text-right">Cert Exams</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.map((row, i) => (
            <tr key={row.country_code} className={cn('hover:bg-gray-50', i % 2 === 0 ? '' : 'bg-gray-50/40')}>
              <td className="px-4 py-2 font-medium">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  {row.country_code}
                </div>
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{row.total_users.toLocaleString()}</td>
              <td className="px-4 py-2 text-right tabular-nums">{row.active_members.toLocaleString()}</td>
              <td className="px-4 py-2 text-right tabular-nums font-semibold">{row.total_certifications.toLocaleString()}</td>
              <td className="px-4 py-2 text-right tabular-nums text-blue-600">{row.cp_certifications.toLocaleString()}</td>
              <td className="px-4 py-2 text-right tabular-nums text-purple-600">{row.scp_certifications.toLocaleString()}</td>
              <td className="px-4 py-2 text-right tabular-nums">{row.used_vouchers.toLocaleString()}</td>
              <td className="px-4 py-2 text-right tabular-nums text-gray-500">{row.mock_attempts.toLocaleString()}</td>
              <td className="px-4 py-2 text-right tabular-nums">{row.cert_attempts.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 font-semibold text-sm bg-gray-50">
            <td className="px-4 py-2">Total ({data.length} countries)</td>
            <td className="px-4 py-2 text-right tabular-nums">{data.reduce((s, r) => s + r.total_users, 0).toLocaleString()}</td>
            <td className="px-4 py-2 text-right tabular-nums">{data.reduce((s, r) => s + r.active_members, 0).toLocaleString()}</td>
            <td className="px-4 py-2 text-right tabular-nums">{data.reduce((s, r) => s + r.total_certifications, 0).toLocaleString()}</td>
            <td className="px-4 py-2 text-right tabular-nums">{data.reduce((s, r) => s + r.cp_certifications, 0).toLocaleString()}</td>
            <td className="px-4 py-2 text-right tabular-nums">{data.reduce((s, r) => s + r.scp_certifications, 0).toLocaleString()}</td>
            <td className="px-4 py-2 text-right tabular-nums">{data.reduce((s, r) => s + r.used_vouchers, 0).toLocaleString()}</td>
            <td className="px-4 py-2 text-right tabular-nums">{data.reduce((s, r) => s + r.mock_attempts, 0).toLocaleString()}</td>
            <td className="px-4 py-2 text-right tabular-nums">{data.reduce((s, r) => s + r.cert_attempts, 0).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CountryAnalytics() {
  const [viewMode,  setViewMode]  = useState<ViewMode>('bar');
  const [metric,    setMetric]    = useState<MetricKey>('total_certifications');
  const [service,   setService]   = useState<ServiceFilter>('all');
  const [certType,  setCertType]  = useState('all');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [search,    setSearch]    = useState('');

  const { data = [], isLoading, refetch, isFetching } = useCountryAnalytics(dateFrom, dateTo, service, certType);

  const filtered = useMemo(() => {
    let rows = data;
    if (search.trim()) {
      rows = rows.filter(r => r.country_code.toLowerCase().includes(search.toLowerCase()));
    }
    return rows;
  }, [data, search]);

  const totals = useMemo(() => ({
    users:    filtered.reduce((s, r) => s + r.total_users, 0),
    members:  filtered.reduce((s, r) => s + r.active_members, 0),
    certs:    filtered.reduce((s, r) => s + r.total_certifications, 0),
    vouchers: filtered.reduce((s, r) => s + r.used_vouchers, 0),
  }), [filtered]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            Country Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Geographic breakdown of certifications, memberships, and exam activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isFetching && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totals.users.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> Users ({filtered.length} countries)
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{totals.members.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Crown className="w-3 h-3" /> Active Members
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{totals.certs.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Award className="w-3 h-3" /> Certifications Issued
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">{totals.vouchers.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Ticket className="w-3 h-3" /> Vouchers Used
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">From</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-36" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">To</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-36" />
            </div>
            <Select value={service} onValueChange={v => setService(v as ServiceFilter)}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="membership">Membership</SelectItem>
                <SelectItem value="certification">Certification</SelectItem>
                <SelectItem value="mock_exam">Mock Exam</SelectItem>
                <SelectItem value="voucher">Vouchers</SelectItem>
              </SelectContent>
            </Select>
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
            <Input
              placeholder="Search country…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-36"
            />
          </div>
        </CardContent>
      </Card>

      {/* Chart controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {METRIC_OPTIONS.find(m => m.value === metric)?.label} by Country
            </CardTitle>
            <div className="flex gap-2">
              {/* Metric selector */}
              <Select value={metric} onValueChange={v => setMetric(v as MetricKey)}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* View toggle */}
              <div className="flex rounded-md border overflow-hidden">
                {([
                  { mode: 'bar',   Icon: BarChart3 },
                  { mode: 'pie',   Icon: PieChartIcon },
                  { mode: 'table', Icon: Table },
                ] as const).map(({ mode, Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'px-2.5 py-1.5 transition-colors',
                      viewMode === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50',
                    )}
                    title={mode}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <Globe className="w-8 h-8" />
              <span className="text-sm">No data for the selected filters</span>
            </div>
          ) : viewMode === 'bar' ? (
            <BarChartView data={filtered} metric={metric} />
          ) : viewMode === 'pie' ? (
            <PieChartView data={filtered} metric={metric} />
          ) : (
            <TableView data={filtered} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
