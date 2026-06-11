/**
 * ExamGoalWidget
 * Goal-Oriented UI widget shown at the top of LearningSystemDashboard.
 * Features:
 *  - Shows active BDA exam windows for the user's certification type
 *  - Lets user pick a target window
 *  - Calculates days remaining + study pace required
 *  - Shows "on track" / "behind schedule" indicator
 *  - If user has no voucher → shows a CTA to buy one
 * Language: English only.
 */
import { useState } from 'react';
import {
  Calendar,
  Target,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  ShoppingCart,
  Loader2,
  X,
} from 'lucide-react';
import {
  useExamWindows,
  useLearningGoal,
  useUpsertLearningGoal,
  useHasVoucher,
  type ExamWindow,
} from '../hooks/useLearningGoals';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExamGoalWidgetProps {
  certType: string;           // 'CP' | 'SCP'
  totalModules: number;       // total curriculum modules
  completedModules: number;   // modules the user has completed
  accessExpiresAt?: string | null; // user's learning system access expiry date
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function weeksUntil(dateStr: string): number {
  return Math.max(1, Math.ceil(daysUntil(dateStr) / 7));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExamGoalWidget({ certType, totalModules, completedModules, accessExpiresAt }: ExamGoalWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedWindowKey, setSelectedWindowKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: allWindows, isLoading: windowsLoading } = useExamWindows(certType);

  // Filter windows to only show those within the user's access period
  // If accessExpiresAt is set, only show windows that start before the access expiry
  const windows = accessExpiresAt
    ? (allWindows ?? []).filter((w) => {
        const windowStart = new Date(w.start_date);
        const accessExpiry = new Date(accessExpiresAt);
        return windowStart <= accessExpiry;
      })
    : (allWindows ?? []);
  const { data: goal, isLoading: goalLoading } = useLearningGoal(certType);
  const { data: hasVoucher, isLoading: voucherLoading } = useHasVoucher(certType);
  const upsertGoal = useUpsertLearningGoal();

  const isLoading = windowsLoading || goalLoading || voucherLoading;

  // Determine current active window (from saved goal or local selection)
  // We use window.id as the key (matches certification_exam_windows.id)
  const activeWindowKey = selectedWindowKey ?? goal?.target_exam_window_id ?? null;
  const activeWindow: ExamWindow | undefined = windows?.find(
    (w) => w.id === activeWindowKey
  );

  // ── Pace calculation ──
  const remainingModules = Math.max(0, totalModules - completedModules);
  const weeksLeft = activeWindow ? weeksUntil(activeWindow.end_date) : null;
  const modulesPerWeek =
    weeksLeft && weeksLeft > 0 ? (remainingModules / weeksLeft).toFixed(1) : null;
  const daysLeft = activeWindow ? daysUntil(activeWindow.end_date) : null;

  // "On track" = user has completed at least the expected proportion of modules
  const expectedProgress =
    weeksLeft && activeWindow
      ? 1 -
        weeksLeft /
          Math.max(1, Math.ceil(daysUntil(activeWindow.start_date) / 7) + weeksLeft)
      : null;
  const actualProgress = totalModules > 0 ? completedModules / totalModules : 0;
  const isOnTrack = expectedProgress !== null ? actualProgress >= expectedProgress - 0.05 : null;

  // ── Save handler ──
  const handleSave = async () => {
    if (!selectedWindowKey) return;
    const win = windows?.find((w) => w.id === selectedWindowKey);
    if (!win) return;
    setIsSaving(true);
    try {
      await upsertGoal.mutateAsync({
        certification_type: certType,
        target_exam_window_id: selectedWindowKey,
        target_exam_date: win.end_date,
        study_hours_per_week: goal?.study_hours_per_week ?? 5,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-5 flex items-center gap-3 animate-pulse">
        <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
        <div className="h-4 bg-gray-200 rounded w-48" />
      </div>
    );
  }

  // ── No windows available ──
  if (!windows || windows.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* ── Header row (always visible) ── */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">
              {activeWindow
                ? `Target Exam: ${activeWindow.name}`
                : 'Set Your Target Exam Window'}
            </p>
            {activeWindow && daysLeft !== null && (
              <p className="text-xs text-gray-500">
                {daysLeft > 0 ? `${daysLeft} days remaining` : 'Window has passed'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* On-track badge */}
          {isOnTrack !== null && activeWindow && (
            <span
              className={`hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                isOnTrack
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              {isOnTrack ? (
                <>
                  <CheckCircle className="w-3 h-3" /> On Track
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" /> Behind Schedule
                </>
              )}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div className="border-t px-5 py-5 space-y-5">
          {/* Voucher CTA */}
          {!hasVoucher && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <ShoppingCart className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  No active exam voucher found
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  To sit the {certType} exam, you'll need a valid exam voucher. We recommend
                  reviewing your performance analysis first, then practicing with sample questions
                  before purchasing your voucher.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <a
                    href="/mock-exams"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 underline hover:text-amber-900"
                  >
                    Practice Exams
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-amber-400 text-xs">|</span>
                  <a
                    href="https://bda-global.org/en/store/certifications/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 underline hover:text-amber-900"
                  >
                    Buy Exam Voucher
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {hasVoucher && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              You have a valid {certType} exam voucher. You're ready to book!
            </div>
          )}

          {/* Exam Window Picker */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Select Your Target Exam Window
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {windows.map((win) => {
                const isPast = daysUntil(win.end_date) < 0;
                const isSelected = win.id === (selectedWindowKey ?? goal?.target_exam_window_id);
                return (
                  <button
                    key={win.id}
                    disabled={isPast}
                    onClick={() => setSelectedWindowKey(win.id)}
                    className={`text-left px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                      isPast
                        ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium">{win.name}</span>
                    </div>
                    {!isPast && (
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        {daysUntil(win.start_date) > 0
                          ? `Opens in ${daysUntil(win.start_date)} days`
                          : `Closes in ${daysUntil(win.end_date)} days`}
                      </p>
                    )}
                    {isPast && (
                      <p className="text-xs text-gray-400 mt-1 ml-6">Window closed</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pace Calculator */}
          {activeWindow && modulesPerWeek && daysLeft && daysLeft > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Your Study Pace
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-bold text-blue-600">{daysLeft}</p>
                  <p className="text-xs text-gray-500">Days Left</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-blue-600">{remainingModules}</p>
                  <p className="text-xs text-gray-500">Modules Left</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-blue-600">{modulesPerWeek}</p>
                  <p className="text-xs text-gray-500">Modules/Week Needed</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>
                    {completedModules}/{totalModules} modules completed
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (completedModules / Math.max(1, totalModules)) * 100)}%`,
                      backgroundColor: isOnTrack ? '#16a34a' : '#f97316',
                    }}
                  />
                </div>
              </div>

              {/* On-track message */}
              <div
                className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                  isOnTrack
                    ? 'bg-green-50 text-green-700'
                    : 'bg-orange-50 text-orange-700'
                }`}
              >
                {isOnTrack ? (
                  <>
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    You're on track! Keep up the great work.
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    You're a bit behind. Try to complete {modulesPerWeek} modules per week to stay
                    on track.
                  </>
                )}
              </div>
            </div>
          )}

          {/* Save button */}
          {selectedWindowKey && selectedWindowKey !== goal?.target_exam_window_id && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                {isSaving ? 'Saving…' : 'Save Target Window'}
              </button>
              <button
                onClick={() => setSelectedWindowKey(null)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          )}

          {saved && (
            <p className="text-sm text-green-600 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" />
              Target window saved successfully!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
