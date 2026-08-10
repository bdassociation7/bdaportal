/**
 * CompetencyAnalyticsPage
 * Personalized analytics dashboard showing each user's real performance
 * across all BDA BoK competencies, drawn from their actual Question Bank activity.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  ArrowLeft,
  TrendingUp,
  Target,
  BookOpen,
  AlertCircle,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Layers,
  Award,
  BarChart2,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useCompetencyAnalytics, CompetencyAnalyticsRow } from '../hooks/useCompetencyAnalytics';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMasteryColor(pct: number): string {
  if (pct >= 80) return '#16a34a';
  if (pct >= 60) return '#ca8a04';
  if (pct > 0) return '#dc2626';
  return '#9ca3af'; // gray for not started
}

function getMasteryLabel(pct: number, attempted: number): string {
  if (attempted === 0) return 'Not Started';
  if (pct >= 80) return 'Strong';
  if (pct >= 60) return 'Developing';
  return 'Needs Focus';
}

function getMasteryBg(pct: number, attempted: number): string {
  if (attempted === 0) return '#f3f4f6';
  if (pct >= 80) return '#dcfce7';
  if (pct >= 60) return '#fef9c3';
  return '#fee2e2';
}

function shortName(name: string): string {
  // Remove "Module N: " prefix for charts
  return name.replace(/^Module \d+:\s*/, '').replace(/^الوحدة \d+:\s*/, '');
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 flex items-start gap-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}18` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color }}>
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Competency Row ──────────────────────────────────────────────────────────

function CompetencyRow({ row }: { row: CompetencyAnalyticsRow }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Number(row.mastery_percentage ?? 0);
  const color = getMasteryColor(pct);
  const bg = getMasteryBg(pct, row.questions_attempted);
  const label = getMasteryLabel(pct, row.questions_attempted);
  const coveragePct =
    row.total_questions > 0
      ? Math.round((row.questions_attempted / row.total_questions) * 100)
      : 0;

  return (
    <>
      <tr
        className="hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400 w-5">{row.order_index}</span>
            <span className="font-medium text-gray-800 text-sm">{shortName(row.competency_name)}</span>
          </div>
        </td>
        <td className="px-5 py-4 text-center">
          <span className="text-sm text-gray-600">
            {row.attempted_sets} / {row.total_sets}
          </span>
        </td>
        <td className="px-5 py-4 text-center">
          <span className="text-sm text-gray-600">
            {row.questions_attempted} / {row.total_questions}
          </span>
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-[60px]">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-sm font-semibold w-12 text-right" style={{ color }}>
              {row.questions_attempted > 0 ? `${pct}%` : '—'}
            </span>
          </div>
        </td>
        <td className="px-5 py-4 text-center">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: bg, color }}
          >
            {label}
          </span>
        </td>
        <td className="px-5 py-4 text-center text-gray-400">
          {expanded ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[#f8faff]">
          <td colSpan={6} className="px-5 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-1">Correct Answers</p>
                <p className="font-semibold text-gray-700">
                  {row.questions_correct} / {row.questions_attempted}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Coverage</p>
                <p className="font-semibold text-gray-700">{coveragePct}% of questions seen</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Best Score</p>
                <p className="font-semibold text-gray-700">
                  {row.best_score_percentage > 0 ? `${Number(row.best_score_percentage).toFixed(1)}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Last Practiced</p>
                <p className="font-semibold text-gray-700">{formatDate(row.last_attempted_at)}</p>
              </div>
            </div>
            {row.questions_attempted === 0 && (
              <p className="mt-3 text-xs text-[#0f91e0] bg-[#e8f4fd] rounded-lg px-3 py-2 inline-block">
                No practice yet — start a Question Bank session for this competency to see your analytics.
              </p>
            )}
            {row.questions_attempted > 0 && pct < 60 && (
              <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 inline-block">
                This competency needs more practice. Try to cover more questions and review the explanations.
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#f5f9ff] flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-white rounded-2xl shadow-sm border p-10 max-w-md">
        <div className="w-16 h-16 rounded-full bg-[#e8f4fd] flex items-center justify-center mx-auto mb-4">
          <BarChart2 className="w-8 h-8 text-[#0f91e0]" />
        </div>
        <h2 className="text-xl font-bold text-[#0d1f4e] mb-2">No Analytics Yet</h2>
        <p className="text-gray-500 text-sm mb-6">
          Start answering questions in the <strong>Question Bank</strong> to see your
          personalized competency analytics here.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-[#0f91e0] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0d82ca] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Learning System
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function CompetencyAnalyticsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [certType, setCertType] = useState<'CP' | 'SCP'>('CP');

  const { competencies, summary, isLoading, isError } = useCompetencyAnalytics(certType, 'en');

  const handleBack = () => {
    const basePath = window.location.pathname.startsWith('/instructor')
      ? '/instructor/learning-system'
      : window.location.pathname.startsWith('/ecp')
      ? '/ecp/learning-system'
      : '/learning-system';
    navigate(`${basePath}?lang=${searchParams.get('lang') ?? 'EN'}`);
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f9ff] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#0f91e0] animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your analytics...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <div className="min-h-screen bg-[#f5f9ff] flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-gray-600">Failed to load analytics. Please try again later.</p>
        <button onClick={handleBack} className="mt-4 text-[#0f91e0] underline text-sm">
          Go back
        </button>
      </div>
    );
  }

  // ── Empty ──
  const hasAnyActivity = summary && summary.total_questions_attempted > 0;
  if (!hasAnyActivity && competencies.length === 0) {
    return <EmptyState onBack={handleBack} />;
  }

  // ── Prepare data ──
  const behavioural = competencies.filter((r) => r.section_type === 'behavioral');
  const knowledge = competencies.filter((r) => r.section_type === 'knowledge');

  const attempted = competencies.filter((r) => r.questions_attempted > 0);

  const radarData = attempted.map((r) => ({
    subject: shortName(r.competency_name),
    fullName: r.competency_name,
    mastery: Number(r.mastery_percentage ?? 0),
  }));

  const barData = [...attempted]
    .sort((a, b) => Number(a.mastery_percentage) - Number(b.mastery_percentage))
    .map((r) => ({
      name: shortName(r.competency_name),
      fullName: r.competency_name,
      mastery: Number(r.mastery_percentage ?? 0),
    }));

  const weakest = attempted.length > 0
    ? [...attempted].sort((a, b) => Number(a.mastery_percentage) - Number(b.mastery_percentage))[0]
    : null;

  const strongest = attempted.length > 0
    ? [...attempted].sort((a, b) => Number(b.mastery_percentage) - Number(a.mastery_percentage))[0]
    : null;

  const overallMastery = summary ? Number(summary.overall_accuracy) : 0;

  return (
    <div className="min-h-screen bg-[#f5f9ff]">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#e8f4fd] flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-[#0f91e0]" />
              </div>
              <div>
                <h1 className="text-base font-bold text-[#0d1f4e]">Competency Analytics</h1>
                <p className="text-xs text-gray-400">Your personalized performance breakdown</p>
              </div>
            </div>
          </div>

          {/* Cert Type Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['CP', 'SCP'] as const).map((ct) => (
              <button
                key={ct}
                onClick={() => setCertType(ct)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  certType === ct
                    ? 'bg-[#0f91e0] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                BDA-{ct}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="Overall Accuracy"
            value={`${overallMastery}%`}
            sub={getMasteryLabel(overallMastery, summary?.total_questions_attempted ?? 0)}
            color={getMasteryColor(overallMastery)}
          />
          <StatCard
            icon={<HelpCircle className="w-5 h-5" />}
            label="Questions Attempted"
            value={summary?.total_questions_attempted ?? 0}
            sub={`of ${summary?.total_questions_available ?? 0} available`}
            color="#0f91e0"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            label="Sets Attempted"
            value={`${summary?.attempted_sets ?? 0} / ${summary?.total_sets ?? 0}`}
            sub={`${summary?.completed_sets ?? 0} completed`}
            color="#0d1f4e"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Last Activity"
            value={formatDate(summary?.last_activity ?? null)}
            color="#6b7280"
          />
        </div>

        {/* Strongest / Weakest */}
        {(strongest || weakest) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {strongest && (
              <div className="bg-white rounded-xl border shadow-sm p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Strongest Competency</p>
                  <p className="font-semibold text-gray-800 text-sm">{shortName(strongest.competency_name)}</p>
                  <p className="text-green-600 font-bold text-lg mt-0.5">
                    {Number(strongest.mastery_percentage).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
            {weakest && (
              <div className="bg-white rounded-xl border shadow-sm p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Needs Most Focus</p>
                  <p className="font-semibold text-gray-800 text-sm">{shortName(weakest.competency_name)}</p>
                  <p className="text-red-600 font-bold text-lg mt-0.5">
                    {Number(weakest.mastery_percentage).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Charts — only if there's data */}
        {attempted.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-sm font-bold text-[#0d1f4e] mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#0f91e0]" />
                Competency Radar
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} />
                  <Radar
                    name="Mastery"
                    dataKey="mastery"
                    stroke="#0f91e0"
                    fill="#0f91e0"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Mastery']}
                    labelFormatter={(l) => radarData.find((d) => d.subject === l)?.fullName ?? l}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bar */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-sm font-bold text-[#0d1f4e] mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0f91e0]" />
                Mastery by Competency
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} width={120} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Mastery']}
                    labelFormatter={(l) => barData.find((d) => d.name === l)?.fullName ?? l}
                  />
                  <Bar dataKey="mastery" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={getMasteryColor(entry.mastery)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Behavioural Competencies Table */}
        {behavioural.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8f4fd] flex items-center justify-center">
                <Layers className="w-4 h-4 text-[#0f91e0]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#0d1f4e]">Behavioural Competencies</h2>
                <p className="text-xs text-gray-400">{behavioural.length} competencies · BDA-{certType}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Competency</th>
                    <th className="px-5 py-3 text-center">Sets Done</th>
                    <th className="px-5 py-3 text-center">Questions</th>
                    <th className="px-5 py-3 text-left">Mastery</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {behavioural.map((row) => (
                    <CompetencyRow key={row.module_id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Knowledge Competencies Table */}
        {knowledge.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#e8f4fd] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[#0f91e0]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#0d1f4e]">Knowledge Competencies</h2>
                <p className="text-xs text-gray-400">{knowledge.length} competencies · BDA-{certType}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 text-left">Competency</th>
                    <th className="px-5 py-3 text-center">Sets Done</th>
                    <th className="px-5 py-3 text-center">Questions</th>
                    <th className="px-5 py-3 text-left">Mastery</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {knowledge.map((row) => (
                    <CompetencyRow key={row.module_id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No activity yet but page loaded */}
        {!hasAnyActivity && competencies.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#e8f4fd] flex items-center justify-center mx-auto mb-4">
              <BarChart2 className="w-7 h-7 text-[#0f91e0]" />
            </div>
            <h3 className="text-base font-bold text-[#0d1f4e] mb-2">Start Practicing to See Analytics</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Your competency breakdown will appear here once you start answering questions in the Question Bank.
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center pb-4">
          Analytics reflect your Question Bank practice sessions for BDA-{certType}.
          Data updates in real-time as you practice.
        </p>
      </div>
    </div>
  );
}
