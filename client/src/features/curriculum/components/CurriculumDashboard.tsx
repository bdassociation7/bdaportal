import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Award, TrendingUp, ArrowLeft, BookOpen, PlayCircle, CheckCircle2, ChevronRight, Brain, Zap, Flag } from 'lucide-react';
import { ModuleCard } from './ModuleCard';
import type {
  UserCurriculumAccess,
  CurriculumModuleWithStatus,
} from '@/entities/curriculum';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

// BDA Brand Colors
const BDA = {
  navy: '#1C4A8B',
  navyDark: '#0d1f4e',
  blue: '#0f91e0',
  bluePale: '#f0f6ff',
  blueMid: '#e8f0fb',
  border: '#d0e4f7',
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
  selectedLanguage?: 'EN' | 'AR';
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
  const isArabicContent = selectedLanguage === 'AR';

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

  const getModuleName = (m: CurriculumModuleWithStatus) => {
    const raw = isArabicContent
      ? (m.competency_name_ar || m.competency_name || 'Untitled')
      : (m.competency_name || m.competency_name_ar || 'Untitled');
    return raw.replace(/^Module\s+\d+:\s*/i, '');
  };

  const navigateToModule = (id: string) => navigate(`${basePath}/module/${id}`);

  return (
    <div
      className="min-h-screen"
      style={{ background: BDA.bluePale, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* ── Header ── */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(backPath)}
            className="mb-4 gap-2 font-medium"
            style={{ color: BDA.navy }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Learning System
          </Button>

          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{ background: BDA.navy }}
            >
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1
                className="text-3xl font-bold"
                style={{ color: BDA.navyDark, fontFamily: "'Playfair Display', 'Georgia', serif" }}
              >
                BDA Learning System
              </h1>
              <p className="text-sm mt-0.5" style={{ color: '#64748b' }}>
                Body of Competency & Knowledge (BoCK) · 16 Modules · 52 Lessons
                {isArabicContent && (
                  <span className="ml-2 font-semibold" style={{ color: BDA.blue }}>
                    · Arabic Content
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Access Banner + Progress ── */}
        <div
          className="mb-6 p-4 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{
            background: isExpiringSoon ? '#fffbeb' : '#fff',
            borderColor: isExpiringSoon ? '#fde68a' : BDA.border,
            boxShadow: '0 1px 4px rgba(28,74,139,0.06)',
          }}
        >
          <div className="flex items-center gap-3">
            <Calendar
              className="w-5 h-5 flex-shrink-0"
              style={{ color: isExpiringSoon ? '#d97706' : BDA.blue }}
            />
            <div>
              <p className="font-semibold text-sm" style={{ color: BDA.navyDark }}>
                Access valid until {format(expiryDate, 'MMMM d, yyyy')}
              </p>
              <p className="text-xs mt-0.5" style={{ color: isExpiringSoon ? '#d97706' : '#64748b' }}>
                {daysUntilExpiry} days remaining
                {isExpiringSoon && ' · Consider renewing soon'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 min-w-[220px]">
            <div className="flex-1 rounded-full h-2.5" style={{ background: BDA.blueMid }}>
              <div
                className="h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: BDA.navy }}
              />
            </div>
            <span className="text-sm font-semibold whitespace-nowrap" style={{ color: BDA.navy }}>
              {completedCount}/{totalModules} completed
            </span>
          </div>
        </div>

        {/* ── Stats Row ── */}
        {overallProgress && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              {
                icon: <TrendingUp className="w-4 h-4" style={{ color: BDA.blue }} />,
                label: 'Overall Progress',
                value: `${progressPct}%`,
                color: BDA.blue,
              },
              {
                icon: <CheckCircle2 className="w-4 h-4" style={{ color: '#16a34a' }} />,
                label: 'Completed',
                value: `${completedCount}`,
                sub: 'modules',
                color: '#16a34a',
              },
              {
                icon: <Clock className="w-4 h-4" style={{ color: '#7c3aed' }} />,
                label: 'Time Spent',
                value: `${Math.floor((overallProgress.totalTimeSpent || 0) / 60)}h`,
                sub: 'learning time',
                color: '#7c3aed',
              },
              {
                icon: <Award className="w-4 h-4" style={{ color: '#d97706' }} />,
                label: 'Remaining',
                value: `${totalModules - completedCount}`,
                sub: 'modules left',
                color: '#d97706',
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="rounded-2xl border p-4"
                style={{ background: '#fff', borderColor: BDA.border, boxShadow: '0 1px 4px rgba(28,74,139,0.06)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  {stat.icon}
                  <span className="text-xs font-medium text-gray-500">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                {stat.sub && <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ── Continue Learning CTA ── */}
        {nextModule && (
          <div
            className="rounded-2xl shadow-lg p-5 mb-8 text-white"
            style={{ background: `linear-gradient(135deg, ${BDA.navy} 0%, #0d2461 100%)` }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <PlayCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#93c5fd' }}>
                    Continue Learning
                  </p>
                  <h3
                    className="text-lg font-bold"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                    dir={isArabicContent ? 'rtl' : 'ltr'}
                  >
                    {getModuleName(nextModule)}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: '#bfdbfe' }}>
                    Module {nextModule.order_index} · {Math.ceil((nextModule.estimated_minutes || 120) / 60)}h estimated
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigateToModule(nextModule.id)}
                className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 font-semibold rounded-xl transition text-sm hover:opacity-90"
                style={{ background: '#fff', color: BDA.navy }}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Section helper ── */}
        {(() => {
          const SectionHeader = ({
            icon, title, subtitle, iconBg, iconColor,
          }: { icon: React.ReactNode; title: string; subtitle: string; iconBg: string; iconColor: string }) => (
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
                <span style={{ color: iconColor }}>{icon}</span>
              </div>
              <div>
                <h2
                  className="text-xl font-bold"
                  style={{ color: BDA.navyDark, fontFamily: "'Playfair Display', serif" }}
                >
                  {title}
                </h2>
                <p className="text-sm" style={{ color: '#64748b' }}>{subtitle}</p>
              </div>
            </div>
          );

          return (
            <>
              {/* Program Introduction */}
              {introModules.length > 0 && (
                <section className="mb-10">
                  <SectionHeader
                    icon={<PlayCircle className="w-5 h-5" />}
                    title="Program Introduction"
                    subtitle="Start here — orientation and overview"
                    iconBg="#ede9fe"
                    iconColor="#7c3aed"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {introModules.map((m) => (
                      <ModuleCard key={m.id} module={m} onClick={() => navigateToModule(m.id)} showArabicName={isArabicContent} />
                    ))}
                  </div>
                </section>
              )}

              {/* Behavioral Competencies */}
              {behavioralModules.length > 0 && (
                <section className="mb-10">
                  <SectionHeader
                    icon={<Zap className="w-5 h-5" />}
                    title="Behavioral Competencies"
                    subtitle={`${behavioralModules.length} competencies · Essential professional skills`}
                    iconBg={BDA.blueMid}
                    iconColor={BDA.navy}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {behavioralModules.map((m) => (
                      <ModuleCard key={m.id} module={m} onClick={() => navigateToModule(m.id)} showArabicName={isArabicContent} />
                    ))}
                  </div>
                </section>
              )}

              {/* Knowledge-Based Competencies */}
              {knowledgeModules.length > 0 && (
                <section className="mb-10">
                  <SectionHeader
                    icon={<Brain className="w-5 h-5" />}
                    title="Knowledge-Based Competencies"
                    subtitle={`${knowledgeModules.length} competencies · Core business development expertise`}
                    iconBg="#e0f2fe"
                    iconColor="#0369a1"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {knowledgeModules.map((m) => (
                      <ModuleCard key={m.id} module={m} onClick={() => navigateToModule(m.id)} showArabicName={isArabicContent} />
                    ))}
                  </div>
                </section>
              )}

              {/* Program Wrap-Up */}
              {outroModules.length > 0 && (
                <section className="mb-10">
                  <SectionHeader
                    icon={<Flag className="w-5 h-5" />}
                    title="Program Wrap-Up"
                    subtitle="Final reflection and next steps"
                    iconBg="#fef3c7"
                    iconColor="#d97706"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {outroModules.map((m) => (
                      <ModuleCard key={m.id} module={m} onClick={() => navigateToModule(m.id)} showArabicName={isArabicContent} />
                    ))}
                  </div>
                </section>
              )}
            </>
          );
        })()}

      </div>
    </div>
  );
}
