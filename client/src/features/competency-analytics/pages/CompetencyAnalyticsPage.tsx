/**
 * CompetencyAnalyticsPage
 * Displays a radar chart + detail table of the user's mastery per BDA BoK competency.
 * Standalone page — no changes to existing learning system pages.
 * Language: English only (per BDA Learning System content policy).
 */
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
import { ArrowLeft, TrendingUp, Target, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useCompetencyAnalytics } from '../hooks/useCompetencyAnalytics';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMasteryColor(pct: number): string {
  if (pct >= 80) return '#16a34a'; // green-600
  if (pct >= 60) return '#ca8a04'; // yellow-600
  return '#dc2626';                // red-600
}

function getMasteryLabel(pct: number): string {
  if (pct >= 80) return 'Strong';
  if (pct >= 60) return 'Developing';
  return 'Needs Focus';
}

function shortName(name: string): string {
  // Shorten long competency names for the radar chart axis
  const words = name.split(' ');
  if (words.length <= 3) return name;
  return words.slice(0, 3).join(' ') + '…';
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-white rounded-2xl shadow-sm border p-10 max-w-md">
        <BookOpen className="w-14 h-14 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">No Analytics Yet</h2>
        <p className="text-gray-500 text-sm mb-6">
          Start answering questions in the <strong>Question Bank</strong> to see your
          competency mastery breakdown here.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
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
  const { data: rows, isLoading, isError } = useCompetencyAnalytics();

  // Determine back path (supports /individual and /ecp prefixes)
  const basePath = window.location.pathname.startsWith('/ecp')
    ? '/ecp/learning-system'
    : '/individual/learning-system';

  const handleBack = () => navigate(`${basePath}?lang=${searchParams.get('lang') ?? 'EN'}`);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-gray-600">Failed to load analytics. Please try again later.</p>
        <button onClick={handleBack} className="mt-4 text-blue-600 underline text-sm">
          Go back
        </button>
      </div>
    );
  }

  // ── Empty ──
  if (!rows || rows.length === 0) {
    return <EmptyState onBack={handleBack} />;
  }

  // ── Prepare chart data ──
  const radarData = rows.map((r) => ({
    subject: shortName(r.competency_name),
    fullName: r.competency_name,
    mastery: Number(r.mastery_percentage ?? 0),
  }));

  const barData = [...rows]
    .sort((a, b) => Number(a.mastery_percentage) - Number(b.mastery_percentage))
    .map((r) => ({
      name: shortName(r.competency_name),
      fullName: r.competency_name,
      mastery: Number(r.mastery_percentage ?? 0),
      attempts: r.total_attempts,
    }));

  const overallMastery =
    rows.length > 0
      ? Math.round(
          rows.reduce((sum, r) => sum + Number(r.mastery_percentage ?? 0), 0) / rows.length
        )
      : 0;

  const weakest = [...rows].sort(
    (a, b) => Number(a.mastery_percentage) - Number(b.mastery_percentage)
  )[0];

  const strongest = [...rows].sort(
    (a, b) => Number(b.mastery_percentage) - Number(a.mastery_percentage)
  )[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Learning System
        </button>
        <div className="h-5 w-px bg-gray-300" />
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Competency Analytics</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Overall Mastery */}
          <div className="bg-white rounded-xl border shadow-sm p-5 flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow"
              style={{ backgroundColor: getMasteryColor(overallMastery) }}
            >
              {overallMastery}%
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Overall Mastery</p>
              <p className="font-semibold text-gray-800">{getMasteryLabel(overallMastery)}</p>
            </div>
          </div>

          {/* Strongest Competency */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Strongest Area</p>
            <p className="font-semibold text-gray-800 text-sm leading-snug">
              {strongest.competency_name}
            </p>
            <p className="text-green-600 font-bold mt-1">
              {Number(strongest.mastery_percentage).toFixed(1)}%
            </p>
          </div>

          {/* Needs Focus */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Needs Most Focus</p>
            <p className="font-semibold text-gray-800 text-sm leading-snug">
              {weakest.competency_name}
            </p>
            <p className="text-red-600 font-bold mt-1">
              {Number(weakest.mastery_percentage).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              Competency Radar
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                />
                <Radar
                  name="Mastery"
                  dataKey="mastery"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Mastery']}
                  labelFormatter={(label) =>
                    radarData.find((d) => d.subject === label)?.fullName ?? label
                  }
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Mastery by Competency
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 0, right: 20, bottom: 0, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  width={110}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Mastery']}
                  labelFormatter={(label) =>
                    barData.find((d) => d.name === label)?.fullName ?? label
                  }
                />
                <Bar dataKey="mastery" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={getMasteryColor(entry.mastery)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detail Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-base font-bold text-gray-800">Competency Breakdown</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Based on your Question Bank practice sessions
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left">Competency</th>
                  <th className="px-6 py-3 text-center">Questions Seen</th>
                  <th className="px-6 py-3 text-center">Correct</th>
                  <th className="px-6 py-3 text-center">Mastery</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...rows]
                  .sort(
                    (a, b) =>
                      Number(a.mastery_percentage) - Number(b.mastery_percentage)
                  )
                  .map((row) => {
                    const pct = Number(row.mastery_percentage ?? 0);
                    return (
                      <tr key={row.module_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {row.competency_name}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-600">
                          {row.unique_questions_seen}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-600">
                          {row.correct_answers} / {row.total_attempts}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: getMasteryColor(pct),
                                }}
                              />
                            </div>
                            <span
                              className="font-semibold text-sm"
                              style={{ color: getMasteryColor(pct) }}
                            >
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${getMasteryColor(pct)}20`,
                              color: getMasteryColor(pct),
                            }}
                          >
                            {getMasteryLabel(pct)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-400 text-center pb-4">
          Analytics are based on your Question Bank practice sessions. Keep practicing to improve
          your mastery scores across all BDA Book of Knowledge (BoK) competencies.
        </p>
      </div>
    </div>
  );
}
