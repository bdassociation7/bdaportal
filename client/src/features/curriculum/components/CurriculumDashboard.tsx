import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  Award,
  BookOpen,
  PlayCircle,
  CheckCircle2,
  ChevronRight,
  Brain,
  Zap,
  Flag,
  ArrowLeft,
} from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import type {
  UserCurriculumAccess,
  CurriculumModuleWithStatus,
} from "@/entities/curriculum";
import { format } from "date-fns";

const BDA = {
  navy: "#1C4A8B",
  navyDark: "#0d1f4e",
  blue: "#0f91e0",
  bluePale: "#f0f6ff",
  blueMid: "#dbeafe",
  border: "#d0e4f7",
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
  selectedLanguage?: "EN";
}

interface SectionProps {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  modules: CurriculumModuleWithStatus[];
  onModuleClick: (id: string) => void;
}

function ModuleSection({
  icon,
  eyebrow,
  title,
  description,
  modules,
  onModuleClick,
}: SectionProps) {
  if (modules.length === 0) return null;

  return (
    <section className="space-y-6">
      <div
        className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"
        style={{ borderColor: "#e2eaf6" }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: BDA.bluePale, color: BDA.navy }}
          >
            {icon}
          </div>
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.16em]"
              style={{ color: BDA.blue }}
            >
              {eyebrow}
            </p>
            <h2
              className="mt-1 text-2xl font-bold tracking-[-0.02em]"
              style={{ color: BDA.navyDark }}
            >
              {title}
            </h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          </div>
        </div>
        <span
          className="self-start rounded-full px-3 py-1.5 text-xs font-bold sm:self-auto"
          style={{ background: BDA.bluePale, color: BDA.navy }}
        >
          {modules.length}{" "}
          {modules.length === 1 ? "competency" : "competencies"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            onClick={() => onModuleClick(module.id)}
            showArabicName={false}
          />
        ))}
      </div>
    </section>
  );
}

export function CurriculumDashboard({
  access,
  knowledgeModules,
  behavioralModules,
  introModules = [],
  outroModules = [],
  overallProgress,
  nextModule,
  basePath = "/learning-system/training-kits",
  backPath = "/learning-system",
}: CurriculumDashboardProps) {
  const navigate = useNavigate();
  const expiryDate = new Date(access.expires_at);
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const totalModules =
    introModules.length +
    behavioralModules.length +
    knowledgeModules.length +
    outroModules.length;
  const completedCount = overallProgress?.completed || 0;
  const progressPct =
    totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
  const timeSpentHours = Math.floor(
    (overallProgress?.totalTimeSpent || 0) / 60,
  );
  const nextTitle =
    nextModule?.competency_name?.replace(/^Module\s+\d+:\s*/i, "") ||
    "Your next competency";
  const goToModule = (id: string) => navigate(`${basePath}/module/${id}`);

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0d1f4e] via-[#1c4a8b] to-[#0f91e0] py-12 text-white sm:py-14 lg:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(255,255,255,0.18),transparent_25%),radial-gradient(circle_at_68%_100%,rgba(15,145,224,0.45),transparent_38%)]" />
        <div className="relative mx-auto flex max-w-[1640px] flex-col gap-8 px-6 sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:px-16 xl:px-24">
          <div className="max-w-3xl">
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/75 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Learning System
            </button>
            <span className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white/90">
              <BookOpen className="h-3.5 w-3.5" /> BDA Training Kits
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-[-0.035em] sm:text-4xl lg:text-5xl">
              Learn the BDA Body of Competency and Knowledge.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
              Explore a structured set of behavioural and knowledge-based
              competencies designed to build confident, commercially focused
              business development practice.
            </p>
            {nextModule && (
              <button
                type="button"
                onClick={() => goToModule(nextModule.id)}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold shadow-[0_7px_18px_rgba(0,0,0,0.18)] transition-colors hover:bg-[#f0f6ff]"
                style={{ color: BDA.navy }}
              >
                Continue: {nextTitle} <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3 sm:min-w-[330px]">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold text-white/75">
                Curriculum progress
              </p>
              <p className="mt-1 text-3xl font-bold">{progressPct}%</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold text-white/75">Completed</p>
              <p className="mt-1 text-3xl font-bold">
                {completedCount}
                <span className="ml-1 text-base font-semibold text-white/70">
                  / {totalModules}
                </span>
              </p>
              <p className="mt-3 text-xs font-medium text-white/75">
                {timeSpentHours}h learning time
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1640px] space-y-20 px-6 py-14 sm:px-10 sm:py-16 lg:px-16 lg:py-20 xl:px-24">
        <section
          className="grid gap-6 rounded-2xl border bg-white p-6 shadow-[0_7px_20px_rgba(13,31,78,0.05)] lg:grid-cols-[1.3fr_1fr] lg:items-center lg:p-8"
          style={{ borderColor: BDA.border }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ background: BDA.bluePale, color: BDA.navy }}
            >
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p
                className="text-xs font-bold uppercase tracking-[0.14em]"
                style={{ color: BDA.blue }}
              >
                Your access
              </p>
              <h2
                className="mt-1 text-xl font-bold"
                style={{ color: BDA.navyDark }}
              >
                Keep your learning journey moving.
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Your BDA Learning System access is valid until{" "}
                {format(expiryDate, "MMMM d, yyyy")} —{" "}
                {Math.max(0, daysUntilExpiry)} days remaining.
              </p>
            </div>
          </div>
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: BDA.bluePale }}
          >
            <div
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: BDA.navy }}
            >
              <Award className="h-4 w-4" /> Your learning goal
            </div>
            <span className="text-xs font-bold" style={{ color: BDA.blue }}>
              {progressPct}% complete
            </span>
          </div>
        </section>

        <ModuleSection
          icon={<PlayCircle className="h-5 w-5" />}
          eyebrow="Begin here"
          title="Programme Introduction"
          description="Start with orientation content that introduces the BDA learning experience and the structure of the curriculum."
          modules={introModules}
          onModuleClick={goToModule}
        />
        <ModuleSection
          icon={<Zap className="h-5 w-5" />}
          eyebrow="Develop how you lead, communicate and influence"
          title="Behavioural Competencies"
          description="Build the professional behaviours that enable effective, trusted and commercially focused business development practice."
          modules={behavioralModules}
          onModuleClick={goToModule}
        />
        <ModuleSection
          icon={<Brain className="h-5 w-5" />}
          eyebrow="Strengthen technical foundations"
          title="Knowledge-Based Competencies"
          description="Explore the practical knowledge areas that support informed commercial decisions, strategic insight and sustainable growth."
          modules={knowledgeModules}
          onModuleClick={goToModule}
        />
        <ModuleSection
          icon={<Flag className="h-5 w-5" />}
          eyebrow="Conclude and reflect"
          title="Programme Wrap-Up"
          description="Complete the final reflection and consolidate your learning journey."
          modules={outroModules}
          onModuleClick={goToModule}
        />
      </main>
    </div>
  );
}
