import { CheckCircle2, Clock, BookOpen, ChevronRight, PlayCircle } from 'lucide-react';
import type { CurriculumModuleWithStatus } from '@/entities/curriculum';

// BDA Brand Colors — strict blue palette only
const BDA = {
  navy: '#1C4A8B',
  navyDark: '#0d1f4e',
  blue: '#0f91e0',
  bluePale: '#f5f9ff',
  blueMid: '#e8f0fb',
  blueSoft: '#dbeafe',
  border: '#d0e4f7',
};

interface ModuleCardProps {
  module: CurriculumModuleWithStatus;
  onClick: () => void;
  showArabicName?: boolean;
}

// Section-type badge styles — all within BDA blue palette
const SECTION_STYLES: Record<string, { badge: React.CSSProperties; accent: string }> = {
  intro:           { badge: { background: BDA.blueMid, color: BDA.navy }, accent: BDA.navy },
  behavioral:      { badge: { background: BDA.blueSoft, color: BDA.navy }, accent: BDA.navy },
  knowledge_based: { badge: { background: '#e0f2fe', color: '#0369a1' }, accent: BDA.blue },
  outro:           { badge: { background: BDA.blueMid, color: BDA.navy }, accent: BDA.navy },
};

const SECTION_LABELS: Record<string, string> = {
  intro: 'Introduction',
  behavioral: 'Behavioural',
  knowledge_based: 'Knowledge',
  outro: 'Wrap-Up',
};

export function ModuleCard({ module, onClick, showArabicName = false }: ModuleCardProps) {
  const progress = module.user_progress;
  const isCompleted = progress?.status === 'completed';
  const isInProgress = progress?.status === 'in_progress' || progress?.status === 'quiz_pending';
  const progressPct = progress?.progress_percentage || 0;

  const sectionType = module.section_type || 'knowledge_based';
  const style = SECTION_STYLES[sectionType] || SECTION_STYLES['knowledge_based'];
  const sectionLabel = SECTION_LABELS[sectionType] || 'Module';

  const moduleName = showArabicName
    ? (module.competency_name_ar || module.competency_name || 'وحدة بدون عنوان')
    : (module.competency_name || module.competency_name_ar || 'Untitled Module');

  const cleanName = moduleName.replace(/^Module\s+\d+:\s*/i, '');
  const estimatedHours = Math.ceil((module.estimated_minutes || 60) / 60);

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col"
      style={{
        border: isCompleted
          ? `1px solid ${BDA.blue}40`
          : isInProgress
          ? `1px solid ${BDA.border}`
          : '1px solid #e8f0fb',
        background: isCompleted ? BDA.bluePale : '#ffffff',
        boxShadow: '0 1px 3px rgba(15,145,224,0.07)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* Top accent line for completed */}
      {isCompleted && (
        <div
          className="h-1 rounded-t-2xl w-full"
          style={{ background: BDA.blue }}
        />
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* Completed check */}
        {isCompleted && (
          <div className="absolute top-4 right-4">
            <CheckCircle2 className="w-5 h-5" style={{ color: BDA.blue }} />
          </div>
        )}

        {/* Section badge + Module number */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={style.badge}
          >
            {sectionLabel}
          </span>
          <span className="text-xs font-medium" style={{ color: '#94a3b8' }}>
            Module {module.order_index}
          </span>
          {isInProgress && !isCompleted && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: BDA.blueMid, color: BDA.blue }}
            >
              <PlayCircle className="h-3 w-3" />
              In Progress
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="font-bold mb-2 text-sm leading-snug line-clamp-2"
          style={{ color: BDA.navyDark }}
          dir={showArabicName ? 'rtl' : 'ltr'}
        >
          {cleanName}
        </h3>

        {/* Description */}
        {module.description && !showArabicName && (
          <p className="text-xs mb-3 line-clamp-2 leading-relaxed flex-1" style={{ color: '#64748b' }}>
            {module.description}
          </p>
        )}
        {module.description_ar && showArabicName && (
          <p className="text-xs mb-3 line-clamp-2 leading-relaxed flex-1" style={{ color: '#64748b' }} dir="rtl">
            {module.description_ar}
          </p>
        )}

        {/* Progress bar */}
        {progressPct > 0 && (
          <div className="mb-3">
            <div className="w-full rounded-full h-1.5" style={{ background: BDA.blueMid }}>
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: BDA.blue,
                }}
              />
            </div>
            <p className="text-xs mt-1 font-medium" style={{ color: BDA.blue }}>{progressPct}% complete</p>
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between mt-auto pt-3 border-t"
          style={{ borderColor: '#f1f5f9' }}
        >
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94a3b8' }}>
            <Clock className="w-3.5 h-3.5" />
            <span>{estimatedHours}h</span>
          </div>
          <div
            className="flex items-center gap-1 text-xs font-semibold transition-colors group-hover:opacity-80"
            style={{ color: BDA.blue }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Open</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
