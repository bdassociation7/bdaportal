import {
  CheckCircle2,
  Clock,
  BookOpen,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import type { CurriculumModuleWithStatus } from "@/entities/curriculum";

const BDA = {
  navy: "#1C4A8B",
  navyDark: "#0d1f4e",
  blue: "#0f91e0",
  bluePale: "#f0f6ff",
  blueMid: "#dbeafe",
  border: "#d0e4f7",
};

interface ModuleCardProps {
  module: CurriculumModuleWithStatus;
  onClick: () => void;
  showArabicName?: boolean;
}

const SECTION_LABELS: Record<string, string> = {
  intro: "Introduction",
  behavioral: "Behavioural",
  knowledge_based: "Knowledge",
  outro: "Wrap-Up",
};

const cardImages = [
  "/images/learning-dashboard/competency-strategy.jpg",
  "/images/learning-dashboard/competency-meeting.jpg",
  "/images/learning-dashboard/competency-learning.jpg",
  "/images/learning-dashboard/competency-teamwork.jpg",
  "/images/learning-dashboard/competency-analysis.jpg",
];

export function ModuleCard({
  module,
  onClick,
  showArabicName = false,
}: ModuleCardProps) {
  const progress = module.user_progress;
  const isCompleted = progress?.status === "completed";
  const isInProgress =
    progress?.status === "in_progress" || progress?.status === "quiz_pending";
  const progressPct = progress?.progress_percentage || 0;
  const sectionType = module.section_type || "knowledge_based";
  const sectionLabel = SECTION_LABELS[sectionType] || "Module";
  const moduleName = showArabicName
    ? module.competency_name_ar || module.competency_name || "وحدة بدون عنوان"
    : module.competency_name || module.competency_name_ar || "Untitled Module";
  const cleanName = moduleName.replace(/^Module\s+\d+:\s*/i, "");
  const estimatedHours = Math.ceil((module.estimated_minutes || 60) / 60);
  const imageIndex = Math.max(
    0,
    ((module.order_index ?? 1) - 1) % cardImages.length,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[330px] w-full flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-[0_7px_20px_rgba(13,31,78,0.07)] transition-all duration-200 hover:-translate-y-1 hover:border-[#0f91e0] hover:shadow-[0_17px_32px_rgba(15,145,224,0.16)]"
      style={{
        borderColor: isCompleted ? "#9ed9fb" : BDA.border,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
      aria-label={`Open ${cleanName}`}
    >
      <div className="relative h-36 w-full overflow-hidden bg-[#0d1f4e]">
        <img
          src={cardImages[imageIndex]}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f4e]/75 via-[#0d1f4e]/15 to-[#0f91e0]/10" />
        <span
          className="absolute bottom-3 left-4 inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-white/95 px-2 text-sm font-bold shadow-sm"
          style={{ color: BDA.navy }}
        >
          {String(module.order_index ?? 0).padStart(2, "0")}
        </span>
        {isCompleted && (
          <span
            className="absolute right-4 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm"
            title="Completed"
          >
            <CheckCircle2 className="h-4.5 w-4.5" style={{ color: BDA.blue }} />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span
            className="text-xs font-semibold uppercase tracking-[0.12em]"
            style={{ color: BDA.navy }}
          >
            {sectionLabel}
          </span>
          {isInProgress && !isCompleted && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{ background: BDA.bluePale, color: BDA.blue }}
            >
              <PlayCircle className="h-3 w-3" /> In progress
            </span>
          )}
          {!isInProgress && !isCompleted && (
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
              Explore
            </span>
          )}
          {isCompleted && (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{ color: BDA.blue }}
            >
              Completed
            </span>
          )}
        </div>

        <h3
          className="min-h-[48px] text-base font-bold leading-snug"
          style={{ color: BDA.navyDark }}
          dir={showArabicName ? "rtl" : "ltr"}
        >
          {cleanName}
        </h3>

        {!showArabicName && (
          <p className="mt-2 line-clamp-2 min-h-[38px] text-xs leading-relaxed text-slate-500">
            {module.description ||
              "Build practical business development capability through focused learning content."}
          </p>
        )}
        {showArabicName && module.description_ar && (
          <p
            className="mt-2 line-clamp-2 min-h-[38px] text-xs leading-relaxed text-slate-500"
            dir="rtl"
          >
            {module.description_ar}
          </p>
        )}

        <div className="mt-4">
          <div
            className="h-1.5 overflow-hidden rounded-full"
            style={{ background: BDA.blueMid }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: BDA.blue }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              {estimatedHours}h
            </span>
            <span className="font-semibold" style={{ color: BDA.blue }}>
              {progressPct > 0
                ? `${Math.round(progressPct)}% complete`
                : "Start learning"}
            </span>
          </div>
        </div>

        <div
          className="mt-4 flex items-center justify-between border-t pt-3 text-sm font-semibold"
          style={{ borderColor: "#edf3fb", color: BDA.navy }}
        >
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            Open competency
          </span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </button>
  );
}
