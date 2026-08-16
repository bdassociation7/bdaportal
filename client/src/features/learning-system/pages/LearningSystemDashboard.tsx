/**
 * BDA Learning System Dashboard
 *
 * A learning-led dashboard with a BDA hero, examination goal, competency
 * carousels and external professional-development resources.
 */

import { useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  useModulesWithProgress,
  useOverallProgress,
  useUserAccesses,
  type CurriculumModuleWithStatus,
} from '@/entities/curriculum';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  LibraryBig,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { ExamGoalWidget } from '@/features/learning-goals';

const BDA = {
  navy: '#0d1f4e',
  deepBlue: '#1c4a8b',
  primary: '#0f91e0',
  pale: '#f0f6ff',
  border: '#dbeafe',
};

interface CarouselSectionProps {
  title: string;
  eyebrow: string;
  description: string;
  modules: CurriculumModuleWithStatus[];
  basePath: string;
}

const competencyImages = [
  '/images/learning-dashboard/competency-strategy.jpg',
  '/images/learning-dashboard/competency-meeting.jpg',
  '/images/learning-dashboard/competency-learning.jpg',
  '/images/learning-dashboard/competency-teamwork.jpg',
  '/images/learning-dashboard/competency-analysis.jpg',
];

function CompetencyCard({ module, basePath }: { module: CurriculumModuleWithStatus; basePath: string }) {
  const navigate = useNavigate();
  const progress = (module.user_progress as { progress_percentage?: number } | undefined)?.progress_percentage ?? 0;
  const isComplete = module.user_progress?.status === 'completed';

  return (
    <button
      type="button"
      onClick={() => navigate(`${basePath}/module/${module.id}`)}
      className="group min-w-[290px] snap-start overflow-hidden rounded-2xl border border-[#dbeafe] bg-white text-left shadow-[0_7px_20px_rgba(13,31,78,0.07)] transition-all duration-200 hover:-translate-y-1 hover:border-[#0f91e0] hover:shadow-[0_16px_30px_rgba(15,145,224,0.16)] sm:min-w-[316px]"
    >
      <div className="relative h-36 overflow-hidden bg-[#0d1f4e]">
        <img
          src={competencyImages[Math.max(0, ((module.order_index ?? 1) - 1) % competencyImages.length)]}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f4e]/70 via-[#0d1f4e]/10 to-[#0f91e0]/15" />
        <span className="absolute bottom-3 left-4 inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-white/95 px-2 text-sm font-bold text-[#1c4a8b] shadow-sm">
          {String(module.order_index ?? 0).padStart(2, '0')}
        </span>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <span className="text-xs font-semibold text-slate-400">Competency</span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
            isComplete ? 'bg-[#e6f4ff] text-[#0f91e0]' : 'bg-[#f6f9fe] text-slate-400'
          }`}>
            {isComplete ? 'Completed' : progress > 0 ? `${Math.round(progress)}% complete` : 'Explore'}
          </span>
        </div>
        <h3 className="min-h-[48px] text-base font-bold leading-snug text-[#0d1f4e]">
          {module.competency_name}
        </h3>
        <p className="mt-2 line-clamp-2 min-h-[38px] text-xs leading-relaxed text-slate-500">
          {module.description || 'Build practical capability through focused BDA learning content.'}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-[#edf3fb] pt-4 text-sm font-semibold text-[#1c4a8b]">
          <span>Explore competency</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </button>
  );
}

function CompetencyCarousel({ title, eyebrow, description, modules, basePath }: CarouselSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * 336, behavior: 'smooth' });
  };

  if (modules.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f91e0]">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#0d1f4e]">{title}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={`Previous ${title}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#dbeafe] bg-white text-[#1c4a8b] shadow-sm transition-colors hover:bg-[#f0f6ff]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={`Next ${title}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0f91e0] text-white shadow-[0_5px_14px_rgba(15,145,224,0.25)] transition-colors hover:bg-[#1c4a8b]"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {modules.map((module) => (
          <CompetencyCard key={module.id} module={module} basePath={basePath} />
        ))}
      </div>
    </section>
  );
}

const resources = [
  {
    title: 'Mock Exams',
    description: 'Practise under timed conditions and build confidence before your certification exam.',
    href: 'https://bda-global.org/en/store/bda-mock-exams/',
    icon: ClipboardCheck,
    image: '/images/learning-dashboard/competency-analysis.jpg',
  },
  {
    title: 'BDA Certification Study Plan',
    description: 'Follow a structured preparation plan designed for steady, focused progress.',
    href: 'https://bda-global.org/en/product/bda-certification-study-plan/',
    icon: CalendarDays,
    image: '/images/learning-dashboard/competency-strategy.jpg',
  },
  {
    title: 'BDA Glossary',
    description: 'Review essential business development terminology and definitions.',
    href: 'https://bda-global.org/en/store/bda-glossary/',
    icon: LibraryBig,
    image: '/images/learning-dashboard/competency-learning.jpg',
  },
  {
    title: 'BDA BoCK',
    description: 'Access the official BDA Body of Competency and Knowledge reference.',
    href: 'https://bda-global.org/en/store/bda-bock/',
    icon: BookOpen,
    image: '/images/learning-dashboard/competency-teamwork.jpg',
  },
  {
    title: 'BDA Membership',
    description: 'Explore membership benefits and continue your professional development journey.',
    href: 'https://bda-global.org/en/store/individual-membership/',
    icon: UsersRound,
    image: '/images/learning-dashboard/competency-meeting.jpg',
  },
];

function AdditionalResources() {
  return (
    <section className="border-t border-[#e2eaf6] pt-10">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f91e0]">Continue developing</p>
        <h2 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#0d1f4e]">Additional Resources</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
          Extend your learning with BDA resources designed to support certification readiness and ongoing professional growth.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {resources.map((resource) => {
          const Icon = resource.icon;
          return (
            <a
              key={resource.title}
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-[274px] flex-col overflow-hidden rounded-2xl border border-[#dbeafe] bg-white shadow-[0_7px_20px_rgba(13,31,78,0.06)] transition-all duration-200 hover:-translate-y-1 hover:border-[#0f91e0] hover:shadow-[0_16px_30px_rgba(15,145,224,0.15)]"
            >
              <div className="relative h-32 overflow-hidden bg-[#0d1f4e]">
                <img src={resource.image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f4e]/65 to-[#0f91e0]/10" />
                <span className="absolute bottom-3 left-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-[#1c4a8b] shadow-sm">
                  <Icon className="h-4.5 w-4.5" />
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-bold leading-snug text-[#0d1f4e]">{resource.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{resource.description}</p>
                <span className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-semibold text-[#0f91e0]">
                  View resource <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

export function LearningSystemDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const basePath = location.pathname.startsWith('/ecp/')
    ? '/ecp/learning-system'
    : location.pathname.startsWith('/instructor/')
      ? '/instructor/learning-system'
      : '/learning-system';

  const { data: accessSummary, isLoading: isLoadingAccess } = useUserAccesses(user?.id);
  const hasAccess = accessSummary?.has_en;
  const displayAccess = accessSummary?.accesses?.find((access) => access.language === 'EN') || accessSummary?.accesses?.[0];
  const { data: trainingProgress } = useOverallProgress(user?.id, 'CP', 'en');
  const { data: modules = [], isLoading: isLoadingModules } = useModulesWithProgress(user?.id, 'CP', Boolean(hasAccess), 'en');

  const behaviouralModules = modules.filter((module) => module.section_type === 'behavioral');
  const knowledgeModules = modules.filter((module) => module.section_type === 'knowledge_based');
  const pct = trainingProgress?.percentage || 0;
  const completedModules = trainingProgress?.completed || 0;
  const totalModules = trainingProgress?.total || modules.length || 14;

  if (isLoadingAccess || isLoadingModules) {
    return (
      <div className="flex min-h-[calc(100vh-82px)] items-center justify-center bg-[#f8f9fb] sm:min-h-[calc(100vh-92px)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#dbeafe] border-t-[#0f91e0]" />
          <p className="text-sm font-medium text-slate-500">Loading your learning journey...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-[calc(100vh-82px)] items-center justify-center bg-[#f8f9fb] px-4 sm:min-h-[calc(100vh-92px)]">
        <div className="w-full max-w-md rounded-3xl border border-[#dbeafe] bg-white p-10 text-center shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f91e0] shadow-lg">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-[#0d1f4e]">Access Required</h2>
          <p className="mb-7 text-sm leading-relaxed text-slate-500">
            You need to purchase the BDA Learning System to access learning content and professional development tools.
          </p>
          <button
            type="button"
            onClick={() => window.open('https://bda-global.org/en/store/bda-learning-system/', '_blank')}
            className="w-full rounded-xl bg-[#0f91e0] px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#1c4a8b]"
          >
            Purchase Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-82px)] flex-col bg-white sm:min-h-[calc(100vh-92px)]">
      <section className="relative w-full overflow-hidden bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0] py-12 text-white shadow-[0_16px_34px_rgba(13,31,78,0.16)] sm:py-14 lg:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_14%,rgba(255,255,255,0.22),transparent_23%),radial-gradient(circle_at_72%_100%,rgba(15,145,224,0.55),transparent_36%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0]" />
          <div className="relative mx-auto flex max-w-[1640px] flex-col gap-8 px-6 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:px-16 xl:px-24">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white/90">
                <Trophy className="h-3.5 w-3.5" /> BDA Learning Journey
              </span>
              <h1 className="mt-5 text-3xl font-bold tracking-[-0.035em] sm:text-4xl lg:text-5xl">
                Build your BDA capability, one competency at a time.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
                Follow a structured path through the BDA Body of Competency and Knowledge, strengthen your professional practice, and prepare with confidence.
              </p>
              <button
                type="button"
                onClick={() => navigate(`${basePath}/training-kits`)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#1c4a8b] shadow-[0_7px_18px_rgba(0,0,0,0.18)] transition-colors hover:bg-[#f0f6ff]"
              >
                Explore competencies <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="min-w-[210px] rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm sm:min-w-[250px]">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-white/85">Learning progress</span>
                <span className="text-3xl font-bold">{pct}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-3 text-xs font-medium text-white/75">{completedModules} of {totalModules} modules completed</p>
            </div>
          </div>
        </section>

        <main className="mx-auto w-full max-w-[1640px] space-y-20 px-6 py-14 sm:px-10 sm:py-16 lg:px-16 lg:py-20 xl:px-24">
        <section>
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0f91e0]">Plan your preparation</p>
            <h2 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#0d1f4e]">Set Your Exam Date</h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
              Choose a target exam window and let your BDA learning journey work around your professional goal.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#dbeafe] bg-white shadow-[0_5px_16px_rgba(13,31,78,0.05)] [&_>div]:border-0 [&_>div]:shadow-none">
            <ExamGoalWidget
              certType="CP"
              totalModules={totalModules}
              completedModules={completedModules}
              accessExpiresAt={displayAccess?.expires_at ?? null}
            />
          </div>
        </section>

        <CompetencyCarousel
          title="Behavioural Competencies"
          eyebrow="Develop how you lead, communicate and influence"
          description="Build the professional behaviours that enable effective, trusted and commercially focused business development practice."
          modules={behaviouralModules}
          basePath={basePath}
        />

        <CompetencyCarousel
          title="Knowledge-Based Competencies"
          eyebrow="Strengthen the technical foundations of business development"
          description="Explore the practical knowledge areas that support informed commercial decisions, strategic insight and sustainable growth."
          modules={knowledgeModules}
          basePath={basePath}
        />

        <AdditionalResources />
        </main>
      <footer className="mt-auto w-full bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0] px-6 py-5 text-center text-sm font-medium text-white/90 sm:px-10 lg:px-16">
        © {new Date().getFullYear()} Business Development Association. All rights reserved.
      </footer>
    </div>
  );
}
