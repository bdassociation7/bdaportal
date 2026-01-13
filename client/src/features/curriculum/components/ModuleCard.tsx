import { Lock, CheckCircle, Clock, Award } from 'lucide-react';
import type { CurriculumModuleWithStatus } from '@/entities/curriculum';

interface ModuleCardProps {
  module: CurriculumModuleWithStatus;
  onClick: () => void;
  /** Show Arabic name instead of English */
  showArabicName?: boolean;
}

/**
 * Module Card Component
 * Displays module with status (locked, in progress, completed)
 */
export function ModuleCard({ module, onClick, showArabicName = false }: ModuleCardProps) {
  const progress = module.user_progress;
  const isLocked = !module.is_unlocked;
  const isCompleted = progress?.status === 'completed';
  const isInProgress = progress?.status === 'in_progress' || progress?.status === 'quiz_pending';

  // UI Labels - Always in English (only content/module names are in Arabic)
  const labels = {
    locked: 'Locked',
    completed: 'Completed',
    inProgress: 'In Progress',
    notStarted: 'Not Started',
    module: 'Module',
    progress: 'Progress',
    quizScore: 'Quiz Score',
    completePrevious: 'Complete previous modules to unlock',
  };

  // Status styling
  const getStatusStyles = () => {
    if (isLocked) {
      return {
        container: 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60',
        badge: 'bg-gray-200 text-gray-600',
        icon: Lock,
        iconColor: 'text-gray-400',
        statusText: labels.locked,
      };
    }

    if (isCompleted) {
      return {
        container:
          'bg-white border-green-200 hover:border-green-300 hover:shadow-md cursor-pointer',
        badge: 'bg-green-100 text-green-700',
        icon: CheckCircle,
        iconColor: 'text-green-600',
        statusText: labels.completed,
      };
    }

    if (isInProgress) {
      return {
        container:
          'bg-white border-blue-200 hover:border-blue-300 hover:shadow-md cursor-pointer',
        badge: 'bg-blue-100 text-blue-700',
        icon: Clock,
        iconColor: 'text-blue-600',
        statusText: labels.inProgress,
      };
    }

    return {
      container:
        'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md cursor-pointer',
      badge: 'bg-gray-100 text-gray-700',
      icon: Award,
      iconColor: 'text-gray-400',
      statusText: labels.notStarted,
    };
  };

  const styles = getStatusStyles();
  const StatusIcon = styles.icon;

  const handleClick = () => {
    if (!isLocked) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`${styles.container} border rounded-lg p-5 transition-all duration-200`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isLocked ? 'bg-gray-200' : 'bg-blue-50'
          }`}
        >
          <StatusIcon className={`w-5 h-5 ${styles.iconColor}`} />
        </div>

        <span
          className={`${styles.badge} text-xs font-medium px-2 py-1 rounded-full`}
        >
          {labels.module} {module.order_index}
        </span>
      </div>

      {/* Title - prefer Arabic name when showArabicName is true, or use whichever is available */}
      <h3
        className={`font-semibold mb-2 line-clamp-2 ${
          isLocked ? 'text-gray-500' : 'text-gray-900'
        }`}
        dir={showArabicName || (module.competency_name_ar && !module.competency_name) ? 'rtl' : 'ltr'}
      >
        {showArabicName
          ? (module.competency_name_ar || module.competency_name || 'وحدة بدون عنوان')
          : (module.competency_name || module.competency_name_ar || 'Untitled Module')}
      </h3>

      {/* Description */}
      {module.description && (
        <p
          className={`text-sm mb-3 line-clamp-2 ${
            isLocked ? 'text-gray-400' : 'text-gray-600'
          }`}
        >
          {module.description}
        </p>
      )}

      {/* Progress Bar (if in progress) */}
      {!isLocked && progress && progress.progress_percentage > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>{labels.progress}</span>
            <span>{progress.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isCompleted ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress.progress_percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <span
          className={`font-medium ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}
        >
          {styles.statusText}
        </span>

        {!isLocked && (
          <span className="text-gray-500">
            {Math.ceil((module.estimated_minutes || 120) / 60)}h
          </span>
        )}
      </div>

      {/* Quiz Score (if completed) */}
      {isCompleted && progress?.best_quiz_score && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{labels.quizScore}</span>
            <span className="font-semibold text-green-600">
              {progress.best_quiz_score}%
            </span>
          </div>
        </div>
      )}

      {/* Locked Message */}
      {isLocked && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <p className="text-xs text-gray-500">
            {labels.completePrevious}
          </p>
        </div>
      )}
    </div>
  );
}
