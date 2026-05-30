import { CheckCircle2, Clock, BookOpen, ChevronRight, PlayCircle } from 'lucide-react';
import type { CurriculumModuleWithStatus } from '@/entities/curriculum';

// BDA Brand Colors
const BDA = {
  navy: '#1C4A8B',
  navyDark: '#0d1f4e',
  blue: '#0f91e0',
  bluePale: '#f0f6ff',
  blueMid: '#e8f0fb',
  border: '#d0e4f7',
};

interface ModuleCardProps {
  module: CurriculumModuleWithStatus;
  onClick: () => void;
  showArabicName?: boolean;
}

// Section-type styles using BDA palette
const SECTION_STYLES: Record<string, { badge: React.CSSProperties; accent: string }> = {
  intro:           { badge: { background: '#ede9fe', color: '#6d28d9' }, accent: '#7c3aed' },
  behavioral:      { badge: { background: BDA.blueMid, color: BDA.navy }, accent: BDA.navy },
  knowledge_based: { badge: { background: '#e0f2fe', color: '#0369a1' }, accent: BDA.blue },
  outro:           { badge: { background: '#fef3c7', color: '#92400e' }, accent: '#d97706' },
};

const SECTION_LABELS: Record<string, string> = {
  intro: 'Introduction',
  behavioral: 'Behavioural',
  knowledge_based: 'Knowledge',
  outro: 'Wrap-Up',
};

/**
 * BDA-branded Module Card — SHRM-style
 * All modules unlocked, self-paced with Mark as Complete.
 */
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

  // Strip "Module N: " prefix if accidentally stored
  const cleanName = moduleName.replace(/^Module\s+\d+:\s*/i, '');

  const estimatedHours = Math.ceil((module.estimated_minutes || 60) / 60);

  const cardBorder = isCompleted
    ? '1px solid #bbf7d0'
    : isInProgress
    ? `1px solid ${BDA.border}`
    : '1px solid #e2e8f0';

  const cardBg = isCompleted
    ? '#f0fdf4'
    : '#ffffff';

  return (
    <div
      onClick={onClick}
      className="group relative rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
      style={{
        border: cardBorder,
        background: cardBg,
        boxShadow: '0 1px 3px rgba(28,74,139,0.06)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* Completed check */}
      {isCompleted && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="w-5 h-5" style={{ color: '#16a34a' }} />
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
        <span className="text-xs text-gray-400 font-medium">
          Module {module.order_index}
        </span>
        {isInProgress && !isCompleted && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: BDA.bluePale, color: BDA.blue }}
          >
            <PlayCircle className="h-3 w-3" />
            In Progress
          </span>
        )}
      </div>

      {/* Title */}
      <h3
        className="font-bold mb-2 text-sm leading-snug line-clamp-2 transition-colors"
        style={{ color: BDA.navyDark, fontFamily: "'Inter', sans-serif" }}
        dir={showArabicName ? 'rtl' : 'ltr'}
      >
        {cleanName}
      </h3>

      {/* Description */}
      {module.description && !showArabicName && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">
          {module.description}
        </p>
      )}
      {module.description_ar && showArabicName && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed" dir="rtl">
          {module.description_ar}
        </p>
      )}

      {/* Progress bar */}
      {progressPct > 0 && (
        <div className="mb-3">
          <div className="w-full rounded-full h-1.5" style={{ background: '#e2e8f0' }}>
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: isCompleted ? '#22c55e' : BDA.navy,
              }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: BDA.navy }}>{progressPct}% complete</p>
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between mt-auto pt-2 border-t"
        style={{ borderColor: '#f1f5f9' }}
      >
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{estimatedHours}h</span>
        </div>
        <div
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: BDA.navy }}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Open</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}
