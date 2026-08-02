import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Award, TrendingUp, BookOpen, PlayCircle, CheckCircle2, ChevronRight, Brain, Zap, Flag, BarChart2 } from 'lucide-react';
import { ModuleCard } from './ModuleCard';
import type {
  UserCurriculumAccess,
  CurriculumModuleWithStatus,
} from '@/entities/curriculum';
import { format } from 'date-fns';

// BDA Brand Colors — strict blue palette only
const BDA = {
  navy: '#1C4A8B',
  navyDark: '#0d1f4e',
  blue: '#0f91e0',
  bluePale: '#f5f9ff',
  blueMid: '#e8f0fb',
  blueSoft: '#dbeafe',
  border: '#d0e4f7',
  borderLight: '#e8f0fb',
};

interface CurriculumDashboardProps {
  access: UserCurriculumAccess;
  knowledgeModules: CurriculumModuleWithStatus[];
  behavioralModules: CurriculumModuleWithStatus[];
  introModules?: CurriculumModuleWithStatus[];
  outroModules?: CurriculumModuleWithStatus[];
  overallProgress?: {
    completed: number;
    total: number;
    percentage: number;
    totalTimeSpent: number;
  };
  nextModule?: CurriculumModuleWithStatus | null;
  basePath?: string;
  backPath?: string;
  selectedLanguage?: 'EN';
}

export function CurriculumDashboard({
  access,
  knowledgeModules,
  behavioralModules,
  introModules = [],
  outroModules = [],
  overallProgress,
  nextModule,
  basePath = '/learning-system/training-kits',
  backPath = '/learning-system',
  selectedLanguage = 'EN',
}: CurriculumDashboardProps) {
  const navigate = useNavigate();

  const expiryDate = new Date(access.expires_at);
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isExpiringSoon = daysUntilExpiry <= 30;

  const totalModules =
    (introModules?.length || 0) +
    behavioralModules.length +
    knowledgeModules.length +
    (outroModules?.length || 0);
  const completedCount = overallProgress?.completed || 0;
  const progressPct = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
  const timeSpentHours = Math.floor((overallProgress?.totalTimeSpent || 0) / 60);

  const getModuleName = (m: CurriculumModuleWithStatus) => {
    const raw = m.competency_name || 'Untitled';
    return raw.replace(/^Module\s+\d+:\s*/i, '');
  };

  const navigateToModule = (id: string) => navigate(`${basePath}/module/${id}`);

  // Section header component
  const SectionHeader = ({
    icon, title, subtitle, count,
  }: { icon: React.ReactNode; title: string; subtitle: string; count: number }) => (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: BDA.blueMid }}
        >
          <span style={{ color: BDA.navy }}>{icon}</span>
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: BDA.navyDark }}>
            {title}
          </h2>
          <p className="text-xs" style={{ color: '#64748b' }}>{subtitle}</p>
        </div>
      </div>
      <span
        className="text-xs font-semibold px-3 py-1 rounded-full"
        style={{ background: BDA.blueSoft, color: BDA.navy }}
      >
        {count} modules
      </span>
    </div>
  );

  return (
    <div style={{ background: BDA.bluePale, minHeight: '100vh', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* ── Page Header ── */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ background: BDA.navy }}
          >
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: BDA.navyDark }}>
              BDA Learning System
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
              Body of Competency &amp; Knowledge (BoCK) · {totalModules} Modules
            </p>
          </div>
        </div>

        {/* ── Access + Progress Banner ── */}
        <div
          className="mb-5 px-5 py-4 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{
            background: '#fff',
            borderColor: isExpiringSoon ? '#fde68a' : BDA.border,
            boxShadow: '0 1px 4px rgba(15,145,224,0.07)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: isExpiringSoon ? '#fef3c7' : BDA.blueMid }}
            >
              <Calendar className="w-4 h-4" style={{ color: isExpiringSoon ? '#d97706' : BDA.blue }} />
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: BDA.navyDark }}>
                Access valid until {format(expiryDate, 'MMMM d, yyyy')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: isExpiringSoon ? '#d97706' : '#64748b' }}>
                {daysUntilExpiry} days remaining{isExpiringSoon && ' · Consider renewing soon'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 min-w-[240px]">
            <div className="flex-1 rounded-full h-2" style={{ background: BDA.blueMid }}>
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%`, background: BDA.blue }}
              />
            </div>
            <span className="text-sm font-bold whitespace-nowrap" style={{ color: BDA.navy }}>
              {completedCount}/{totalModules} completed
            </span>
          </div>
        </div>

        {/* ── Stats Row ── */}
        {overallProgress && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              {
                icon: <TrendingUp className="w-4 h-4" />,
                label: 'Overall Progress',
                value: `${progressPct}%`,
                sub: 'of curriculum',
              },
              {
                icon: <CheckCircle2 className="w-4 h-4" />,
                label: 'Completed',
                value: `${completedCount}`,
                sub: 'modules done',
              },
              {
                icon: <Clock className="w-4 h-4" />,
                label: 'Time Spent',
                value: `${timeSpentHours}h`,
                sub: 'learning time',
              },
              {
                icon: <BarChart2 className="w-4 h-4" />,
                label: 'Remaining',
                value: `${totalModules - completedCount}`,
                sub: 'modules left',
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-2xl border p-4"
                style={{
                  background: '#fff',
                  borderColor: BDA.borderLight,
                  boxShadow: '0 1px 3px rgba(15,145,224,0.07)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: BDA.blueMid }}
                  >
                    <span style={{ color: BDA.blue }}>{stat.icon}</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#64748b' }}>{stat.label}</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: BDA.navyDark }}>{stat.value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{stat.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Continue Learning CTA ── */}
        {nextModule && (
          <div
            className="rounded-2xl p-5 mb-8 flex items-center justify-between gap-4"
            style={{
              background: `linear-gradient(135deg, ${BDA.navy} 0%, #0a2d6e 100%)`,
              boxShadow: '0 4px 20px rgba(28,74,139,0.25)',
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                <PlayCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#93c5fd' }}>
                  Continue Learning
                </p>
                <h3 className="text-base font-bold text-white leading-snug">
                  {getModuleName(nextModule)}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: '#bfdbfe' }}>
                  Module {nextModule.order_index} · {Math.ceil((nextModule.estimated_minutes || 120) / 60)}h estimated
                </p>
              </div>
            </div>
            <button
              onClick={() => navigateToModule(nextModule.id)}
              className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 hover:shadow-md"
              style={{ background: '#fff', color: BDA.navy }}
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Program Introduction ── */}
        {introModules.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              icon={<PlayCircle className="w-5 h-5" />}
              title="Program Introduction"
              subtitle="Start here — orientation and overview"
              count={introModules.length}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {introModules.map((m) => (
                <ModuleCard key={m.id} module={m} onClick={() => navigateToModule(m.id)} showArabicName={false} />
              ))}
            </div>
          </section>
        )}

        {/* ── Behavioural Competencies ── */}
        {behavioralModules.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              icon={<Zap className="w-5 h-5" />}
              title="Behavioural Competencies"
              subtitle="Essential professional skills for BD practitioners"
              count={behavioralModules.length}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {behavioralModules.map((m) => (
                <ModuleCard key={m.id} module={m} onClick={() => navigateToModule(m.id)} showArabicName={false} />
              ))}
            </div>
          </section>
        )}

        {/* ── Knowledge-Based Competencies ── */}
        {knowledgeModules.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              icon={<Brain className="w-5 h-5" />}
              title="Knowledge-Based Competencies"
              subtitle="Core business development expertise and frameworks"
              count={knowledgeModules.length}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {knowledgeModules.map((m) => (
                <ModuleCard key={m.id} module={m} onClick={() => navigateToModule(m.id)} showArabicName={false} />
              ))}
            </div>
          </section>
        )}

        {/* ── Program Wrap-Up ── */}
        {outroModules.length > 0 && (
          <section className="mb-10">
            <SectionHeader
              icon={<Flag className="w-5 h-5" />}
              title="Program Wrap-Up"
              subtitle="Final reflection and next steps"
              count={outroModules.length}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {outroModules.map((m) => (
                <ModuleCard key={m.id} module={m} onClick={() => navigateToModule(m.id)} showArabicName={false} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
