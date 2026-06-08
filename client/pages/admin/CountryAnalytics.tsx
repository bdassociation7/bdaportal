/**
 * Country Analytics Dashboard
 *
 * Comprehensive analytics broken down by country.
 * Uses direct Supabase queries — no RPC dependency.
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
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import {
  Globe,
  RefreshCw,
  Download,
  Users,
  Award,
  BookOpen,
  TrendingUp,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Ticket,
  UserCheck,
  BarChart3,
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/shared/config/supabase.config';

// ─── Country name map ────────────────────────────────────────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  SA: 'Saudi Arabia', US: 'United States', GB: 'United Kingdom',
  EG: 'Egypt', AE: 'UAE', JO: 'Jordan', CA: 'Canada', DE: 'Germany',
  ID: 'Indonesia', KE: 'Kenya', PH: 'Philippines', BR: 'Brazil',
  FR: 'France', BH: 'Bahrain', IN: 'India', IQ: 'Iraq', IT: 'Italy',
  ZA: 'South Africa', LB: 'Lebanon', MA: 'Morocco', NO: 'Norway',
  OM: 'Oman', PE: 'Peru', ZW: 'Zimbabwe', KW: 'Kuwait', QA: 'Qatar',
  PK: 'Pakistan', NG: 'Nigeria', AU: 'Australia', NL: 'Netherlands',
  ES: 'Spain', TR: 'Turkey', MX: 'Mexico', SG: 'Singapore',
};

function getCountryName(code: string): string {
  if (!code) return 'Unknown';
  // Clean up phone-code-style entries like +966, +20
  const clean = code.replace(/^\+/, '').replace(/^966$/, 'SA').replace(/^20$/, 'EG').replace(/^61$/, 'AU').replace(/^91$/, 'IN');
  return COUNTRY_NAMES[clean.toUpperCase()] || COUNTRY_NAMES[code.toUpperCase()] || code.toUpperCase();
}

// ─── Colour palette ───────────────────────────────────────────────────────────
const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#059669'];

// ─── Types ────────────────────────────────────────────────────────────────────
interface CountryRow {
  country_code: string;
  country_name: string;
  total_users: number;
  active_members: number;
  professional: number;
  basic: number;
  total_vouchers: number;
  used_vouchers: number;
  available_vouchers: number;
  certifications: number;
  book_credits: number;
  membership_rate: number;
  voucher_usage_rate: number;
}

interface MonthlyRow {
  month: string;
  new_users: number;
  from_store: number;
  from_portal: number;
}

type SortKey = keyof CountryRow;
type SortDir = 'asc' | 'desc';

// ─── Component ────────────────────────────────────────────────────────────────
export default function CountryAnalytics() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [metricFilter, setMetricFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('total_users');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [activeChart, setActiveChart] = useState<'bar' | 'pie' | 'line'>('bar');

  // ── Fetch country data ──────────────────────────────────────────────────────
  const { data: countryData = [], isLoading: loadingCountry, error: errorCountry, refetch } = useQuery({
    queryKey: ['country-analytics'],
    queryFn: async (): Promise<CountryRow[]> => {
      // 1. Users
      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('id, country_code, created_at');
      if (uErr) throw new Error('Users error: ' + uErr.message);

      // 2. Memberships
      const { data: memberships, error: mErr } = await supabase
        .from('user_memberships')
        .select('user_id, membership_type, status');
      if (mErr) throw new Error('Memberships error: ' + mErr.message);

      // 3. Vouchers
      const { data: vouchers, error: vErr } = await supabase
        .from('exam_vouchers')
        .select('user_id, certification_type, status');
      if (vErr) throw new Error('Vouchers error: ' + vErr.message);

      // 4. Certifications
      const { data: certs, error: cErr } = await supabase
        .from('user_certifications')
        .select('user_id, certification_type, status');
      if (cErr) throw new Error('Certifications error: ' + cErr.message);

      // 5. Book credits
      const { data: bookCredits, error: bErr } = await supabase
        .from('user_book_credits')
        .select('user_id, is_redeemed');
      if (bErr) throw new Error('Book credits error: ' + bErr.message);

      // ── Build lookup maps ──
      const membershipMap = new Map<string, { type: string; status: string }[]>();
      (memberships || []).forEach(m => {
        if (!membershipMap.has(m.user_id)) membershipMap.set(m.user_id, []);
        membershipMap.get(m.user_id)!.push({ type: m.membership_type, status: m.status });
      });

      const voucherMap = new Map<string, { status: string }[]>();
      (vouchers || []).forEach(v => {
        if (!voucherMap.has(v.user_id)) voucherMap.set(v.user_id, []);
        voucherMap.get(v.user_id)!.push({ status: v.status });
      });

      const certMap = new Map<string, number>();
      (certs || []).forEach(c => {
        certMap.set(c.user_id, (certMap.get(c.user_id) || 0) + 1);
      });

      const bookMap = new Map<string, number>();
      (bookCredits || []).forEach(b => {
        bookMap.set(b.user_id, (bookMap.get(b.user_id) || 0) + 1);
      });

      // ── Aggregate by country ──
      const countryMap = new Map<string, CountryRow>();

      (users || []).forEach(u => {
        const cc = u.country_code || 'Unknown';
        if (!countryMap.has(cc)) {
          countryMap.set(cc, {
            country_code: cc,
            country_name: getCountryName(cc),
            total_users: 0,
            active_members: 0,
            professional: 0,
            basic: 0,
            total_vouchers: 0,
            used_vouchers: 0,
            available_vouchers: 0,
            certifications: 0,
            book_credits: 0,
            membership_rate: 0,
            voucher_usage_rate: 0,
          });
        }
        const row = countryMap.get(cc)!;
        row.total_users++;

        // memberships
        const mems = membershipMap.get(u.id) || [];
        const activeMems = mems.filter(m => m.status === 'active');
        if (activeMems.length > 0) row.active_members++;
        if (activeMems.some(m => m.type === 'professional')) row.professional++;
        if (activeMems.some(m => m.type === 'basic')) row.basic++;

        // vouchers
        const vcs = voucherMap.get(u.id) || [];
        row.total_vouchers += vcs.length;
        row.used_vouchers += vcs.filter(v => v.status === 'used').length;
        row.available_vouchers += vcs.filter(v => v.status === 'available').length;

        // certifications
        row.certifications += certMap.get(u.id) || 0;

        // book credits
        row.book_credits += bookMap.get(u.id) || 0;
      });

      // Calculate rates
      const result: CountryRow[] = [];
      countryMap.forEach(row => {
        row.membership_rate = row.total_users > 0 ? Math.round((row.active_members / row.total_users) * 100) : 0;
        row.voucher_usage_rate = row.total_vouchers > 0 ? Math.round((row.used_vouchers / row.total_vouchers) * 100) : 0;
        result.push(row);
      });

      return result.sort((a, b) => b.total_users - a.total_users);
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch monthly growth ────────────────────────────────────────────────────
  const { data: monthlyData = [], isLoading: loadingMonthly } = useQuery({
    queryKey: ['monthly-growth'],
    queryFn: async (): Promise<MonthlyRow[]> => {
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
      twelveMonthsAgo.setDate(1);

      const { data, error } = await supabase
        .from('users')
        .select('created_at, created_from')
        .gte('created_at', twelveMonthsAgo.toISOString());

      if (error) throw error;

      const monthMap = new Map<string, MonthlyRow>();
      (data || []).forEach(u => {
        const d = new Date(u.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap.has(key)) monthMap.set(key, { month: key, new_users: 0, from_store: 0, from_portal: 0 });
        const row = monthMap.get(key)!;
        row.new_users++;
        if (u.created_from === 'store') row.from_store++;
        else if (u.created_from === 'portal') row.from_portal++;
      });

      return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Computed totals ─────────────────────────────────────────────────────────
  const totals = useMemo(() => ({
    total_users: countryData.reduce((s, r) => s + r.total_users, 0),
    active_members: countryData.reduce((s, r) => s + r.active_members, 0),
    total_vouchers: countryData.reduce((s, r) => s + r.total_vouchers, 0),
    used_vouchers: countryData.reduce((s, r) => s + r.used_vouchers, 0),
    certifications: countryData.reduce((s, r) => s + r.certifications, 0),
    countries: countryData.filter(r => r.country_code !== 'Unknown').length,
    professional: countryData.reduce((s, r) => s + r.professional, 0),
    basic: countryData.reduce((s, r) => s + r.basic, 0),
  }), [countryData]);

  // ── Filter + sort ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let rows = [...countryData];

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.country_name.toLowerCase().includes(q) ||
        r.country_code.toLowerCase().includes(q)
      );
    }

    if (metricFilter === 'members') rows = rows.filter(r => r.active_members > 0);
    else if (metricFilter === 'vouchers') rows = rows.filter(r => r.total_vouchers > 0);
    else if (metricFilter === 'certifications') rows = rows.filter(r => r.certifications > 0);

    rows.sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    return rows;
  }, [countryData, search, metricFilter, sortKey, sortDir]);

  // ── Bar chart data (top 10) ─────────────────────────────────────────────────
  const barData = useMemo(() =>
    [...countryData]
      .sort((a, b) => b.total_users - a.total_users)
      .slice(0, 10)
      .map(r => ({
        name: r.country_name.length > 12 ? r.country_code : r.country_name,
        Users: r.total_users,
        Members: r.active_members,
        Vouchers: r.total_vouchers,
        Certifications: r.certifications,
      })),
    [countryData]
  );

  // ── Pie chart data ──────────────────────────────────────────────────────────
  const membershipPie = useMemo(() => [
    { name: 'Professional', value: totals.professional },
    { name: 'Basic', value: totals.basic },
    { name: 'Non-member', value: totals.total_users - totals.active_members },
  ].filter(d => d.value > 0), [totals]);

  const voucherPie = useMemo(() => {
    const available = countryData.reduce((s, r) => s + r.available_vouchers, 0);
    const assigned = totals.total_vouchers - totals.used_vouchers - available;
    return [
      { name: 'Used', value: totals.used_vouchers },
      { name: 'Available', value: available },
      { name: 'Assigned', value: Math.max(0, assigned) },
    ].filter(d => d.value > 0);
  }, [countryData, totals]);

  // ── Sort handler ────────────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  // ── CSV export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Country', 'Code', 'Total Users', 'Active Members', 'Professional', 'Basic', 'Membership Rate %', 'Total Vouchers', 'Used Vouchers', 'Available Vouchers', 'Voucher Usage %', 'Certifications', 'Book Credits'];
    const rows = filtered.map(r => [
      r.country_name, r.country_code, r.total_users, r.active_members,
      r.professional, r.basic, r.membership_rate,
      r.total_vouchers, r.used_vouchers, r.available_vouchers, r.voucher_usage_rate,
      r.certifications, r.book_credits,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bda-country-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${filtered.length} countries exported to CSV.` });
  };

  const isLoading = loadingCountry || loadingMonthly;

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            Country Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Platform-wide breakdown by country — members, vouchers, certifications & growth
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Error ── */}
      {errorCountry && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
          <span className="font-medium">Error loading data:</span>
          <span className="text-sm">{(errorCountry as Error).message}</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-auto text-red-600">
            Try again
          </Button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Users', value: totals.total_users, icon: Users, color: 'text-blue-600' },
          { label: 'Countries', value: totals.countries, icon: Globe, color: 'text-indigo-600' },
          { label: 'Active Members', value: totals.active_members, icon: UserCheck, color: 'text-green-600' },
          { label: 'Professional', value: totals.professional, icon: Award, color: 'text-purple-600' },
          { label: 'Basic', value: totals.basic, icon: Award, color: 'text-cyan-600' },
          { label: 'Total Vouchers', value: totals.total_vouchers, icon: Ticket, color: 'text-orange-600' },
          { label: 'Used Vouchers', value: totals.used_vouchers, icon: Ticket, color: 'text-red-600' },
          { label: 'Certifications', value: totals.certifications, icon: BookOpen, color: 'text-teal-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="text-center">
            <CardContent className="pt-4 pb-3 px-3">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <div className={`text-2xl font-bold ${isLoading ? 'text-gray-300' : color}`}>
                {isLoading ? '—' : value}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Top 10 Countries by Metric
              </CardTitle>
              <div className="flex gap-1">
                {(['bar', 'pie', 'line'] as const).map(t => (
                  <Button
                    key={t}
                    variant={activeChart === t ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2 text-xs capitalize"
                    onClick={() => setActiveChart(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-gray-400">Loading chart…</div>
            ) : activeChart === 'bar' ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Users" fill="#2563eb" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Members" fill="#16a34a" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Vouchers" fill="#d97706" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Certifications" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : activeChart === 'line' ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="new_users" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="New Users" />
                  <Line type="monotone" dataKey="from_store" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} name="From Store" />
                  <Line type="monotone" dataKey="from_portal" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} name="From Portal" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-center text-gray-500 mb-1">Membership Types</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={membershipPie} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {membershipPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-xs text-center text-gray-500 mb-1">Voucher Status</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={voucherPie} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {voucherPie.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly growth summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Monthly Growth (12m)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMonthly ? (
              <div className="h-64 flex items-center justify-center text-gray-400">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="from_store" stackId="a" fill="#16a34a" name="Store" />
                  <Bar dataKey="from_portal" stackId="a" fill="#2563eb" name="Portal" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by country name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={metricFilter} onValueChange={setMetricFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            <SelectItem value="members">Has Active Members</SelectItem>
            <SelectItem value="vouchers">Has Vouchers</SelectItem>
            <SelectItem value="certifications">Has Certifications</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-gray-500 flex items-center">
          {filtered.length} / {countryData.length} countries
        </div>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {[
                    { key: 'country_name' as SortKey, label: 'Country' },
                    { key: 'total_users' as SortKey, label: 'Total Users' },
                    { key: 'active_members' as SortKey, label: 'Active Members' },
                    { key: 'professional' as SortKey, label: 'Professional' },
                    { key: 'basic' as SortKey, label: 'Basic' },
                    { key: 'membership_rate' as SortKey, label: 'Membership Rate' },
                    { key: 'total_vouchers' as SortKey, label: 'Vouchers' },
                    { key: 'used_vouchers' as SortKey, label: 'Used' },
                    { key: 'voucher_usage_rate' as SortKey, label: 'Usage Rate' },
                    { key: 'certifications' as SortKey, label: 'Certifications' },
                    { key: 'book_credits' as SortKey, label: 'Book Credits' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100 whitespace-nowrap select-none"
                      onClick={() => handleSort(key)}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        <SortIcon k={key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 11 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                      No countries match the current filters
                    </td>
                  </tr>
                ) : (
                  filtered.map(row => (
                    <tr key={row.country_code} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{getFlagEmoji(row.country_code)}</span>
                          <div>
                            <div>{row.country_name}</div>
                            <div className="text-xs text-gray-400">{row.country_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-blue-700">{row.total_users}</td>
                      <td className="px-4 py-3">
                        {row.active_members > 0 ? (
                          <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                            {row.active_members}
                          </Badge>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.professional > 0 ? (
                          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">{row.professional}</Badge>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.basic > 0 ? (
                          <Badge className="bg-cyan-100 text-cyan-700 hover:bg-cyan-100">{row.basic}</Badge>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-green-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min(row.membership_rate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{row.membership_rate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-orange-700 font-medium">
                        {row.total_vouchers > 0 ? row.total_vouchers : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-red-600">
                        {row.used_vouchers > 0 ? row.used_vouchers : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.total_vouchers > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-12 bg-gray-100 rounded-full h-1.5">
                              <div
                                className="bg-orange-400 h-1.5 rounded-full"
                                style={{ width: `${Math.min(row.voucher_usage_rate, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{row.voucher_usage_rate}%</span>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.certifications > 0 ? (
                          <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100">{row.certifications}</Badge>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.book_credits > 0 ? row.book_credits : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {!isLoading && filtered.length > 0 && (
                <tfoot className="bg-gray-50 border-t font-semibold text-sm">
                  <tr>
                    <td className="px-4 py-3 text-gray-700">
                      Totals ({filtered.length} countries)
                    </td>
                    <td className="px-4 py-3 text-blue-700">{filtered.reduce((s, r) => s + r.total_users, 0)}</td>
                    <td className="px-4 py-3 text-green-700">{filtered.reduce((s, r) => s + r.active_members, 0)}</td>
                    <td className="px-4 py-3 text-purple-700">{filtered.reduce((s, r) => s + r.professional, 0)}</td>
                    <td className="px-4 py-3 text-cyan-700">{filtered.reduce((s, r) => s + r.basic, 0)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {filtered.reduce((s, r) => s + r.total_users, 0) > 0
                        ? Math.round((filtered.reduce((s, r) => s + r.active_members, 0) / filtered.reduce((s, r) => s + r.total_users, 0)) * 100)
                        : 0}%
                    </td>
                    <td className="px-4 py-3 text-orange-700">{filtered.reduce((s, r) => s + r.total_vouchers, 0)}</td>
                    <td className="px-4 py-3 text-red-600">{filtered.reduce((s, r) => s + r.used_vouchers, 0)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {filtered.reduce((s, r) => s + r.total_vouchers, 0) > 0
                        ? Math.round((filtered.reduce((s, r) => s + r.used_vouchers, 0) / filtered.reduce((s, r) => s + r.total_vouchers, 0)) * 100)
                        : 0}%
                    </td>
                    <td className="px-4 py-3 text-teal-700">{filtered.reduce((s, r) => s + r.certifications, 0)}</td>
                    <td className="px-4 py-3 text-gray-600">{filtered.reduce((s, r) => s + r.book_credits, 0)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Flag emoji helper ────────────────────────────────────────────────────────
function getFlagEmoji(code: string): string {
  const clean = code.replace(/^\+/, '').toUpperCase();
  // Map phone codes to ISO
  const phoneToISO: Record<string, string> = {
    '966': 'SA', '20': 'EG', '61': 'AU', '91': 'IN', '44': 'GB', '1': 'US',
  };
  const iso = phoneToISO[clean] || clean;
  if (iso.length !== 2) return '🌐';
  const cp1 = iso.codePointAt(0)! - 65 + 0x1F1E6;
  const cp2 = iso.codePointAt(1)! - 65 + 0x1F1E6;
  return String.fromCodePoint(cp1, cp2);
}
